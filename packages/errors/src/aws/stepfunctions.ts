/**
 * @fileoverview AWS Step Functions error types and helpers.
 *
 * Defines `StepFunctionsError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.StepFunctions.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS Step Functions service-related issues. */
export class StepFunctionsError extends AwsError {
  /**
   * Creates an instance of StepFunctionsError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "StepFunctionsError";
  }

  /**
   * Execution not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static executionNotFound(message = "Execution not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StepFunctionsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.StepFunctions.EXECUTION_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * State machine not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static stateMachineNotFound(
    message = "State machine not found",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      StepFunctionsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.StepFunctions.STATE_MACHINE_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Throttled Step Functions request.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(message = "Step Functions throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StepFunctionsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.StepFunctions.THROTTLING,
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
    message = "Step Functions access denied",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      StepFunctionsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.StepFunctions.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Validation error in Step Functions API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static validation(
    message = "Step Functions validation error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      StepFunctionsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.StepFunctions.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Internal error in Step Functions service.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static internal(message = "Step Functions internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      StepFunctionsError,
      message,
      {
        code: options.code ?? AwsErrorCodes.StepFunctions.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
