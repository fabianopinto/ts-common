/**
 * @fileoverview External reference resolvers for configuration values.
 *
 * Supports AWS Systems Manager Parameter Store (ssm://) and S3 objects (s3://),
 * with retry/backoff via `RetryUtils` and structured logging via `@t68/logger`.
 */

import { ConfigurationError } from "@t68/errors";
import { type Logger, logger as defaultLogger } from "@t68/logger";
import { RetryUtils } from "@t68/utils";

/**
 * Resolve an AWS SSM parameter value.
 *
 * Uses AWS SDK v3 and relies on default AWS credential/region providers available
 * in the process environment. The parameter is fetched with optional decryption.
 *
 * @param {string} ssmPath - Parameter reference in the form `ssm://<parameterName>`
 * @param {Logger} logger - Optional logger instance for diagnostics
 * @param {Object} [opts] - Resolution options
 * @param {boolean} [opts.withDecryption] - Whether to enable decryption of the parameter value (default: true)
 * @returns {Promise<string>} The string parameter value
 * @throws {ConfigurationError} When the parameter is not found or has no string value
 *
 * @example
 * const value = await resolveSSM("ssm://my-parameter");
 * const value = await resolveSSM(
 *   "ssm://my-parameter",
 *   logger.child({ label: "my-resolver" }),
 *   { withDecryption: false },
 * );
 */
export async function resolveSSM(
  ssmPath: string,
  logger: Logger = defaultLogger,
  opts?: { withDecryption?: boolean },
): Promise<string> {
  // ssmPath expected format: ssm://<parameterName>
  const name = ssmPath.replace(/^ssm:\/\//, "");
  try {
    const { SSMClient, GetParameterCommand } = await import("@aws-sdk/client-ssm");
    const client = new SSMClient({});
    if (logger.isLevelEnabled("debug")) {
      logger.debug({ ssmPath, name }, "Resolving SSM parameter");
    }
    const res = await RetryUtils.retryAsync(
      () =>
        client.send(
          new GetParameterCommand({
            Name: name,
            WithDecryption: opts?.withDecryption ?? true,
          }),
        ),
      { retries: 3, delayMs: 200, backoff: "exponential-jitter", maxDelayMs: 5000 },
    );
    const value = res.Parameter?.Value;
    if (typeof value !== "string") {
      throw new ConfigurationError(`Parameter '${name}' not found or has no string value`, {
        code: "CONFIG_SSM_PARAMETER_NOT_FOUND_OR_NO_STRING_VALUE",
        context: { ssmPath, name },
        isOperational: false,
      });
    }
    if (logger.isLevelEnabled("debug")) {
      logger.debug({ ssmPath, name }, "Resolved SSM parameter");
    }
    return value;
  } catch (error) {
    logger.error({ error, ssmPath }, "Failed to resolve SSM parameter");
    throw error;
  }
}

/**
 * Resolve an S3 object body as UTF-8 text.
 *
 * Uses AWS SDK v3 and the default credentials/region provider chain.
 * Automatically handles both `transformToString` and Node stream bodies.
 *
 * @param {string} s3Path - Object reference in the form `s3://<bucket>/<key>`
 * @param {Logger} [logger] - Optional logger instance for diagnostics
 * @returns {Promise<string>} Object body as a UTF-8 string
 * @throws {ConfigurationError} When the S3 path is invalid or the body is empty
 *
 * @example
 * const text = await resolveS3("s3://my-bucket/config.json");
 */
export async function resolveS3(s3Path: string, logger: Logger = defaultLogger): Promise<string> {
  // s3Path expected format: s3://<bucket>/<key>
  const bucket = s3Path.replace(/^s3:\/\//, "").split("/")[0];
  const key = s3Path
    .replace(/^s3:\/\//, "")
    .split("/")
    .slice(1)
    .join("/");
  if (!bucket || !key) {
    throw new ConfigurationError(`Invalid S3 path: ${s3Path}`);
  }
  try {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({});
    if (logger.isLevelEnabled("debug")) {
      logger.debug({ s3Path, bucket, key }, "Resolving S3 object");
    }
    const res = await RetryUtils.retryAsync(
      () => client.send(new GetObjectCommand({ Bucket: bucket, Key: key })),
      { retries: 3, delayMs: 200, backoff: "exponential-jitter", maxDelayMs: 5000 },
    );
    const body = res.Body as
      | undefined
      | {
          transformToString?: (encoding?: string) => Promise<string>;
        }
      | NodeJS.ReadableStream;
    if (!body) throw new ConfigurationError(`Empty body for s3://${bucket}/${key}`);
    // Body can be a stream or Uint8Array depending on runtime
    if (
      typeof (body as { transformToString?: (enc?: string) => Promise<string> })
        .transformToString === "function"
    ) {
      return await (
        body as { transformToString: (enc?: string) => Promise<string> }
      ).transformToString("utf-8");
    }
    // Node stream fallback
    const chunks: Buffer[] = [];
    const stream = body as NodeJS.ReadableStream;
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });
    const text = Buffer.concat(chunks).toString("utf-8");
    if (logger.isLevelEnabled("debug")) {
      logger.debug({ s3Path, bucket, key, length: text.length }, "Resolved S3 object");
    }
    return text;
  } catch (error) {
    logger.error({ error, s3Path }, "Failed to resolve S3 object");
    throw error;
  }
}

/**
 * Determine whether a value is an external reference (ssm:// or s3://).
 *
 * @param {unknown} value - Unknown value to test
 * @returns {value is string} True when the value is a string beginning with ssm:// or s3://
 */
export function isExternalRef(value: unknown): value is string {
  return typeof value === "string" && /^(ssm|s3):\/\//.test(value);
}
