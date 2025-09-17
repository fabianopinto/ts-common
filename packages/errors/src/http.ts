/**
 * @fileoverview This file contains error classes and types for handling HTTP-specific errors.
 * It provides a standardized way to represent common HTTP error conditions.
 */

import { AppError, AppErrorOptions, type ErrorContext } from "./base.js";

/** A collection of standard HTTP error codes. */
export enum ErrorCode {
  /** 400 Bad Request */
  BAD_REQUEST = "BAD_REQUEST",
  /** 401 Unauthorized */
  UNAUTHORIZED = "UNAUTHORIZED",
  /** 403 Forbidden */
  FORBIDDEN = "FORBIDDEN",
  /** 404 Not Found */
  NOT_FOUND = "NOT_FOUND",
  /** 405 Method Not Allowed */
  METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
  /** 409 Conflict */
  CONFLICT = "CONFLICT",
  /** 422 Unprocessable Entity */
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
  /** 429 Too Many Requests */
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  /** 500 Internal Server Error */
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

/** Maps `ErrorCode` enum members to HTTP status codes. */
export const errorCodeToHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNPROCESSABLE_ENTITY]: 422,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
};

/**
 * Get HTTP status number for a given ErrorCode.
 *
 * @param code - The ErrorCode to look up
 * @returns The HTTP status code
 */
export function httpStatusFor(code: ErrorCode): number {
  return errorCodeToHttpStatus[code];
}

/** Options for creating an `HttpError`. */
export interface HttpErrorOptions extends AppErrorOptions {
  /** The specific HTTP error code. */
  code: ErrorCode;
}

/**
 * An error class for representing HTTP-specific errors.
 * It automatically maps an `ErrorCode` to an HTTP status code.
 */
export class HttpError extends AppError {
  /**
   * Creates an instance of HttpError.
   *
   * @param message - Error message
   * @param options - Error options, including a mandatory `code`
   */
  public constructor(message: string, options: HttpErrorOptions) {
    super(message, {
      ...options,
      status: options.status ?? httpStatusFor(options.code),
    });
    this.name = "HttpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Expose codes for discoverability and IntelliSense. */
  public static readonly codes = ErrorCode;

  /**
   * Attaches or merges extra context to the error, returning a new HttpError instance.
   *
   * @param extra - Additional context to merge
   * @returns A new HttpError with merged context
   */
  public withContext(extra: ErrorContext): HttpError {
    return new HttpError(this.message, {
      code: (this as { code?: ErrorCode }).code ?? ErrorCode.INTERNAL_SERVER_ERROR,
      status: this.status,
      cause: this.cause,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Type guard to detect an HttpError instance.
   *
   * @param err - The value to check
   * @returns True if the value is an HttpError instance
   */
  public static is(err: unknown): err is HttpError {
    return err instanceof HttpError;
  }

  /**
   * Creates an HttpError from an unknown value and an explicit HTTP ErrorCode.
   *
   * @param err - Unknown error-like value
   * @param code - A specific HTTP ErrorCode to apply
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromCode(
    err: unknown,
    code: ErrorCode,
    message?: string,
    context?: ErrorContext,
  ): HttpError {
    if (err instanceof HttpError) {
      return message || context
        ? new HttpError(message ?? err.message, {
            code,
            status: httpStatusFor(code),
            cause: err.cause,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }
    if (err instanceof AppError) {
      return new HttpError(message ?? err.message, {
        code,
        status: httpStatusFor(code),
        cause: err,
        context: { ...(err.context ?? {}), ...(context ?? {}) },
      });
    }
    if (err instanceof Error) {
      return new HttpError(message ?? err.message, {
        code,
        status: httpStatusFor(code),
        cause: err,
        context,
      });
    }
    return new HttpError(message ?? "HTTP error", {
      code,
      status: httpStatusFor(code),
      cause: err,
      context,
    });
  }

  /**
   * Creates a `BAD_REQUEST` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static badRequest(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.BAD_REQUEST, context });
  }

  /**
   * Creates a `NOT_FOUND` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static notFound(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.NOT_FOUND, context });
  }

  /**
   * Creates a `METHOD_NOT_ALLOWED` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static methodNotAllowed(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.METHOD_NOT_ALLOWED, context });
  }

  /**
   * Create a BAD_REQUEST HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromBadRequest(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.BAD_REQUEST, message, context);
  }

  /**
   * Create an UNAUTHORIZED HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromUnauthorized(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.UNAUTHORIZED, message, context);
  }

  /**
   * Create a FORBIDDEN HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromForbidden(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.FORBIDDEN, message, context);
  }

  /**
   * Create a NOT_FOUND HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromNotFound(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.NOT_FOUND, message, context);
  }

  /**
   * Create a METHOD_NOT_ALLOWED HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromMethodNotAllowed(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.METHOD_NOT_ALLOWED, message, context);
  }

  /**
   * Create a CONFLICT HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromConflict(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.CONFLICT, message, context);
  }

  /**
   * Create an UNPROCESSABLE_ENTITY HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromUnprocessableEntity(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.UNPROCESSABLE_ENTITY, message, context);
  }

  /**
   * Create a TOO_MANY_REQUESTS HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromTooManyRequests(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.TOO_MANY_REQUESTS, message, context);
  }

  /**
   * Create an INTERNAL_SERVER_ERROR HttpError from unknown input.
   *
   * @param err - The error to convert
   * @param message - Error message override
   * @param context - Optional context to merge
   */
  public static fromInternalServerError(err: unknown, message?: string, context?: ErrorContext) {
    return HttpError.fromCode(err, ErrorCode.INTERNAL_SERVER_ERROR, message, context);
  }

  /**
   * Creates an `UNAUTHORIZED` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static unauthorized(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.UNAUTHORIZED, context });
  }

  /**
   * Creates a `FORBIDDEN` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static forbidden(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.FORBIDDEN, context });
  }

  /**
   * Creates a `CONFLICT` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static conflict(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.CONFLICT, context });
  }

  /**
   * Creates an `UNPROCESSABLE_ENTITY` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static unprocessableEntity(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.UNPROCESSABLE_ENTITY, context });
  }

  /**
   * Creates a `TOO_MANY_REQUESTS` error.
   *
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static tooManyRequests(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.TOO_MANY_REQUESTS, context });
  }

  /**
   * Guard: throws a `BAD_REQUEST` error when the condition is falsy.
   *
   * @param condition - Condition to check
   * @param message - Error message
   * @param context - Optional context for the error
   */
  public static ensure(
    condition: unknown,
    message = "Bad request",
    context?: ErrorContext,
  ): asserts condition {
    if (!condition) {
      throw new HttpError(message, { code: ErrorCode.BAD_REQUEST, context });
    }
  }

  /**
   * Guard: requires a non-nullish value, otherwise throws `BAD_REQUEST`.
   *
   * @param value - Value to check
   * @param message - Error message
   * @param context - Optional context for the error
   * @returns The non-nullish value
   */
  public static require<T>(
    value: T | null | undefined,
    message = "Bad request",
    context?: ErrorContext,
  ): NonNullable<T> {
    if (value == null) {
      throw new HttpError(message, { code: ErrorCode.BAD_REQUEST, context });
    }
    return value as NonNullable<T>;
  }

  /**
   * Creates an `INTERNAL_SERVER_ERROR`.
   *
   * @param message - Error message
   * @param cause - The original error or cause
   * @param context - Optional context for the error
   * @returns A new `HttpError` instance
   */
  public static internalServerError(message: string, cause?: unknown, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.INTERNAL_SERVER_ERROR, cause, context });
  }
}
