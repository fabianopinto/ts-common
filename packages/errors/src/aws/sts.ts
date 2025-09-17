/**
 * AWS STS error types and helpers.
 *
 * Defines `StsError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.STS.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS STS service-related issues. */
export class StsError extends AwsError {
  /**
   * Creates an instance of StsError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "StsError";
  }

  /**
   * Create an StsError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns An StsError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): StsError {
    return fromAwsError(
      StsError,
      err,
      { code: AwsErrorCodes.STS.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Authentication failure (ExpiredToken/InvalidClientTokenId/etc.).
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static authentication(
    message = "STS authentication failed",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      StsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.STS.AUTHENTICATION_ERROR,
        status: options.status ?? 401,
      },
      options,
    );
  }

  /**
   * Access denied.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static accessDenied(message = "STS access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.STS.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * General throttling on STS operations.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(message = "STS throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.STS.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Validation error in STS API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static validation(message = "STS validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.STS.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Timeout while calling STS.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static timeout(message = "STS request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.STS.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Internal error in STS service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static internal(message = "STS internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.STS.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
