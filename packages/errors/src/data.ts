/**
 * @fileoverview Error classes related to data processing, validation, and
 * transformation.
 *
 * These errors are useful for building robust data pipelines and services.
 */

import { AppError, AppErrorOptions, type ErrorContext } from "./base.js";
export type { ErrorContext } from "./base.js";

/**
 * Centralized data error code constants.
 */
export const DataErrorCodes = {
  VALIDATION_ERROR: "DATA_VALIDATION_ERROR",
  TRANSFORMATION_ERROR: "DATA_TRANSFORMATION_ERROR",
  PARSE_ERROR: "DATA_PARSE_ERROR",
} as const;

/**
 * Union of all data error code string literals.
 */
export type DataErrorCode = (typeof DataErrorCodes)[keyof typeof DataErrorCodes];

// Named exports for ergonomic imports
export const DATA_VALIDATION_ERROR = DataErrorCodes.VALIDATION_ERROR;
export const DATA_TRANSFORMATION_ERROR = DataErrorCodes.TRANSFORMATION_ERROR;
export const DATA_PARSE_ERROR = DataErrorCodes.PARSE_ERROR;

/**
 * A base error for data processing or transformation issues.
 * This is an operational error, as it often relates to malformed or unexpected
 * input data.
 */
export class DataError extends AppError {
  /**
   * Creates an instance of `DataError`.
   *
   * @param message - Error message
   * @param options - Error options
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: true });
    this.name = "DataError";
  }

  /** Expose data error codes for discoverability and IntelliSense. */
  public static readonly codes = DataErrorCodes;

  /**
   * Attaches or merges extra context to the error, returning a new `DataError`
   * instance.
   *
   * @param extra - Additional context to merge
   * @returns A new `DataError` with merged context
   */
  public withContext(extra: ErrorContext): DataError {
    return new DataError(this.message, {
      code: this.code,
      status: this.status,
      cause: this.cause,
      isOperational: this.isOperational,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Type guard to detect a `DataError` instance.
   *
   * @param err - Error to check
   * @returns `true` if the error is a `DataError`
   */
  public static is(err: unknown): err is DataError {
    return err instanceof DataError;
  }

  /**
   * Creates a `DataError` from an unknown value, preserving structure and
   * context.
   *
   * @param err - Unknown error-like value
   * @param message - Error message override
   * @param context - Optional context to merge
   * @returns A `DataError` instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): DataError {
    if (err instanceof DataError) {
      return message || context
        ? new DataError(message ?? err.message, {
            code: err.code,
            status: err.status,
            cause: err.cause,
            isOperational: err.isOperational,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }
    if (err instanceof AppError) {
      return new DataError(message ?? err.message, {
        code: err.code,
        status: err.status,
        cause: err,
        isOperational: err.isOperational ?? true,
        context: { ...(err.context ?? {}), ...(context ?? {}) },
      });
    }
    if (err instanceof Error) {
      return new DataError(message ?? err.message, { cause: err, context });
    }
    return new DataError(message ?? "Data error", { cause: err, context });
  }

  /**
   * Helper to create a validation error as `DataError` subtype.
   *
   * @param message - Error message
   * @param options - Error options
   * @returns A new `ValidationError` instance
   */
  public static validation(message = "Data validation error", options: AppErrorOptions = {}) {
    return new ValidationError(message, {
      code: options.code ?? DataErrorCodes.VALIDATION_ERROR,
      ...options,
      isOperational: options.isOperational ?? true,
      status: options.status ?? 400,
    });
  }

  /**
   * Helper to create a transformation error as `DataError` subtype.
   *
   * @param message - Error message
   * @param options - Error options
   * @returns A new `TransformationError` instance
   */
  public static transformation(
    message = "Data transformation error",
    options: AppErrorOptions = {},
  ) {
    return new TransformationError(message, {
      code: options.code ?? DataErrorCodes.TRANSFORMATION_ERROR,
      ...options,
      isOperational: options.isOperational ?? true,
      status: options.status ?? 500,
    });
  }

  /**
   * Helper to create a parse error as `DataError`.
   *
   * @param message - Error message
   * @param options - Error options
   * @returns A new `DataError` instance
   */
  public static parse(message = "Data parse error", options: AppErrorOptions = {}) {
    return new DataError(message, {
      code: options.code ?? DataErrorCodes.PARSE_ERROR,
      ...options,
      isOperational: options.isOperational ?? true,
      status: options.status ?? 400,
    });
  }
}

/**
 * An error for when input data fails validation checks.
 */
export class ValidationError extends DataError {
  /**
   * Creates an instance of `ValidationError`.
   *
   * @param message - Error message
   * @param options - Error options
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "ValidationError";
  }

  /**
   * Attaches or merges extra context to the error, returning a new
   * `ValidationError` instance.
   *
   * @param extra - Additional context to merge
   * @returns A new `ValidationError` with merged context
   */
  public withContext(extra: ErrorContext): ValidationError {
    return new ValidationError(this.message, {
      code: this.code ?? DataErrorCodes.VALIDATION_ERROR,
      status: this.status ?? 400,
      cause: this.cause,
      isOperational: this.isOperational,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Create a `ValidationError` from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A `ValidationError` instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): ValidationError {
    if (err instanceof ValidationError) {
      return message || context
        ? new ValidationError(message ?? err.message, {
            code: err.code ?? DataErrorCodes.VALIDATION_ERROR,
            status: err.status ?? 400,
            cause: err.cause,
            isOperational: err.isOperational ?? true,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }
    if (err instanceof AppError) {
      return new ValidationError(message ?? err.message, {
        code: err.code ?? DataErrorCodes.VALIDATION_ERROR,
        status: err.status ?? 400,
        cause: err,
        isOperational: err.isOperational ?? true,
        context: { ...(err.context ?? {}), ...(context ?? {}) },
      });
    }
    if (err instanceof Error) {
      return new ValidationError(message ?? err.message, {
        code: DataErrorCodes.VALIDATION_ERROR,
        status: 400,
        cause: err,
        isOperational: true,
        context,
      });
    }
    return new ValidationError(message ?? "Data validation error", {
      code: DataErrorCodes.VALIDATION_ERROR,
      status: 400,
      isOperational: true,
      cause: err,
      context,
    });
  }

  /**
   * Guard: throws `ValidationError` if condition is falsy.
   *
   * @param condition - Condition to check
   * @param message - Error message
   * @param options - Error options
   */
  public static ensure(
    condition: unknown,
    message = "Data validation error",
    options: AppErrorOptions = {},
  ): asserts condition {
    if (!condition) {
      throw DataError.validation(message, options);
    }
  }

  /**
   * Guard: requires a non-nullish value, otherwise throws `ValidationError`.
   *
   * @param value - Value to check
   * @param message - Error message
   * @param options - Error options
   * @returns The non-nullish value
   */
  public static require<T>(
    value: T | null | undefined,
    message = "Data validation error",
    options: AppErrorOptions = {},
  ): NonNullable<T> {
    if (value == null) {
      throw DataError.validation(message, options);
    }
    return value as NonNullable<T>;
  }
}

/**
 * An error for when data processing or transformation logic fails.
 */
export class TransformationError extends DataError {
  /**
   * Creates an instance of `TransformationError`.
   *
   * @param message - Error message
   * @param options - Error options
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "TransformationError";
  }

  /**
   * Attaches or merges extra context to the error, returning a new
   * `TransformationError` instance.
   *
   * @param extra - Additional context to merge
   * @returns A new `TransformationError` with merged context
   */
  public withContext(extra: ErrorContext): TransformationError {
    return new TransformationError(this.message, {
      code: this.code ?? DataErrorCodes.TRANSFORMATION_ERROR,
      status: this.status ?? 500,
      cause: this.cause,
      isOperational: this.isOperational,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Create a `TransformationError` from an unknown input.
   *
   * @param err - Error to convert
   * @param message - Error message
   * @param context - Optional context to merge
   * @returns A `TransformationError` instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): TransformationError {
    if (err instanceof TransformationError) {
      return message || context
        ? new TransformationError(message ?? err.message, {
            code: err.code ?? DataErrorCodes.TRANSFORMATION_ERROR,
            status: err.status ?? 500,
            cause: err.cause,
            isOperational: err.isOperational ?? true,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }
    if (err instanceof AppError) {
      return new TransformationError(message ?? err.message, {
        code: err.code ?? DataErrorCodes.TRANSFORMATION_ERROR,
        status: err.status ?? 500,
        cause: err,
        isOperational: err.isOperational ?? true,
        context: { ...(err.context ?? {}), ...(context ?? {}) },
      });
    }
    if (err instanceof Error) {
      return new TransformationError(message ?? err.message, {
        code: DataErrorCodes.TRANSFORMATION_ERROR,
        status: 500,
        cause: err,
        isOperational: true,
        context,
      });
    }
    return new TransformationError(message ?? "Data transformation error", {
      code: DataErrorCodes.TRANSFORMATION_ERROR,
      status: 500,
      isOperational: true,
      cause: err,
      context,
    });
  }
}
