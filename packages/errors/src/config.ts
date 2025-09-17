/**
 * @fileoverview Configuration error types, codes, and helpers.
 *
 * Provides `ConfigurationError` and related constants/utilities for config parsing,
 * validation, and presence guards.
 */

import { AppError, AppErrorOptions, type ErrorContext } from "./base.js";

/** Centralized configuration error code constants. */
export const ConfigErrorCodes = {
  /** Generic parse/format failure while loading configuration. */
  PARSE: "ERR_CONFIG_PARSE",
  /** Required configuration is missing. */
  MISSING: "ERR_CONFIG_MISSING",
  /** Configuration present but invalid against schema/constraints. */
  INVALID: "ERR_CONFIG_INVALID",
  /** Required environment variable missing or empty. */
  ENV_MISSING: "ERR_ENV_MISSING",
} as const;

export type ConfigErrorCode = (typeof ConfigErrorCodes)[keyof typeof ConfigErrorCodes];

// Named exports for ergonomic imports in consumers
export const ERR_CONFIG_PARSE = ConfigErrorCodes.PARSE;
export const ERR_CONFIG_MISSING = ConfigErrorCodes.MISSING;
export const ERR_CONFIG_INVALID = ConfigErrorCodes.INVALID;
export const ERR_ENV_MISSING = ConfigErrorCodes.ENV_MISSING;

/**
 * An error for missing or invalid application configuration.
 * This is a non-operational error, as it typically requires a code or configuration change to fix.
 */
export class ConfigurationError extends AppError {
  /**
   * Creates an instance of ConfigurationError.
   *
   * By default, configuration errors are considered non-operational
   * (they usually require a code or deployment fix). Specific helpers
   * may override this default where appropriate.
   *
   * @param message - Error message
   * @param options - Error options
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    const { isOperational, ...rest } = options;
    super(message, { ...rest, isOperational: isOperational ?? false });
    this.name = "ConfigurationError";
  }

  /**
   * Exposes configuration error codes for discoverability and IntelliSense.
   * Useful for consumers to reference standardized `code` values.
   */
  public static readonly codes = ConfigErrorCodes;

  /**
   * Attaches or merges extra context to the error, returning a new ConfigurationError instance.
   *
   * @param extra - Additional context to merge into the error's context
   * @returns A new ConfigurationError with merged context
   */
  public withContext(extra: ErrorContext): ConfigurationError {
    return new ConfigurationError(this.message, {
      code: this.code,
      status: this.status,
      cause: this.cause,
      isOperational: this.isOperational,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  /**
   * Type guard to detect a ConfigurationError instance.
   *
   * @param err - Unknown value to test
   * @returns True if `err` is a ConfigurationError
   */
  public static is(err: unknown): err is ConfigurationError {
    return err instanceof ConfigurationError;
  }

  /**
   * Creates a ConfigurationError from an unknown value, preserving structure and context.
   *
   * - Reuses an existing ConfigurationError instance when appropriate
   * - Converts other AppError instances while preserving details
   * - Wraps native Error or non-error values as the cause
   *
   * @param err - Unknown error-like value
   * @param message - Optional override message
   * @param context - Optional context to merge
   * @returns A ConfigurationError instance
   */
  public static from(err: unknown, message?: string, context?: ErrorContext): ConfigurationError {
    if (err instanceof ConfigurationError) {
      return message || context
        ? new ConfigurationError(message ?? err.message, {
            code: err.code,
            status: err.status,
            cause: err.cause,
            isOperational: err.isOperational,
            context: { ...(err.context ?? {}), ...(context ?? {}) },
          })
        : err;
    }
    if (err instanceof AppError) {
      return new ConfigurationError(message ?? err.message, {
        code: err.code ?? ConfigErrorCodes.INVALID,
        status: err.status,
        cause: err,
        isOperational: err.isOperational,
        context: { ...(err.context ?? {}), ...(context ?? {}) },
      });
    }
    if (err instanceof Error) {
      return new ConfigurationError(message ?? err.message, {
        cause: err,
        context,
      });
    }
    return new ConfigurationError(message ?? "Unknown configuration error", {
      cause: err,
      context,
    });
  }

  /**
   * Converts an unknown error into a parse-related ConfigurationError and enriches context.
   * Adds a `reason` field when `err` is an Error or non-nullish.
   *
   * @param err - Unknown error-like value
   * @param message - Optional override message
   * @param context - Optional context to merge
   * @returns A ConfigurationError with parse semantics
   */
  public static parseFrom(err: unknown, message?: string, context?: ErrorContext) {
    const reason = err instanceof Error ? err.message : err != null ? String(err) : undefined;
    return ConfigurationError.parse(
      message ?? (reason ? `Configuration parse error: ${reason}` : undefined),
      {
        cause: err,
        context: reason ? { ...(context ?? {}), reason } : context,
      },
    );
  }

  /**
   * Parsing/format error while loading or interpreting configuration.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A ConfigurationError with code ERR_CONFIG_PARSE and status 400
   *
   * @example
   * throw ConfigurationError.parse("Failed to load test configurations", {
   *   context: { domain: "config", component: "configuration", source: "main.loadTestConfigurations", reason: "bad JSON" },
   *   cause: err,
   * })
   */
  public static parse(message = "Configuration parse error", options: AppErrorOptions = {}) {
    return new ConfigurationError(message, {
      code: options.code ?? ConfigErrorCodes.PARSE,
      ...options,
      // Parsing failures are generally non-operational (deployment/config fix)
      isOperational: options.isOperational ?? false,
      status: options.status ?? 400,
    });
  }

  /**
   * A required environment variable is missing or empty.
   * Typically considered operational since it can be fixed by deployment config.
   *
   * @param name - Environment variable name
   * @param message - Error message
   * @param options - Additional error options
   * @returns A ConfigurationError with code ERR_ENV_MISSING
   */
  public static missingEnv(
    name: string,
    message = "Missing required environment variable",
    options: AppErrorOptions = {},
  ) {
    return new ConfigurationError(message, {
      code: options.code ?? ConfigErrorCodes.ENV_MISSING,
      context: { ...(options.context ?? {}), name, domain: "env" },
      cause: options.cause,
      status: options.status ?? 500,
      // Mark as operational to allow graceful handling in some contexts
      isOperational: options.isOperational ?? true,
    });
  }

  /**
   * A required configuration value/section is missing.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A ConfigurationError with code ERR_CONFIG_MISSING
   */
  public static missing(message = "Configuration is missing", options: AppErrorOptions = {}) {
    return new ConfigurationError(message, {
      code: options.code ?? ConfigErrorCodes.MISSING,
      ...options,
      isOperational: options.isOperational ?? false,
      status: options.status ?? 500,
    });
  }

  /**
   * A configuration path/key could not be found.
   *
   * @param path - Configuration path that was not found
   * @param message - Error message
   * @param options - Additional error options
   * @returns A ConfigurationError with code ERR_CONFIG_MISSING and status 404
   */
  public static notFound(
    path: string,
    message = "Configuration value not found",
    options: AppErrorOptions = {},
  ) {
    return new ConfigurationError(message, {
      code: options.code ?? ConfigErrorCodes.MISSING,
      context: { ...(options.context ?? {}), path, domain: "config", component: "configuration" },
      cause: options.cause,
      status: options.status ?? 404,
      isOperational: options.isOperational ?? false,
    });
  }

  /**
   * Configuration is present but invalid according to schema/constraints.
   *
   * @param message - Error message
   * @param options - Additional error options
   * @returns A ConfigurationError with code ERR_CONFIG_INVALID and status 400
   */
  public static invalid(message = "Invalid configuration", options: AppErrorOptions = {}) {
    return new ConfigurationError(message, {
      code: options.code ?? ConfigErrorCodes.INVALID,
      ...options,
      isOperational: options.isOperational ?? false,
      status: options.status ?? 400,
    });
  }

  /**
   * Global configuration/singleton not initialized.
   *
   * @param source - Name of the accessor or factory where initialization was expected
   * @param message - Error message
   * @param options - Additional error options
   * @returns A ConfigurationError with code ERR_CONFIG_MISSING
   */
  public static uninitialized(
    source?: string,
    message = "Global configuration is not initialized",
    options: AppErrorOptions = {},
  ) {
    return new ConfigurationError(message, {
      code: options.code ?? ConfigErrorCodes.MISSING,
      context: {
        ...(options.context ?? {}),
        domain: "config",
        component: "configuration",
        ...(source ? { source } : {}),
      },
      cause: options.cause,
      status: options.status ?? 500,
      isOperational: options.isOperational ?? false,
    });
  }

  /**
   * Failed to resolve a configuration reference (e.g., ${env:VAR}, $ref path).
   *
   * @param reason - Optional human-readable description of the failure reason
   * @param message - Error message
   * @param options - Additional error options
   * @returns A ConfigurationError with code ERR_CONFIG_PARSE and status 400
   */
  public static referenceResolution(
    reason?: string,
    message = "Failed to resolve configuration reference",
    options: AppErrorOptions = {},
  ) {
    return new ConfigurationError(message, {
      code: options.code ?? ConfigErrorCodes.PARSE,
      context: {
        ...(options.context ?? {}),
        domain: "config",
        component: "configuration",
        ...(reason ? { reason } : {}),
      },
      cause: options.cause,
      status: options.status ?? 400,
      isOperational: options.isOperational ?? false,
    });
  }

  /**
   * Guard: throws ConfigurationError.invalid if the condition is falsy.
   *
   * @param condition - Condition to assert
   * @param message - Error message when assertion fails
   * @param options - Additional error options
   * @throws {ConfigurationError}
   */
  public static ensure(
    condition: unknown,
    message = "Invalid configuration",
    options: AppErrorOptions = {},
  ): asserts condition {
    if (!condition) {
      throw ConfigurationError.invalid(message, options);
    }
  }

  /**
   * Guard: requires a non-nullish value, otherwise throws ConfigurationError.missing.
   * Returns the value when present for inline use.
   *
   * @param value - The value to assert non-nullish
   * @param message - Error message when assertion fails
   * @param options - Additional error options
   * @returns The asserted non-nullish value
   * @throws {ConfigurationError}
   */
  public static require<T>(
    value: T | null | undefined,
    message = "Configuration is missing",
    options: AppErrorOptions = {},
  ): NonNullable<T> {
    if (value == null) {
      throw ConfigurationError.missing(message, options);
    }
    return value as NonNullable<T>;
  }
}
