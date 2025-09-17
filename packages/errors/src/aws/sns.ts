/**
 * @fileoverview AWS SNS error types and helpers.
 *
 * Defines `SnsError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.SNS.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for Amazon SNS service-related issues. */
export class SnsError extends AwsError {
  /**
   * Creates an instance of SnsError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SnsError";
  }

  /** Topic not found. */
  public static topicNotFound(message = "SNS topic not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SnsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SNS.TOPIC_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /** Throttling. */
  public static throttling(message = "SNS throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SnsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SNS.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /** Access denied by IAM/KMS policies. */
  public static accessDenied(message = "SNS access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SnsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SNS.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /** Validation error from SNS API. */
  public static validation(message = "SNS validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SnsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SNS.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /** Internal error in SNS service. */
  public static internal(message = "SNS internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SnsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SNS.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
