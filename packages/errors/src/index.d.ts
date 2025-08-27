export type ErrorContext = Record<string, unknown>;
export interface AppErrorOptions {
  cause?: unknown;
  context?: ErrorContext;
  code?: string;
  status?: number;
}
/**
 * AppError is a reusable error type that preserves the original cause and
 * carries structured context for diagnostics and observability.
 */
export declare class AppError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly context?: ErrorContext;
  readonly cause?: unknown;
  constructor(message: string, options?: AppErrorOptions);
  /** Attach/merge extra context, returning a new AppError (immutability). */
  withContext(extra: ErrorContext): AppError;
  toJSON(): {
    name: string;
    message: string;
    code: string | undefined;
    status: number | undefined;
    context: ErrorContext | undefined;
    cause: unknown;
    stack: string | undefined;
  };
  static from(err: unknown, message?: string, context?: ErrorContext): AppError;
}
