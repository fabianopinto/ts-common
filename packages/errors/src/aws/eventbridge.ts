/**
 * @fileoverview AWS EventBridge error types and helpers.
 *
 * Defines `EventBridgeError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.EventBridge.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS EventBridge (CloudWatch Events) service-related issues. */
export class EventBridgeError extends AwsError {
  /**
   * Creates an instance of EventBridgeError.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "EventBridgeError";
  }

  /**
   * Event bus not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static busNotFound(message = "Event bus not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      EventBridgeError,
      message,
      {
        code: options.code ?? AwsErrorCodes.EventBridge.BUS_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Rule not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static ruleNotFound(message = "Event rule not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      EventBridgeError,
      message,
      {
        code: options.code ?? AwsErrorCodes.EventBridge.RULE_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Throttled EventBridge operation.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static throttling(message = "EventBridge throttling", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      EventBridgeError,
      message,
      {
        code: options.code ?? AwsErrorCodes.EventBridge.THROTTLING,
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
  public static accessDenied(message = "EventBridge access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      EventBridgeError,
      message,
      {
        code: options.code ?? AwsErrorCodes.EventBridge.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Validation error in EventBridge API.
   *
   * @param message - Error message
   * @param options - Additional error options
   */
  public static validation(
    message = "EventBridge validation error",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      EventBridgeError,
      message,
      {
        code: options.code ?? AwsErrorCodes.EventBridge.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }
}
