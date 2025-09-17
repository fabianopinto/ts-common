/**
 * @fileoverview AWS MSK (Managed Streaming for Apache Kafka) error types and helpers.
 *
 * Defines `MskError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.MSK.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for Amazon MSK (Managed Streaming for Apache Kafka) service-related issues. */
export class MskError extends AwsError {
  /**
   * Creates an instance of MskError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "MskError";
  }

  /** MSK cluster not found. */
  public static clusterNotFound(message = "MSK cluster not found", options: AppErrorOptions = {}) {
    // There isn't a specific code defined earlier; using CLUSTER_NOT_FOUND from AwsErrorCodes.MSK
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

  /** Throttling on MSK operations. */
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

  /** Access denied by IAM policies. */
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

  /** Validation error. */
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

  /** Timeout while calling MSK. */
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

  /** Internal error in MSK service. */
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
