/**
 * @fileoverview AWS Lambda error types and helpers.
 *
 * Defines `LambdaError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.Lambda.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS Lambda service-related issues. */
export class LambdaError extends AwsError {
  /**
   * Creates an instance of LambdaError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "LambdaError";
  }

  /**
   * Create a LambdaError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A LambdaError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): LambdaError {
    return fromAwsError(
      LambdaError,
      err,
      { code: AwsErrorCodes.Lambda.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Function/alias/version not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Throttled (TooManyRequests).
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Access denied by IAM/KMS policies.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Timeout while invoking/processing.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Validation error from Lambda API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Lambda service unavailable.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Internal error returned by Lambda.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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
