/**
 * @fileoverview AWS Secrets Manager error types and helpers.
 *
 * This module defines `SecretsManagerError`, a service-specific error class with
 * factory-backed static helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.SecretsManager.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS Secrets Manager service-related issues. */
export class SecretsManagerError extends AwsError {
  /**
   * Creates an instance of SecretsManagerError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SecretsManagerError";
  }

  /**
   * Create a SecretsManagerError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A SecretsManagerError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): SecretsManagerError {
    return fromAwsError(
      SecretsManagerError,
      err,
      { code: AwsErrorCodes.SecretsManager.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Secret was not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Decryption failure for secret value.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Throttled Secrets Manager operation.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Access denied by IAM/KMS policies.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Validation error in Secrets Manager API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Internal error in Secrets Manager service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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
