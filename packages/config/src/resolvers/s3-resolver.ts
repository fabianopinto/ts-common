/**
 * @fileoverview AWS S3 object resolver.
 *
 * Resolves `s3://` references to object content as UTF-8 text. Manages AWS SDK
 * client lifecycle and handles both browser and Node.js runtime environments
 * with proper stream handling.
 */

import { ConfigurationError } from "@t68/errors";
import type { Logger } from "@t68/logger";
import { RetryUtils } from "@t68/utils";

import type { ConfigResolver } from "./base.js";

/**
 * Options for S3 object resolution.
 */
export interface S3ResolverOptions extends Record<string, unknown> {
  /** Return object metadata instead of content. Default: `false` */
  metadata?: boolean;
  /** Specific metadata fields to retrieve when `metadata=true` */
  metadataFields?: string[];
  /** Response content type override */
  responseContentType?: string;
  /** Custom S3 client configuration */
  clientConfig?: Record<string, unknown>;
}

/**
 * AWS S3 object resolver.
 *
 * Handles `s3://` references by fetching object content from AWS S3.
 * Automatically handles different response body types across runtime
 * environments and converts content to UTF-8 text.
 *
 * @example
 * ```typescript
 * // Get object content (default)
 * const content = await resolver.resolve("s3://my-bucket/config.json", {}, logger);
 *
 * // Get object metadata
 * const metadata = await resolver.resolve("s3://my-bucket/config.json", {
 *   metadata: true
 * }, logger);
 *
 * // Get specific metadata fields
 * const size = await resolver.resolve("s3://my-bucket/config.json", {
 *   metadata: true,
 *   metadataFields: ['ContentLength', 'LastModified']
 * }, logger);
 * ```
 */
export class S3Resolver implements ConfigResolver<S3ResolverOptions> {
  public readonly protocol = "s3";
  public readonly defaultOptions: S3ResolverOptions = {};

  // Batch capabilities - S3 doesn't currently support batch operations
  public readonly supportsBatch = false;

  private s3Client: InstanceType<typeof import("@aws-sdk/client-s3").S3Client> | null = null;
  private GetObjectCommand: typeof import("@aws-sdk/client-s3").GetObjectCommand | null = null;

  /**
   * Initialize the S3 client and import required AWS SDK components.
   *
   * Dynamically imports the AWS SDK for S3 and creates a client instance.
   * This lazy loading approach reduces bundle size when S3 resolution is not used.
   *
   * @param logger - Logger instance for diagnostics
   * @throws `ConfigurationError` When AWS SDK import or client creation fails
   */
  public async initialize(logger: Logger): Promise<void> {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      this.s3Client = new S3Client({});
      this.GetObjectCommand = GetObjectCommand;
      logger.debug("S3 resolver initialized");
    } catch (error) {
      logger.error({ error }, "Failed to initialize S3 resolver");
      throw new ConfigurationError("Failed to initialize S3 resolver", {
        code: "CONFIG_S3_INIT_ERROR",
        cause: error as Error,
        isOperational: false,
      });
    }
  }

  /**
   * Validate S3 object reference format.
   *
   * Accepts bucket names and object keys following AWS S3 naming conventions.
   * Bucket names must be valid DNS names (3-63 characters, lowercase, no consecutive dots),
   * and object keys can contain most characters including forward slashes for hierarchical organization.
   *
   * @param reference - Reference string to validate (e.g., `"s3://my-bucket/path/to/file.json"`)
   * @returns `true` if the reference is a valid S3 object reference
   */
  public validateReference(reference: string): boolean {
    const match = reference.match(/^s3:\/\/([a-z0-9.-]+)\/(.+)$/);
    if (!match) return false;

    const [, bucket, key] = match;
    if (!bucket || !key) return false;
    // Basic bucket name validation (simplified AWS S3 rules)
    const validBucket = /^[a-z0-9.-]{3,63}$/.test(bucket) && !bucket.includes("..");
    const validKey = key.length > 0 && key.length <= 1024;

    return validBucket && validKey;
  }

  /**
   * Resolve an S3 object reference to its content or metadata.
   *
   * @param reference - S3 object reference (e.g., `"s3://bucket/key"`)
   * @param options - Resolution options including metadata flags
   * @param logger - Logger instance for diagnostics
   * @returns The object content as UTF-8 string or metadata as JSON string
   * @throws `ConfigurationError` When the object is not found or operation fails
   */
  public async resolve(
    reference: string,
    options: S3ResolverOptions,
    logger: Logger,
  ): Promise<string> {
    if (!this.s3Client || !this.GetObjectCommand) {
      throw new ConfigurationError("S3 resolver not initialized", {
        code: "CONFIG_S3_NOT_INITIALIZED",
        isOperational: false,
      });
    }

    // Parse S3 reference into bucket and key components
    const match = reference.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new ConfigurationError(`Invalid S3 reference format: ${reference}`, {
        code: "CONFIG_S3_INVALID_REFERENCE",
        context: { reference },
        isOperational: false,
      });
    }

    const [, bucket, key] = match as [string, string, string];
    const effectiveOptions = { ...this.defaultOptions, ...options };

    try {
      if (logger.isLevelEnabled("debug")) {
        logger.debug(
          { reference, bucket, key, metadata: effectiveOptions.metadata },
          "Resolving S3 object",
        );
      }

      // Handle metadata-only requests
      if (effectiveOptions.metadata) {
        return await this.resolveMetadata(bucket, key, effectiveOptions, logger);
      }

      const response = await RetryUtils.retryAsync(
        () =>
          this.s3Client!.send(
            new this.GetObjectCommand!({
              Bucket: bucket,
              Key: key,
              ResponseContentType: effectiveOptions.responseContentType,
            }),
          ),
        {
          retries: 3,
          delayMs: 200,
          backoff: "exponential-jitter",
          maxDelayMs: 5000,
        },
      );

      const body = response.Body;
      if (!body) {
        throw new ConfigurationError(`Empty response body for S3 object: ${reference}`, {
          code: "CONFIG_S3_EMPTY_BODY",
          context: { reference, bucket, key },
          isOperational: false,
        });
      }

      // Handle different response body types across runtime environments
      let content: string;
      if (
        typeof (body as { transformToString?: (enc?: string) => Promise<string> })
          .transformToString === "function"
      ) {
        // Browser/modern runtime with `transformToString` method
        content = await (
          body as { transformToString: (enc?: string) => Promise<string> }
        ).transformToString("utf-8");
      } else {
        // Node.js stream fallback
        const chunks: Buffer[] = [];
        const stream = body as NodeJS.ReadableStream;

        await new Promise<void>((resolve, reject) => {
          stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on("end", () => resolve());
          stream.on("error", reject);
        });

        content = Buffer.concat(chunks).toString("utf-8");
      }

      if (logger.isLevelEnabled("debug")) {
        logger.debug(
          { reference, bucket, key, contentLength: content.length },
          "S3 object resolved",
        );
      }

      return content;
    } catch (error) {
      logger.error({ error, reference, bucket, key }, "Failed to resolve S3 object");
      throw error instanceof ConfigurationError
        ? error
        : new ConfigurationError("Failed to resolve S3 object", {
            code: "CONFIG_S3_RESOLUTION_ERROR",
            cause: error as Error,
            context: { reference, bucket, key },
            isOperational: true,
          });
    }
  }

  /**
   * Resolve S3 object metadata instead of content.
   *
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @param options - Resolution options with metadata configuration
   * @param logger - Logger instance for diagnostics
   * @returns JSON string containing requested metadata fields
   * @throws `ConfigurationError` When metadata retrieval fails
   */
  private async resolveMetadata(
    bucket: string,
    key: string,
    options: S3ResolverOptions,
    logger: Logger,
  ): Promise<string> {
    try {
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");

      const response = await RetryUtils.retryAsync(
        () =>
          this.s3Client!.send(
            new HeadObjectCommand({
              Bucket: bucket,
              Key: key,
            }),
          ),
        {
          retries: 3,
          delayMs: 200,
          backoff: "exponential-jitter",
          maxDelayMs: 5000,
        },
      );

      // Extract metadata based on options
      let metadata: Record<string, unknown>;

      if (options.metadataFields && options.metadataFields.length > 0) {
        // Return only requested fields
        metadata = {};
        for (const field of options.metadataFields) {
          if (field in response) {
            metadata[field] = (response as unknown as Record<string, unknown>)[field];
          }
        }
      } else {
        // Return all available metadata fields
        metadata = {
          ContentLength: response.ContentLength,
          ContentType: response.ContentType,
          ETag: response.ETag,
          LastModified: response.LastModified?.toISOString(),
          Metadata: response.Metadata,
          StorageClass: response.StorageClass,
          VersionId: response.VersionId,
        };
      }

      if (logger.isLevelEnabled("debug")) {
        logger.debug(
          { bucket, key, metadataKeys: Object.keys(metadata) },
          "S3 object metadata resolved",
        );
      }

      return JSON.stringify(metadata);
    } catch (error) {
      logger.error({ error, bucket, key }, "Failed to resolve S3 object metadata");
      throw new ConfigurationError("Failed to resolve S3 object metadata", {
        code: "CONFIG_S3_METADATA_ERROR",
        cause: error as Error,
        context: { bucket, key },
        isOperational: true,
      });
    }
  }

  /**
   * Clean up the S3 client resources.
   *
   * Destroys the AWS SDK S3 client and resets internal state.
   * Should be called when the resolver is no longer needed to free resources.
   */
  public cleanup(): void {
    if (this.s3Client) {
      this.s3Client.destroy();
      this.s3Client = null;
      this.GetObjectCommand = null;
    }
  }
}
