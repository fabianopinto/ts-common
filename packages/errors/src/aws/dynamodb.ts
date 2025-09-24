/**
 * @fileoverview AWS DynamoDB error types and helpers.
 *
 * Defines `DynamoDbError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.DynamoDB.*`.
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
 * An error for AWS DynamoDB service-related issues.
 */
export class DynamoDbError extends AwsError {
  /**
   * Creates an instance of `DynamoDbError`.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "DynamoDbError";
  }

  /**
   * Create a `DynamoDbError` from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A `DynamoDbError` instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): DynamoDbError {
    return fromAwsError(
      DynamoDbError,
      err,
      { code: AwsErrorCodes.DynamoDB.INTERNAL_ERROR, status: 500 },
      message,
      context,
    );
  }

  /**
   * Conditional check failed (e.g., Put/Update with `ConditionExpression`).
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with conditional check failed details
   */
  public static conditionalCheckFailed(
    message = "DynamoDB conditional check failed",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.CONDITIONAL_CHECK_FAILED,
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * Provisioned throughput exceeded / request throttled.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with throughput exceeded details
   */
  public static throughputExceeded(
    message = "DynamoDB provisioned throughput exceeded",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.THROUGHPUT_EXCEEDED,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Item not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with item not found details
   */
  public static itemNotFound(message = "DynamoDB item not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.ITEM_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Transaction conflict/canceled/resource in use.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with transaction conflict details
   */
  public static transactionConflict(
    message = "DynamoDB transaction conflict",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.TRANSACTION_CONFLICT,
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * Access denied by IAM/KMS policies.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with access denied details
   */
  public static accessDenied(message = "DynamoDB access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Throttling.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with throttling details
   */
  public static throttling(message = "DynamoDB throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Validation errors from DynamoDB API.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with validation error details
   */
  public static validation(message = "DynamoDB validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Internal error returned by DynamoDB service.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `DynamoDbError` with internal error details
   */
  public static internal(message = "DynamoDB internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      DynamoDbError,
      message,
      {
        code: options.code ?? AwsErrorCodes.DynamoDB.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
