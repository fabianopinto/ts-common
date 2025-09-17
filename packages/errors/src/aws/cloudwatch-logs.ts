/**
 * @fileoverview AWS CloudWatch Logs error types and helpers.
 *
 * Defines `CloudWatchLogsError`, a service-specific error class with
 * factory-backed helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.CloudWatchLogs.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS CloudWatch Logs service-related issues. */
export class CloudWatchLogsError extends AwsError {
  /**
   * Creates an instance of CloudWatchLogsError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "CloudWatchLogsError";
  }

  /** Log group not found. */
  public static logGroupNotFound(message = "Log group not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      CloudWatchLogsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchLogs.LOG_GROUP_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /** Log stream not found. */
  public static logStreamNotFound(message = "Log stream not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      CloudWatchLogsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchLogs.LOG_STREAM_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /** Throttled CloudWatch Logs operation. */
  public static throttling(message = "CloudWatch Logs throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      CloudWatchLogsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchLogs.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /** Access denied by IAM policies. */
  public static accessDenied(
    message = "CloudWatch Logs access denied",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchLogsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchLogs.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /** Validation errors in CloudWatch Logs API. */
  public static validation(
    message = "CloudWatch Logs validation error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchLogsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchLogs.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /** CloudWatch Logs service unavailable. */
  public static serviceUnavailable(
    message = "CloudWatch Logs service unavailable",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchLogsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE,
        status: options.status ?? 503,
      },
      options,
    );
  }
}
