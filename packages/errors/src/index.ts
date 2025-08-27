export type ErrorContext = Record<string, unknown>;

export interface AppErrorOptions {
  cause?: unknown;
  context?: ErrorContext;
  code?: string;
  status?: number; // HTTP-like status code if useful to callers
}

/**
 * AppError is a reusable error type that preserves the original cause and
 * carries structured context for diagnostics and observability.
 */
export class AppError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly context?: ErrorContext;
  public readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    // Pass cause to native Error so it's visible in stacks where supported
    super(
      message,
      options.cause !== undefined ? { cause: options.cause as any } : undefined
    );

    this.name = "AppError";
    // Fix prototype when targeting ES5/older transpilation scenarios
    Object.setPrototypeOf(this, new.target.prototype);

    this.code = options.code;
    this.status = options.status;
    this.context = options.context;
    this.cause = options.cause;
  }

  /** Attach/merge extra context, returning a new AppError (immutability). */
  withContext(extra: ErrorContext): AppError {
    return new AppError(this.message, {
      code: this.code,
      status: this.status,
      cause: this.cause,
      context: { ...(this.context ?? {}), ...extra },
    });
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      context: this.context,
      // Serialize cause in a safe way without risking circular refs
      cause: serializeCause(this.cause),
      stack: this.stack,
    };
  }

  static from(
    err: unknown,
    message?: string,
    context?: ErrorContext
  ): AppError {
    if (err instanceof AppError) {
      return message || context
        ? new AppError(message ?? err.message, {
            code: err.code,
            status: err.status,
            cause: err.cause,
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

export default AppError;
