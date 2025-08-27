import AppError from "@fabianopinto/errors";
import pino, { Logger as PinoLogger, LoggerOptions as PinoOptions } from "pino";

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug" | "trace";

export interface LoggerFields {
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, fields?: LoggerFields): void;
  info(msg: string, fields?: LoggerFields): void;
  warn(msg: string, fields?: LoggerFields): void;
  error(err: unknown, msg?: string, fields?: LoggerFields): void;
  /** Create a child logger with bound fields */
  child(bindings: LoggerFields): Logger;
}

export interface CreateLoggerOptions {
  level?: LogLevel;
  base?: LoggerFields | null;
  pino?: PinoOptions;
}

/**
 * Create a logger backed by pino but exposing a minimal, clean interface.
 */
export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const {
    level = (process.env.LOG_LEVEL as LogLevel) || "info",
    base,
    pino: pinoOpts,
  } = opts;

  const instance: PinoLogger = pino({
    level,
    base: base === undefined ? { pid: process.pid, hostname: undefined } : base,
    ...pinoOpts,
  });

  const wrap = (l: PinoLogger): Logger => ({
    debug: (msg, fields) => l.debug(fields ?? {}, msg),
    info: (msg, fields) => l.info(fields ?? {}, msg),
    warn: (msg, fields) => l.warn(fields ?? {}, msg),
    error: (err: unknown, msg?: string, fields?: LoggerFields) => {
      const payload = { ...(fields ?? {}), ...adaptError(err) };
      l.error(payload, msg ?? extractMessage(err) ?? "Error");
    },
    child: (bindings: LoggerFields) => wrap(l.child(bindings)),
  });

  return wrap(instance);
}

/**
 * Adapter that normalizes unknown errors into structured log fields.
 */
export function adaptError(err: unknown): LoggerFields {
  if (err instanceof AppError) {
    return { err: err.toJSON() };
  }
  if (err instanceof Error) {
    return {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    };
  }
  // Non-error values
  return { err: err };
}

function extractMessage(err: unknown): string | undefined {
  if (err instanceof AppError || err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return undefined;
}

export default createLogger;
