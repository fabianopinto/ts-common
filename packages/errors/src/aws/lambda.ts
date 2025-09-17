/**
 * @fileoverview AWS Lambda error types and helpers.
 *
 * Defines `LambdaError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.Lambda.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS Lambda service-related issues. */
export class LambdaError extends AwsError {
  /**
   * Creates an instance of LambdaError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "LambdaError";
  }

  /** Function/alias/version not found. */
  public static functionNotFound(
    message = "Lambda function not found",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      LambdaError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Lambda.FUNCTION_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /** Throttled (TooManyRequests). */
  public static throttling(message = "Lambda throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      LambdaError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Lambda.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /** Access denied by IAM/KMS policies. */
  public static accessDenied(message = "Lambda access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      LambdaError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Lambda.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /** Timeout while invoking/processing. */
  public static timeout(message = "Lambda request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      LambdaError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Lambda.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /** Validation error from Lambda API. */
  public static validation(message = "Lambda validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      LambdaError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Lambda.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /** Lambda service unavailable. */
  public static serviceUnavailable(
    message = "Lambda service unavailable",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      LambdaError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Lambda.SERVICE_UNAVAILABLE,
        status: options.status ?? 503,
      },
      options,
    );
  }

  /** Internal error returned by Lambda. */
  public static internal(message = "Lambda internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      LambdaError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Lambda.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
