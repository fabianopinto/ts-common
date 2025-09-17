/**
 * @fileoverview Database error types, codes, and helpers.
 *
 * Provides `DatabaseError` and related constants/utilities for connection, query,
 * transaction, and resource errors with standardized codes and statuses.
 */

import { AppError, AppErrorOptions, type ErrorContext } from "./base.js";
import { makeServiceError } from "./service-error.js";

/** Centralized database error code constants. */
export const DatabaseErrorCodes = {
  CONNECTION_FAILED: "DB_CONNECTION_FAILED",
  QUERY_FAILED: "DB_QUERY_FAILED",
  TRANSACTION_FAILED: "DB_TRANSACTION_FAILED",
  DEADLOCK: "DB_DEADLOCK",
  SERIALIZATION_FAILURE: "DB_SERIALIZATION_FAILURE",
  UNIQUE_VIOLATION: "DB_UNIQUE_VIOLATION",
  TIMEOUT: "DB_TIMEOUT",
  THROTTLING: "DB_THROTTLING",
  NOT_FOUND: "DB_NOT_FOUND",
  CONFLICT: "DB_CONFLICT",
  VALIDATION_ERROR: "DB_VALIDATION_ERROR",
  SERVICE_UNAVAILABLE: "DB_SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "DB_INTERNAL_ERROR",
} as const;

/** Union of all database error code string literals. */
export type DatabaseErrorCode = (typeof DatabaseErrorCodes)[keyof typeof DatabaseErrorCodes];

// Named exports for ergonomic imports in consumers (database)
export const DB_CONNECTION_FAILED = DatabaseErrorCodes.CONNECTION_FAILED;
export const DB_QUERY_FAILED = DatabaseErrorCodes.QUERY_FAILED;
export const DB_TRANSACTION_FAILED = DatabaseErrorCodes.TRANSACTION_FAILED;
export const DB_DEADLOCK = DatabaseErrorCodes.DEADLOCK;
export const DB_SERIALIZATION_FAILURE = DatabaseErrorCodes.SERIALIZATION_FAILURE;
export const DB_UNIQUE_VIOLATION = DatabaseErrorCodes.UNIQUE_VIOLATION;
export const DB_TIMEOUT = DatabaseErrorCodes.TIMEOUT;
export const DB_THROTTLING = DatabaseErrorCodes.THROTTLING;
export const DB_NOT_FOUND = DatabaseErrorCodes.NOT_FOUND;
export const DB_CONFLICT = DatabaseErrorCodes.CONFLICT;
export const DB_VALIDATION_ERROR = DatabaseErrorCodes.VALIDATION_ERROR;
export const DB_SERVICE_UNAVAILABLE = DatabaseErrorCodes.SERVICE_UNAVAILABLE;
export const DB_INTERNAL_ERROR = DatabaseErrorCodes.INTERNAL_ERROR;

/**
 * A base error for database-related issues.
 * This is an operational error, as it may be transient or recoverable.
 */
export class DatabaseError extends AppError {
  /**
   * Creates an instance of DatabaseError.
   *
   * @param message - Error message
   * @param options - Error options
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: true });
    this.name = "DatabaseError";
  }

  /**
   * Exposes the database error codes for discoverability and IntelliSense.
   * Useful for consumers to reference standardized `code` values.
   */
  public static readonly codes = DatabaseErrorCodes;

  /**
   * Attaches or merges extra context to the error, returning a new DatabaseError instance.
   *
   * @param extra - Additional context to merge into the error's context
   * @returns A new DatabaseError with merged context
   */
  public withContext(extra: ErrorContext): DatabaseError {
    return new DatabaseError(this.message, {
      code: this.code,
      status: this.status,
      cause: this.cause,
      isOperational: this.isOperational,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Type guard to detect a DatabaseError instance.
   *
   * @param err - Unknown value to test
   * @returns True if `err` is a DatabaseError
   */
  public static is(err: unknown): err is DatabaseError {
    return err instanceof DatabaseError;
  }

  /**
   * Creates a DatabaseError from an unknown value, preserving structure and context.
   *
   * - Reuses an existing DatabaseError instance when appropriate
   * - Converts other AppError instances while preserving details
   * - Wraps native Error or non-error values as the cause
   *
   * @param err - Unknown error-like value
   * @param message - Optional override message
   * @param context - Optional context to merge
   * @returns A DatabaseError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): DatabaseError {
    if (err instanceof DatabaseError) {
      return message || context
        ? new DatabaseError(message ?? err.message, {
            code: err.code,
            status: err.status,
            cause: err.cause,
            isOperational: err.isOperational,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }
    if (err instanceof AppError) {
      return new DatabaseError(message ?? err.message, {
        code: err.code ?? DatabaseErrorCodes.INTERNAL_ERROR,
        status: err.status,
        cause: err,
        isOperational: err.isOperational ?? true,
        context: { ...(err.context ?? {}), ...(context ?? {}) },
      });
    }
    if (err instanceof Error) {
      return new DatabaseError(message ?? err.message, { cause: err, context });
    }
    return new DatabaseError(message ?? "Database error", { cause: err, context });
  }

  /**
   * Connection failure or inability to reach the database.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_CONNECTION_FAILED and status 503
   */
  public static connection(message = "Database connection failed", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.CONNECTION_FAILED,
        status: options.status ?? 503,
      },
      options,
    );
  }

  /**
   * A query failed to execute or returned an error.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_QUERY_FAILED and status 500
   */
  public static queryFailed(message = "Database query failed", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.QUERY_FAILED,
        status: options.status ?? 500,
      },
      options,
    );
  }

  /**
   * A transaction failed to commit/rollback or encountered an error.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_TRANSACTION_FAILED and status 500
   */
  public static transactionFailed(
    message = "Database transaction failed",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.TRANSACTION_FAILED,
        status: options.status ?? 500,
      },
      options,
    );
  }

  /**
   * A deadlock was detected during a database operation.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_DEADLOCK and status 409
   */
  public static deadlock(message = "Database deadlock detected", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.DEADLOCK,
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * A serialization failure occurred (e.g., due to concurrent updates) requiring retry.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_SERIALIZATION_FAILURE and status 409
   */
  public static serializationFailure(
    message = "Database serialization failure",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.SERIALIZATION_FAILURE,
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * A unique constraint or key violation occurred.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_UNIQUE_VIOLATION and status 409
   */
  public static uniqueViolation(
    message = "Unique constraint violation",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.UNIQUE_VIOLATION,
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * A database operation timed out.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_TIMEOUT and status 504
   */
  public static timeout(message = "Database timeout", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.TIMEOUT,
        status: options.status ?? 504,
      },
      options,
    );
  }

  /**
   * Throttling or rate limiting occurred on database operations.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_THROTTLING and status 429
   */
  public static throttling(message = "Database throttling", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /**
   * A referenced database resource was not found.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_NOT_FOUND and status 404
   */
  public static notFound(message = "Database resource not found", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /**
   * A conflict occurred (e.g., version/optimistic concurrency conflict).
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_CONFLICT and status 409
   */
  public static conflict(message = "Database conflict", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.CONFLICT,
        status: options.status ?? 409,
      },
      options,
    );
  }

  /**
   * A validation error occurred in a database operation.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_VALIDATION_ERROR and status 400
   */
  public static validation(message = "Database validation error", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.VALIDATION_ERROR,
        status: options.status ?? 400,
      },
      options,
    );
  }

  /**
   * The database service is temporarily unavailable or under maintenance.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_SERVICE_UNAVAILABLE and status 503
   */
  public static serviceUnavailable(
    message = "Database service unavailable",
    options: AppErrorOptions = {},
  ) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.SERVICE_UNAVAILABLE,
        status: options.status ?? 503,
      },
      options,
    );
  }

  /**
   * An internal database error occurred.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A DatabaseError with code DB_INTERNAL_ERROR and status 500
   */
  public static internal(message = "Database internal error", options: AppErrorOptions = {}) {
    return makeServiceError(
      DatabaseError,
      message,
      {
        code: options.code ?? DatabaseErrorCodes.INTERNAL_ERROR,
        status: options.status ?? 500,
      },
      options,
    );
  }
}
