/**
 * @fileoverview AWS DynamoDB error types and helpers.
 *
 * Defines `DynamoDbError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.DynamoDB.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS DynamoDB service-related issues. */
export class DynamoDbError extends AwsError {
  /**
   * Creates an instance of DynamoDbError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "DynamoDbError";
  }

  /** Conditional check failed (e.g., Put/Update with ConditionExpression). */
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

  /** Provisioned throughput exceeded / request throttled. */
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

  /** Item not found. */
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

  /** Transaction conflict/canceled/resource in use. */
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

  /** Access denied by IAM/KMS policies. */
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

  /** Throttling. */
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

  /** Validation errors from DynamoDB API. */
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

  /** Internal error returned by DynamoDB service. */
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
