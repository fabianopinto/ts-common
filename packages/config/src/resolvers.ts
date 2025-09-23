/**
 * @fileoverview External reference resolvers for configuration values.
 *
 * Supports AWS Systems Manager Parameter Store (ssm://) and S3 objects (s3://),
 * with retry/backoff via `RetryUtils` and structured logging via `@fabianopinto/logger`.
 */

import { ConfigurationError } from "@fabianopinto/errors";
import { type Logger, logger as defaultLogger } from "@fabianopinto/logger";
import { RetryUtils } from "@fabianopinto/utils";

/**
 * Resolve an AWS SSM parameter value.
 *
 * Uses AWS SDK v3 and relies on default AWS credential/region providers available
 * in the process environment. The parameter is fetched with decryption enabled.
 *
 * @param ssmPath - Parameter reference in the form `ssm://<parameterName>`
 * @param logger - Optional logger instance for diagnostics
 * @returns The string parameter value
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
 *
 * @param s3Path - Object reference in the form `s3://<bucket>/<key>`
 * @param logger - Optional logger instance for diagnostics
 * @returns Object body as a UTF-8 string
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
    throw new Error(`Invalid S3 path: ${s3Path}`);
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
    if (!body) throw new Error(`Empty body for s3://${bucket}/${key}`);
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
 * @param value - Unknown value to test
 * @returns True when the value is a string beginning with ssm:// or s3://
 */
export function isExternalRef(value: unknown): value is string {
  return typeof value === "string" && /^(ssm|s3):\/\//.test(value);
}
