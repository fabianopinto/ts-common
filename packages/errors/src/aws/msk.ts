/**
 * @fileoverview AWS MSK (Managed Streaming for Apache Kafka) error types and helpers.
 *
 * Defines `MskError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.MSK.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/**
 * An error for Amazon MSK (Managed Streaming for Apache Kafka)
 * service-related issues.
 */
export class MskError extends AwsError {
  /**
   * Creates an instance of `MskError`.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "MskError";
  }

  /**
   * Create an `MskError` from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns An `MskError` instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): MskError {
    return fromAwsError(
      MskError,
      err,
      { code: AwsErrorCodes.MSK.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * MSK cluster not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `MskError` with cluster not found details
   */
  public static clusterNotFound(message = "MSK cluster not found", options: AppErrorOptions = {}) {
    // Using `CLUSTER_NOT_FOUND` from `AwsErrorCodes.MSK`
    return makeAwsServiceError(
      MskError,
      message,
      {
        code: options.code ?? AwsErrorCodes.MSK.CLUSTER_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Throttling on MSK operations.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `MskError` with throttling details
   */
  public static throttling(message = "MSK throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      MskError,
      message,
      {
        code: options.code ?? AwsErrorCodes.MSK.THROTTLING,
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
   * @returns An `MskError` with access denied details
   */
  public static accessDenied(message = "MSK access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      MskError,
      message,
      {
        code: options.code ?? AwsErrorCodes.MSK.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Validation error.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `MskError` with validation error details
   */
  public static validation(message = "MSK validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      MskError,
      message,
      {
        code: options.code ?? AwsErrorCodes.MSK.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Timeout while calling MSK.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `MskError` with timeout details
   */
  public static timeout(message = "MSK request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      MskError,
      message,
      {
        code: options.code ?? AwsErrorCodes.MSK.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Internal error in MSK service.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `MskError` with internal error details
   */
  public static internal(message = "MSK internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      MskError,
      message,
      {
        code: options.code ?? AwsErrorCodes.MSK.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
