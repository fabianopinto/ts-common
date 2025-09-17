/**
 * @fileoverview AWS SQS error types and helpers.
 *
 * Defines `SqsError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.SQS.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for Amazon SQS service-related issues. */
export class SqsError extends AwsError {
  /**
   * Creates an instance of SqsError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SqsError";
  }

  /**
   * Create an SqsError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns An SqsError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): SqsError {
    return fromAwsError(
      SqsError,
      err,
      { code: AwsErrorCodes.SQS.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Queue not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static queueNotFound(message = "SQS queue not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SqsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SQS.QUEUE_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Message too large.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static messageTooLarge(message = "SQS message too large", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SqsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SQS.MESSAGE_TOO_LARGE,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Throttling.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(message = "SQS throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SqsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SQS.THROTTLING,
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
  public static accessDenied(message = "SQS access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SqsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SQS.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Validation error from SQS API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static validation(message = "SQS validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SqsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SQS.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Timeout while calling SQS.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static timeout(message = "SQS request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SqsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SQS.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Internal error in SQS service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static internal(message = "SQS internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SqsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SQS.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
