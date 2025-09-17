/**
 * @fileoverview AWS Kinesis error types and helpers.
 *
 * Defines `KinesisError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.Kinesis.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS Kinesis service-related issues. */
export class KinesisError extends AwsError {
  /**
   * Creates an instance of KinesisError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "KinesisError";
  }

  /**
   * Create a KinesisError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A KinesisError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): KinesisError {
    return fromAwsError(
      KinesisError,
      err,
      { code: AwsErrorCodes.Kinesis.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Provisioned throughput exceeded (throttling) on Kinesis streams.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static provisionedThroughputExceeded(
    message = "Kinesis provisioned throughput exceeded",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      KinesisError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Kinesis.PROVISIONED_THROUGHPUT_EXCEEDED,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * General throttling on Kinesis operations.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(message = "Kinesis throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KinesisError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Kinesis.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Stream not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static streamNotFound(
    message = "Kinesis stream not found",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      KinesisError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Kinesis.STREAM_NOT_FOUND,
        status: options.status ?? 404,
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
  public static accessDenied(message = "Kinesis access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KinesisError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Kinesis.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Validation error in the request parameters.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static validation(message = "Kinesis validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KinesisError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Kinesis.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Network or service timeout.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static timeout(message = "Kinesis request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KinesisError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Kinesis.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Internal error returned by Kinesis service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static internal(message = "Kinesis internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KinesisError,
      message,
      {
        code: options.code ?? AwsErrorCodes.Kinesis.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
