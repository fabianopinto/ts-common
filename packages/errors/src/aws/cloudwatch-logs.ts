/**
 * @fileoverview AWS CloudWatch Logs error types and helpers.
 *
 * Defines `CloudWatchLogsError`, a service-specific error class with
 * factory-backed helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.CloudWatchLogs.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS CloudWatch Logs service-related issues. */
export class CloudWatchLogsError extends AwsError {
  /**
   * Creates an instance of CloudWatchLogsError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "CloudWatchLogsError";
  }

  /**
   * Create a CloudWatchLogsError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A CloudWatchLogsError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): CloudWatchLogsError {
    return fromAwsError(
      CloudWatchLogsError,
      err,
      { code: AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE, status: 503 },
      message,
      context,
    );
  }

  /**
   * Log group not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Log stream not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Throttled CloudWatch Logs operation.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Access denied by IAM policies.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * Validation errors in CloudWatch Logs API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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

  /**
   * CloudWatch Logs service unavailable.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
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
