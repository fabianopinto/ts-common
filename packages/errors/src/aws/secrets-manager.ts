/**
 * @fileoverview AWS Secrets Manager error types and helpers.
 *
 * This module defines `SecretsManagerError`, a service-specific error class with
 * factory-backed static helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.SecretsManager.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS Secrets Manager service-related issues. */
export class SecretsManagerError extends AwsError {
  /**
   * Creates an instance of SecretsManagerError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SecretsManagerError";
  }

  /** Secret was not found. */
  public static secretNotFound(message = "Secret not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SecretsManagerError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SecretsManager.SECRET_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /** Decryption failure for secret value. */
  public static decryptionFailure(
    message = "Secret decryption failure",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      SecretsManagerError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SecretsManager.DECRYPTION_FAILURE,
        status: options.status ?? 500,
      },
      options,
    );
  }

  /** Throttled Secrets Manager operation. */
  public static throttling(message = "Secrets Manager throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SecretsManagerError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SecretsManager.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /** Access denied by IAM/KMS policies. */
  public static accessDenied(
    message = "Secrets Manager access denied",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      SecretsManagerError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SecretsManager.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /** Validation error in Secrets Manager API. */
  public static validation(
    message = "Secrets Manager validation error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      SecretsManagerError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SecretsManager.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /** Internal error in Secrets Manager service. */
  public static internal(
    message = "Secrets Manager internal error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      SecretsManagerError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SecretsManager.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
