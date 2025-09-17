/**
 * @fileoverview AWS KMS error types and helpers.
 *
 * Defines `KmsError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.KMS.*`.
 */

import {
  type AppErrorOptions,
  AwsError,
  type ErrorContext,
  fromAwsError,
  makeAwsServiceError,
} from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS KMS service-related issues. */
export class KmsError extends AwsError {
  /**
   * Creates an instance of KmsError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "KmsError";
  }

  /**
   * Create a KmsError from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A KmsError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): KmsError {
    return fromAwsError(
      KmsError,
      err,
      { code: AwsErrorCodes.KMS.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * CMK/key not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static keyNotFound(message = "KMS key not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KmsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.KMS.KEY_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Invalid ciphertext in KMS operation.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static invalidCiphertext(
    message = "KMS invalid ciphertext",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      KmsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.KMS.INVALID_CIPHERTEXT,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * General throttling on KMS operations.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(message = "KMS throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KmsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.KMS.THROTTLING,
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
  public static accessDenied(message = "KMS access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KmsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.KMS.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Internal error in KMS service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static internal(message = "KMS internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      KmsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.KMS.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
