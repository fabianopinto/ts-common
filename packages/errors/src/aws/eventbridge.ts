/**
 * @fileoverview AWS EventBridge error types and helpers.
 *
 * Defines `EventBridgeError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using
 * `AwsErrorCodes.EventBridge.*`.
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
 * An error for AWS EventBridge (CloudWatch Events) service-related issues.
 */
export class EventBridgeError extends AwsError {
  /**
   * Creates an instance of `EventBridgeError`.
   *
   * @param message - Error message
   * @param options - Additional error options and context
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "EventBridgeError";
  }

  /**
   * Create an `EventBridgeError` from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns An `EventBridgeError` instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): EventBridgeError {
    return fromAwsError(
      EventBridgeError,
      err,
      { code: "EVENTBRIDGE_INTERNAL_ERROR", status: 500 },
      message,
      context,
    );
  }

  /**
   * Event bus not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `EventBridgeError` with event bus not found details
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
   * @returns An `EventBridgeError` with rule not found details
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
   * @returns An `EventBridgeError` with throttling details
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
   * @returns An `EventBridgeError` with access denied details
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
   * @returns An `EventBridgeError` with validation error details
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
