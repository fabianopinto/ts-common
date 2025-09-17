/**
 * @fileoverview AWS API Gateway error types and helpers.
 *
 * Defines `ApiGatewayError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.ApiGateway.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for Amazon API Gateway service-related issues. */
export class ApiGatewayError extends AwsError {
  /**
   * Creates an instance of ApiGatewayError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "ApiGatewayError";
  }

  /** Resource not found. */
  public static notFound(
    message = "API Gateway resource not found",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      ApiGatewayError,
      message,
      {
        code: options.code ?? AwsErrorCodes.ApiGateway.NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /** Throttling. */
  public static throttling(message = "API Gateway throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      ApiGatewayError,
      message,
      {
        code: options.code ?? AwsErrorCodes.ApiGateway.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /** Access denied. */
  public static accessDenied(message = "API Gateway access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      ApiGatewayError,
      message,
      {
        code: options.code ?? AwsErrorCodes.ApiGateway.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /** Validation error in API Gateway. */
  public static validation(
    message = "API Gateway validation error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      ApiGatewayError,
      message,
      {
        code: options.code ?? AwsErrorCodes.ApiGateway.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /** Timeout on API Gateway integration. */
  public static timeout(message = "API Gateway request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      ApiGatewayError,
      message,
      {
        code: options.code ?? AwsErrorCodes.ApiGateway.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /** Internal error in API Gateway service. */
  public static internal(message = "API Gateway internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      ApiGatewayError,
      message,
      {
        code: options.code ?? AwsErrorCodes.ApiGateway.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
