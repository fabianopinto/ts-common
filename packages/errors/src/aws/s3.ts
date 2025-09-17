/**
 * @fileoverview AWS S3 error types and helpers.
 *
 * Defines `S3Error`, a service-specific error class with factory-backed helpers
 * that standardize `code` and HTTP `status` using `AwsErrorCodes.S3.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS S3 service-related issues. */
export class S3Error extends AwsError {
  /**
   * Creates an instance of S3Error.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "S3Error";
  }

  /**
   * Create an S3Error from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns An S3Error instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): S3Error {
    return fromAwsError(
      S3Error,
      err,
      { code: AwsErrorCodes.S3.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Bucket was not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static bucketNotFound(message = "S3 bucket not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      S3Error,
      message,
      {
        code: options.code ?? AwsErrorCodes.S3.BUCKET_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Object (key) was not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static objectNotFound(message = "S3 object not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      S3Error,
      message,
      {
        code: options.code ?? AwsErrorCodes.S3.OBJECT_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Access denied by S3/IAM/KMS policies.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static accessDenied(message = "S3 access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      S3Error,
      message,
      {
        code: options.code ?? AwsErrorCodes.S3.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Throttling/SlowDown from S3.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(message = "S3 throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      S3Error,
      message,
      {
        code: options.code ?? AwsErrorCodes.S3.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Invalid request/argument, precondition failed, etc.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static validation(message = "S3 validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      S3Error,
      message,
      {
        code: options.code ?? AwsErrorCodes.S3.VALIDATION_ERROR,
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
  public static timeout(message = "S3 request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      S3Error,
      message,
      {
        code: options.code ?? AwsErrorCodes.S3.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Internal error returned by S3 service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static internal(message = "S3 internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      S3Error,
      message,
      {
        code: options.code ?? AwsErrorCodes.S3.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
