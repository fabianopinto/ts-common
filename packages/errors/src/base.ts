/**
 * @fileoverview This file contains the base error classes and types for the application.
 *
 * It provides a foundation for creating more specific error types with support for
 * structured context, error codes, and cause-chaining.
 */

/**
 * Defines a record for structured error context.
 */
export type ErrorContext = Record<string, unknown>;

/**
 * Options for creating a `BaseError`.
 */
export interface BaseErrorOptions {
  /** The original error or cause of this error. */
  cause?: unknown;
  /** Structured context for diagnostics and observability. */
  context?: ErrorContext;
  /** A unique code for this error type. */
  code?: string;
  /** A flag to distinguish between operational errors and programmer errors. */
  isOperational?: boolean;
}

/**
 * The base error class for the application.
 * All other custom errors should extend this class.
 */
export class BaseError extends Error {
  /** A unique code for this error type. */
  public readonly code?: string;
  /** Structured context for diagnostics and observability. */
  public readonly context?: ErrorContext;
  /** The original error or cause of this error. */
  public readonly cause?: unknown;
  /** A flag to distinguish between operational errors and programmer errors. */
  public readonly isOperational: boolean;

  /**
   * Creates an instance of BaseError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: BaseErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause as Error } : undefined);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);

    this.code = options.code;
    this.context = options.context;
    this.cause = options.cause;
    this.isOperational = options.isOperational ?? false;
  }

  /**
   * Returns a JSON representation of the error.
   * @returns A plain object representing the error.
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      isOperational: this.isOperational,
      cause: serializeCause(this.cause),
      stack: this.stack,
    };
  }
}

/**
 * Options for creating an `AppError`.
 */
export interface AppErrorOptions extends BaseErrorOptions {
  /** An HTTP-like status code. */
  status?: number;
}

/**
 * A general-purpose application error.
 * This class is a good starting point for most custom errors.
 */
export class AppError extends BaseError {
  /** An HTTP-like status code. */
  public readonly status?: number;

  /**
   * Creates an instance of AppError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.status = options.status;
  }

  /**
   * Attaches or merges extra context to the error.
   * @param extra - The extra context to add.
   * @returns A new `AppError` instance with the merged context.
   */
  withContext(extra: ErrorContext): AppError {
    return new AppError(this.message, {
      code: this.code,
      status: this.status,
      cause: this.cause,
      isOperational: this.isOperational,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Returns a JSON representation of the error.
   * @returns A plain object representing the error.
   */
  toJSON() {
    return {
      ...super.toJSON(),
      status: this.status,
    };
  }

  /**
   * Creates an `AppError` from an unknown error type.
   * @param err - The unknown error.
   * @param message - An optional new message for the error.
   * @param context - Optional context to add to the error.
   * @returns An `AppError` instance.
   */
  static from(err: unknown, message?: string, context?: ErrorContext): AppError {
    if (err instanceof AppError) {
      return message || context
        ? new AppError(message ?? err.message, {
            code: err.code,
            status: err.status,
            cause: err.cause,
            isOperational: err.isOperational,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }

    if (err instanceof Error) {
      return new AppError(message ?? err.message, { cause: err, context });
    }

    return new AppError(message ?? "Unknown error", { cause: err, context });
  }
}

/**
 * Safely serializes the cause of an error.
 * @param cause - The error cause to serialize.
 * @returns A serializable representation of the cause.
 */
function serializeCause(cause: unknown): unknown {
  if (!cause) return cause;
  if (cause instanceof AppError) return cause.toJSON();
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
    };
  }
  if (typeof cause === "object") {
    try {
      return JSON.parse(JSON.stringify(cause));
    } catch {
      return String(cause);
    }
  }
  return cause;
}
