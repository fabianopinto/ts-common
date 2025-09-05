/**
 * @fileoverview Logger module for structured logging built on Pino.
 *
 * This module defines the interface and implementation for logging operations throughout the application.
 * It provides a consistent API for structured logging with different severity levels
 * and contextual information.
 *
 * Features:
 * - Standard log levels (trace, debug, info, warn, error, fatal)
 * - Structured logging with context objects
 * - Child logger creation for component-specific logging
 * - Runtime log level configuration
 * - High-performance structured JSON logging
 * - Environment-aware configuration (pretty printing in dev)
 * - Error serialization
 */

import { AppError } from "@fabianopinto/errors";
import { createRequire } from "module";
import pino from "pino";

const require = createRequire(import.meta.url);

/**
 * Log level type alias for external consumers.
 *
 * Mirrors `pino.Level` so you can import a stable level type from this package
 * without depending on Pino types directly.
 *
 * Valid values: "fatal" | "error" | "warn" | "info" | "debug" | "trace"
 * @public
 *
 * @example
 * import { logger, type Level } from "@fabianopinto/logger";
 * const level: Level = "info";
 * logger.setLevel(level);
 */
export type LogLevel = pino.Level;

/**
 * Helper levels used to validate inputs when normalizing a log level.
 * @internal
 */
const VALID_LEVELS: readonly LogLevel[] = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
] as const;

/**
 * Normalizes an unknown value to a valid Pino level, falling back when invalid.
 * @param value - The incoming level value, typically from env or options.
 * @param fallback - The default level to use when value is invalid.
 * @returns A valid Pino level.
 * @internal
 */
function normalizeLevel(value: unknown, fallback: LogLevel): LogLevel {
  if (typeof value === "string" && (VALID_LEVELS as readonly string[]).includes(value)) {
    return value as LogLevel;
  }
  return fallback;
}

/**
 * Logger interface for structured application logging
 *
 * Defines a consistent logging API that can be implemented using various
 * logging libraries. The current implementation uses Pino for high-performance
 * structured logging.
 * @public
 */
export interface Logger {
  /**
   * Create a child logger with additional context
   *
   * Child loggers inherit settings from their parent but include
   * additional context information with each log message.
   * @param bindings - Context properties to include with every log message
   * @return A new child logger instance with the provided context
   *
   * @example
   * // Create a component-specific child logger
   * const componentLogger = logger.child({ component: "auth" });
   * componentLogger.info("User authenticated"); // logs with component="auth"
   */
  child(bindings: Record<string, unknown>): Logger;

  /**
   * Check if a specific log level is enabled
   *
   * Useful for avoiding expensive operations when a particular
   * log level is not enabled.
   * @param level - The log level to check
   * @return True if the level is enabled, false otherwise
   *
   * @example
   * if (logger.isLevelEnabled("debug")) {
   *   // Only perform expensive debug operations if debug logging is enabled
   *   const debugData = generateExpensiveDebugData();
   *   logger.debug({ data: debugData }, "Debug info");
   * }
   */
  isLevelEnabled(level: LogLevel): boolean;

  /**
   * Set the logger level
   *
   * Changes the minimum level at which logs will be output.
   * @param level - The new minimum log level
   *
   * @example
   * // Set logger to only output warnings and above
   * logger.setLevel("warn");
   */
  setLevel(level: LogLevel): void;

  /**
   * Log a trace message
   *
   * For very detailed diagnostic information (more verbose than debug).
   * @param obj - Optional context object to include with the message
   * @param msg - The log message
   * @param ...args - Optional format arguments (printf-style)
   *
   * @example
   * logger.trace({ requestId }, "Processing request");
   * logger.trace("Value is %d", value);
   */
  trace: pino.LogFn;

  /**
   * Log a debug message
   *
   * For diagnostic information useful during development and troubleshooting.
   * @param obj - Optional context object to include with the message
   * @param msg - The log message
   * @param ...args - Optional format arguments (printf-style)
   *
   * @example
   * logger.debug({ user: "john" }, "User session created");
   * logger.debug("Debug value: %j", complexObject);
   */
  debug: pino.LogFn;

  /**
   * Log an info message
   *
   * For general information about application operation.
   * @param obj - Optional context object to include with the message
   * @param msg - The log message
   * @param ...args - Optional format arguments (printf-style)
   *
   * @example
   * logger.info({ feature: "login" }, "Feature enabled");
   * logger.info("Application started on port %d", port);
   */
  info: pino.LogFn;

  /**
   * Log a warning message
   *
   * For potentially problematic situations that don't cause errors.
   * @param obj - Optional context object to include with the message
   * @param msg - The log message
   * @param ...args - Optional format arguments (printf-style)
   *
   * @example
   * logger.warn({ attemptCount: 3 }, "Retry limit approaching");
   * logger.warn("Resource usage at %d%%", usagePercent);
   */
  warn: pino.LogFn;

  /**
   * Log an error message
   *
   * For error conditions that affect operation but don't stop the application.
   * @param obj - Optional context object (including error) to include with the message
   * @param msg - The log message
   * @param ...args - Optional format arguments (printf-style)
   *
   * @example
   * try {
   *   // Some operation
   * } catch (error) {
   *   logger.error({ error }, "Operation failed");
   * }
   * logger.error("Failed to connect to %s", serviceUrl);
   */
  error: pino.LogFn;

  /**
   * Log a fatal message
   *
   * For severe error conditions that will likely lead to application termination.
   * @param obj - Optional context object (including error) to include with the message
   * @param msg - The log message
   * @param ...args - Optional format arguments (printf-style)
   *
   * @example
   * logger.fatal({ error }, "System failure, shutting down");
   * logger.fatal("Critical resource unavailable: %s", resourceName);
   */
  fatal: pino.LogFn;
}

/**
 * Logger configuration options
 *
 * Defines options for configuring logger instances including
 * log level, name, and other Pino-specific settings.
 * @public
 */
export interface LoggerOptions {
  /**
   * The minimum log level to output
   */
  level?: LogLevel;

  /**
   * Name for the logger instance (included in log output)
   */
  name?: string;

  /**
   * Whether to enable pretty printing (defaults to development environment)
   * If enabled but 'pino-pretty' is not installed, the logger will fall back to JSON output.
   */
  pretty?: boolean;

  /**
   * Additional base context to include with all logs
   */
  base?: Record<string, unknown>;
}

/**
 * Default logger options used to initialize the logger.
 * @internal
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  // pretty default will be finalized at construction time based on NODE_ENV
  pretty: true,
};

/**
 * Creates Pino transport configuration based on options
 * @param options - Logger configuration options
 * @returns Pino transport configuration
 * @internal
 */
function createTransport(options: LoggerOptions) {
  if (options.pretty) {
    // Only enable pretty transport if pino-pretty is available
    try {
      // Will throw if not installed in the consumer's environment
      require.resolve("pino-pretty");
      return {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      };
    } catch {
      // Fallback to JSON output
    }
  }
  return {};
}

/**
 * Base logger implementation using Pino
 *
 * Implements the Logger interface using Pino for high-performance
 * structured logging with support for different environments.
 * @public
 * @class BaseLogger
 * @implements {Logger}
 */
export class BaseLogger implements Logger {
  private logger: pino.Logger;
  public trace: pino.LogFn;
  public debug: pino.LogFn;
  public info: pino.LogFn;
  public warn: pino.LogFn;
  public error: pino.LogFn;
  public fatal: pino.LogFn;

  /**
   * Create a new logger instance
   * @param options - Configuration options for the logger
   */
  constructor(options?: LoggerOptions) {
    // Resolve options at construction time to pick up environment changes
    const level = normalizeLevel(
      options?.level ?? process.env.LOG_LEVEL ?? DEFAULT_OPTIONS.level,
      "info",
    );
    const pretty = options?.pretty ?? process.env.NODE_ENV !== "production";
    const name = options?.name ?? DEFAULT_OPTIONS.name ?? "smoker";
    const base = options?.base ?? DEFAULT_OPTIONS.base ?? { pid: process.pid };

    const mergedOptions = {
      level,
      pretty,
      name,
      base,
    };

    const transport = createTransport(mergedOptions);

    this.logger = pino({
      level: mergedOptions.level,
      name: mergedOptions.name,
      base: mergedOptions.base,
      ...transport,
      // Ensure error objects are consistently captured under `error` so the serializer applies.
      hooks: {
        logMethod(inputArgs, method) {
          // Per Pino types, inputArgs always has at least one element
          const [first, ...rest] = inputArgs as unknown[];

          // If first arg is an Error/AppError, wrap into an object so our serializer runs.
          if (first instanceof Error) {
            return (method as (...a: unknown[]) => unknown).apply(this, [
              { error: first },
              ...rest,
            ]);
          }

          // If first arg is an object with an `error` field that is an Error/AppError, leave as-is.
          if (first && typeof first === "object" && "error" in (first as Record<string, unknown>)) {
            return (method as (...a: unknown[]) => unknown).apply(this, [first, ...rest]);
          }

          return (method as (...a: unknown[]) => unknown).apply(this, inputArgs as unknown[]);
        },
      },
      serializers: {
        error: (err: unknown) => {
          if (err instanceof AppError) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
            return err.toJSON();
          }
          if (err instanceof Error) {
            return pino.stdSerializers.err(err);
          }
          return err;
        },
      },
    });

    // Bind pino log functions to preserve correct `this`
    this.trace = this.logger.trace.bind(this.logger);
    this.debug = this.logger.debug.bind(this.logger);
    this.info = this.logger.info.bind(this.logger);
    this.warn = this.logger.warn.bind(this.logger);
    this.error = this.logger.error.bind(this.logger);
    this.fatal = this.logger.fatal.bind(this.logger);
  }

  /**
   * Create a child logger with additional context
   * @param bindings - Context to include with every log from this child
   * @returns A new child logger instance
   */
  child(bindings: Record<string, unknown>): Logger {
    const childLogger = new BaseLogger();
    const childPino = this.logger.child(bindings);
    childLogger.logger = childPino;
    // Rebind methods to the child pino instance
    childLogger.trace = childPino.trace.bind(childPino);
    childLogger.debug = childPino.debug.bind(childPino);
    childLogger.info = childPino.info.bind(childPino);
    childLogger.warn = childPino.warn.bind(childPino);
    childLogger.error = childPino.error.bind(childPino);
    childLogger.fatal = childPino.fatal.bind(childPino);
    return childLogger;
  }

  /**
   * Check if a log level is enabled
   * @param level - The log level to check
   * @returns True if the level is enabled, false otherwise
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.logger.isLevelEnabled(level);
  }

  /**
   * Set the minimum log level
   * @param level - The new minimum log level
   */
  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  // Log methods are provided by bound pino.LogFn properties
}

/**
 * Default logger instance for convenience
 * @public
 */
export const logger = new BaseLogger();
