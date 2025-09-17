/**
 * @fileoverview AWS SQS error types and helpers.
 *
 * Defines `SqsError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.SQS.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for Amazon SQS service-related issues. */
export class SqsError extends AwsError {
  /**
   * Creates an instance of SqsError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SqsError";
  }

  /** Queue not found. */
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

  /** Message too large. */
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

  /** Throttling. */
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

  /** Access denied by IAM/KMS policies. */
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

  /** Validation error from SQS API. */
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

  /** Timeout while calling SQS. */
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

  /** Internal error in SQS service. */
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
