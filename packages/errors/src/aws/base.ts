/**
 * @fileoverview AWS base error types and utilities.
 *
 * Provides the `AwsError` base class and the `makeAwsServiceError` factory used
 * by service-specific errors to standardize `code`, HTTP `status`, and
 * operational behavior.
 */

import { AppError, type AppErrorOptions } from "../base.js";

export type { AppErrorOptions, ErrorContext } from "../base.js";

/**
 * Base error for AWS service-related issues.
 */
export class AwsError extends AppError {
  public constructor(message: string, options: AppErrorOptions = {}) {
    const { isOperational, ...rest } = options;
    super(message, { ...rest, isOperational: isOperational ?? true });
    this.name = "AwsError";
  }

  /**
   * Authentication/authorization failure (e.g., invalid credentials, expired
   * tokens).
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with authentication failure details
   */
  public static authentication(
    message = "AWS authentication failed",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_AUTHENTICATION_ERROR",
        status: options.status ?? 401,
      },
      options,
    );
  }

  /**
   * Access denied/forbidden error (e.g., IAM or KMS access denied).
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with access denied details
   */
  public static accessDenied(message = "AWS access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_ACCESS_DENIED",
        status: options.status ?? 403,
      },
      options,
    );
  }

  /**
   * Throttling error (`TooManyRequests` / `ProvisionedThroughputExceededException`).
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with throttling details
   */
  public static throttling(message = "AWS throttling error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_THROTTLING",
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * Timeout connecting to or waiting for AWS service.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with timeout details
   */
  public static timeout(message = "AWS request timed out", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_TIMEOUT",
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Resource not found (e.g., `ParameterNotFound`, `NoSuchKey`).
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with not found details
   */
  public static notFound(message = "AWS resource not found", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_NOT_FOUND",
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * Conflict/conditional check failed.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with conflict details
   */
  public static conflict(message = "AWS resource conflict", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_CONFLICT",
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * Validation/bad request error from AWS APIs.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with validation error details
   */
  public static validation(message = "AWS validation error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_VALIDATION_ERROR",
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * AWS service unavailable or transient outage.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with service unavailable details
   */
  public static serviceUnavailable(
    message = "AWS service unavailable",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_SERVICE_UNAVAILABLE",
        status: options.status ?? 503,
      },
      options,
    );
  }

  /**
   * Internal error returned by AWS service.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns An `AwsError` with internal error details
   */
  public static internal(message = "AWS internal error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      AwsError,
      message,
      {
        code: options.code ?? "AWS_INTERNAL_ERROR",
        status: options.status ?? 500,
      },
      options,
    );
  }
}

/**
 * Constructor type for service-specific `AwsError` subclasses.
 */
export type AwsErrorCtor<E extends AwsError> = new (
  message: string,
  options?: AppErrorOptions,
) => E;

/**
 * Factory to create service errors with consistent defaults and overrides.
 *
 * @template E - The AWS error type to create
 * @param Ctor - The service error class constructor
 * @param message - Error message
 * @param defaults - Default `AppErrorOptions` (e.g., `code`, `status`)
 * @param options - Optional overrides/extra context. `isOperational` defaults
 *   to `true`
 * @returns The created AWS service error instance
 */
export function makeAwsServiceError<E extends AwsError>(
  Ctor: AwsErrorCtor<E>,
  message: string,
  defaults: AppErrorOptions,
  options: AppErrorOptions = {},
): E {
  const { isOperational, ...rest } = options;
  return new Ctor(message, {
    ...defaults,
    ...rest,
    isOperational: isOperational ?? true,
  });
}

/**
 * Create a service-specific `AwsError` from an unknown input, preserving
 * structure and context.
 *
 * @template E - The AWS error type to create
 * @param Ctor - The service error class constructor
 * @param err - Unknown error-like value
 * @param fallback - Fallback defaults for `code` and `status`
 * @param message - Error message override
 * @param context - Optional context to merge
 * @returns The created AWS service error instance
 */
export function fromAwsError<E extends AwsError>(
  Ctor: AwsErrorCtor<E>,
  err: unknown,
  fallback: { code: string; status: number },
  message?: string,
  context?: Record<string, unknown>,
): E {
  if (err instanceof Ctor) {
    return message || context
      ? new Ctor(message ?? err.message, {
          code: (err as unknown as { code?: string }).code ?? fallback.code,
          status: (err as unknown as { status?: number }).status ?? fallback.status,
          cause: (err as unknown as { cause?: unknown }).cause,
          isOperational: (err as unknown as { isOperational?: boolean }).isOperational ?? true,
          context: {
            ...((err as unknown as { context?: Record<string, unknown> }).context ?? {}),
            ...(context ?? {}),
          },
        })
      : err;
  }
  if (err instanceof AppError) {
    return new Ctor(message ?? err.message, {
      code: (err as unknown as { code?: string }).code ?? fallback.code,
      status: (err as unknown as { status?: number }).status ?? fallback.status,
      cause: err,
      isOperational: (err as unknown as { isOperational?: boolean }).isOperational ?? true,
      context: { ...(err.context ?? {}), ...(context ?? {}) },
    });
  }
  if (err instanceof Error) {
    return new Ctor(message ?? err.message, {
      code: fallback.code,
      status: fallback.status,
      cause: err,
      isOperational: true,
      context,
    });
  }
  return new Ctor(message ?? "AWS service error", {
    code: fallback.code,
    status: fallback.status,
    isOperational: true,
    cause: err,
    context,
  });
}
