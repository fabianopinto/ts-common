/**
 * @fileoverview Third-party service error types, codes, and helpers.
 *
 * Provides `ThirdPartyServiceError` and related constants/utilities for provider
 * authentication/authorization, throttling, timeouts, and resource errors with
 * standardized codes and statuses.
 */

import { AppError, AppErrorOptions, type ErrorContext } from "./base.js";
import { makeServiceError } from "./service-error.js";

/**
 * Centralized third-party service error code constants.
 */
export const ThirdPartyErrorCodes = {
  AUTHENTICATION_ERROR: "THIRD_PARTY_AUTHENTICATION_ERROR",
  ACCESS_DENIED: "THIRD_PARTY_ACCESS_DENIED",
  THROTTLING: "THIRD_PARTY_THROTTLING",
  RATE_LIMIT: "THIRD_PARTY_RATE_LIMIT",
  TIMEOUT: "THIRD_PARTY_TIMEOUT",
  NOT_FOUND: "THIRD_PARTY_NOT_FOUND",
  CONFLICT: "THIRD_PARTY_CONFLICT",
  VALIDATION_ERROR: "THIRD_PARTY_VALIDATION_ERROR",
  SERVICE_UNAVAILABLE: "THIRD_PARTY_SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "THIRD_PARTY_INTERNAL_ERROR",
} as const;

/**
 * Union of all third-party error code string literals.
 */
export type ThirdPartyErrorCode = (typeof ThirdPartyErrorCodes)[keyof typeof ThirdPartyErrorCodes];

// Named exports for ergonomic imports in consumers (third-party)
export const THIRD_PARTY_AUTHENTICATION_ERROR = ThirdPartyErrorCodes.AUTHENTICATION_ERROR;
export const THIRD_PARTY_ACCESS_DENIED = ThirdPartyErrorCodes.ACCESS_DENIED;
export const THIRD_PARTY_THROTTLING = ThirdPartyErrorCodes.THROTTLING;
export const THIRD_PARTY_RATE_LIMIT = ThirdPartyErrorCodes.RATE_LIMIT;
export const THIRD_PARTY_TIMEOUT = ThirdPartyErrorCodes.TIMEOUT;
export const THIRD_PARTY_NOT_FOUND = ThirdPartyErrorCodes.NOT_FOUND;
export const THIRD_PARTY_CONFLICT = ThirdPartyErrorCodes.CONFLICT;
export const THIRD_PARTY_VALIDATION_ERROR = ThirdPartyErrorCodes.VALIDATION_ERROR;
export const THIRD_PARTY_SERVICE_UNAVAILABLE = ThirdPartyErrorCodes.SERVICE_UNAVAILABLE;
export const THIRD_PARTY_INTERNAL_ERROR = ThirdPartyErrorCodes.INTERNAL_ERROR;

/**
 * An error for failures in external service integrations.
 * This is an operational error, as the external service may recover.
 */
export class ThirdPartyServiceError extends AppError {
  /**
   * Creates an instance of `ThirdPartyServiceError`.
   *
   * @param message - Error message
   * @param options - The error options
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: true });
    this.name = "ThirdPartyServiceError";
  }

  /**
   * Exposes third-party service error codes for discoverability and IntelliSense.
   * Useful for consumers to reference standardized `code` values.
   */
  public static readonly codes = ThirdPartyErrorCodes;

  /**
   * Merges the given `extra` context with the current error's context, returning
   * a new `ThirdPartyServiceError` instance with the merged context.
   *
   * @param extra - The additional error context to merge
   * @returns A new `ThirdPartyServiceError` instance with the merged context
   */
  public withContext(extra: ErrorContext): ThirdPartyServiceError {
    return new ThirdPartyServiceError(this.message, {
      code: this.code,
      status: this.status,
      cause: this.cause,
      isOperational: this.isOperational,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Convenience type guard to check if the given error is an instance of
   * `ThirdPartyServiceError`.
   *
   * @param err - The error to check
   * @returns `true` if the error is a `ThirdPartyServiceError`, `false` otherwise
   */
  public static is(err: unknown): err is ThirdPartyServiceError {
    return err instanceof ThirdPartyServiceError;
  }

  /**
   * Create a `ThirdPartyServiceError` from an unknown input.
   *
   * @param err - The error to convert
   * @param message - Optional override message
   * @param context - Optional context to merge
   * @returns A `ThirdPartyServiceError` instance
   */
  public static from(
    err: unknown,
    message?: string,
    context?: ErrorContext,
  ): ThirdPartyServiceError {
    if (err instanceof ThirdPartyServiceError) {
      return message || context
        ? new ThirdPartyServiceError(message ?? err.message, {
            code: err.code,
            status: err.status,
            cause: err.cause,
            isOperational: err.isOperational,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }
    if (err instanceof AppError) {
      return new ThirdPartyServiceError(message ?? err.message, {
        code: err.code ?? ThirdPartyErrorCodes.INTERNAL_ERROR,
        status: err.status,
        cause: err,
        isOperational: err.isOperational ?? true,
        context: { ...(err.context ?? {}), ...(context ?? {}) },
      });
    }
    if (err instanceof Error) {
      return new ThirdPartyServiceError(message ?? err.message, { cause: err, context });
    }
    return new ThirdPartyServiceError(message ?? "Third-party service error", {
      cause: err,
      context,
    });
  }

  /**
   * Authentication or identity failure for third-party provider.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_AUTHENTICATION_ERROR` and
   *   status `401`
   */
  public static authentication(
    message = "Third-party authentication failed",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.AUTHENTICATION_ERROR,
        status: options.status ?? 401,
      },
      options,
    );
  }

  /**
   * Access denied/authorization failure for third-party provider.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_ACCESS_DENIED` and status
   *   `403`
   */
  public static accessDenied(message = "Third-party access denied", options: AppErrorOptions = {}) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Throttling or rate limiting from third-party provider.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_THROTTLING` and status `429`
   */
  public static throttling(message = "Third-party throttling", options: AppErrorOptions = {}) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Alias for throttling (common terminology).
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_RATE_LIMIT` and status `429`
   */
  public static rateLimit(
    message = "Third-party rate limit exceeded",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.RATE_LIMIT,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Timeout waiting on third-party provider.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_TIMEOUT` and status `504`
   */
  public static timeout(message = "Third-party request timed out", options: AppErrorOptions = {}) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Third-party resource not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_NOT_FOUND` and status `404`
   */
  public static notFound(
    message = "Third-party resource not found",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Third-party resource conflict detected.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_CONFLICT` and status `409`
   */
  public static conflict(message = "Third-party resource conflict", options: AppErrorOptions = {}) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.CONFLICT,
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * Third-party validation/contract error.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_VALIDATION_ERROR` and
   *   status `400`
   */
  public static validation(
    message = "Third-party validation error",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * Third-party provider is unavailable or under outage.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_SERVICE_UNAVAILABLE` and
   *   status `503`
   */
  public static serviceUnavailable(
    message = "Third-party service unavailable",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.SERVICE_UNAVAILABLE,
        status: options.status ?? 503,
      },
      options,
    );
  }

  /**
   * Third-party internal error.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A `ThirdPartyServiceError` with code `TP_INTERNAL_ERROR` and status
   *   `500`
   */
  public static internal(message = "Third-party internal error", options: AppErrorOptions = {}) {
    return makeServiceError(
      ThirdPartyServiceError,
      message,
      {
        code: options.code ?? ThirdPartyErrorCodes.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
