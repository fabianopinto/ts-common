/**
 * AWS CloudWatch Metrics error types and helpers.
 *
 * Defines `CloudWatchMetricsError`, a service-specific error class with
 * factory-backed helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.CloudWatchMetrics.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS CloudWatch Metrics (GetMetricData/PutMetricData) issues. */
export class CloudWatchMetricsError extends AwsError {
  /**
   * Creates an instance of CloudWatchMetricsError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "CloudWatchMetricsError";
  }

  /**
   * Create a CloudWatchMetricsError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A CloudWatchMetricsError instance
   */
  public static from(
    err: unknown,
    message?: string,
    context?: ErrorContext,
  ): CloudWatchMetricsError {
    return fromAwsError(
      CloudWatchMetricsError,
      err,
      { code: AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Throttled CloudWatch Metrics operation.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(
    message = "CloudWatch Metrics throttling",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchMetricsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchMetrics.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Metric data/query limit exceeded.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static limitExceeded(
    message = "CloudWatch Metrics limit exceeded",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchMetricsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchMetrics.LIMIT_EXCEEDED,
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
    message = "CloudWatch Metrics access denied",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchMetricsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchMetrics.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Validation errors in CloudWatch Metrics API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static validation(
    message = "CloudWatch Metrics validation error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchMetricsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchMetrics.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Internal error in CloudWatch Metrics service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static internal(
    message = "CloudWatch Metrics internal error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      CloudWatchMetricsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
