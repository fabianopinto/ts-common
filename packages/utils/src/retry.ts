/**
 * @fileoverview Retry Utilities
 *
 * Provides retry helpers with configurable backoff strategies for wrapping async operations
 * that may fail transiently (e.g., network calls, eventual consistency checks).
 *
 * Design:
 * - Uses the shared `logger` for safe failure logging (warn level)
 * - Inspired by the Python `tenacity` library.
 */

import { logger } from "@fabianopinto/logger";

/**
 * Backoff strategies used to compute per-attempt delays between retries.
 *
 * - `fixed`: Constant delay on each retry.
 * - `exponential`: Delay doubles each attempt.
 * - `exponential-jitter`: Exponential with random jitter (+/- ratio).
 */
export type BackoffStrategy = "fixed" | "exponential" | "exponential-jitter";

/**
 * Options for retry operations.
 */
export interface RetryOptions {
  /** Number of retries after the first attempt (total attempts = retries + 1). */
  retries?: number;
  /** Base delay in milliseconds used by backoff calculation. */
  delayMs?: number;
  /** Optional maximum cap for per-attempt delays. */
  maxDelayMs?: number;
  /** Backoff strategy to use for computing successive delays. */
  backoff?: BackoffStrategy;
  /** Jitter ratio (0..1) used when backoff = "exponential-jitter". */
  jitterRatio?: number;
  /**
   * Optional callback invoked on each attempt error before delaying.
   *
   * @param error - The error that occurred.
   * @param attempt - The current attempt number.
   * @returns A promise that resolves when the callback is complete.
   */
  onAttemptError?: (error: unknown, attempt: number) => void | Promise<void>;
  /** Optional AbortSignal to cancel retries and abort the operation. */
  signal?: AbortSignal;
  /**
   * Predicate to decide whether an error should be retried.
   * Return false to stop retrying and rethrow immediately.
   *
   * @param error - The error that occurred.
   * @param attempt - The current attempt number.
   * @returns True if the error should be retried, false otherwise.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean | Promise<boolean>;
}

/**
 * Resolved options with defaults applied, keeping signal/shouldRetry optional.
 */
type ResolvedRetryOptions = Omit<Required<RetryOptions>, "signal" | "shouldRetry"> & {
  signal?: AbortSignal;
  shouldRetry?: NonNullable<RetryOptions["shouldRetry"]>;
};

/**
 * Error thrown when retry attempts are exhausted.
 *
 * Includes the number of attempts performed, the resolved options used, and the
 * original cause (if any) for improved observability and handling.
 */
export class RetryExhaustedError extends Error {
  public readonly attempts: number;
  public readonly options: ResolvedRetryOptions;
  public readonly cause?: unknown;

  /**
   * Creates a new RetryExhaustedError.
   *
   * @param message - The error message.
   * @param attempts - The number of attempts performed.
   * @param options - The resolved retry options used.
   * @param cause - The original cause of the error (if any).
   */
  public constructor(
    message: string,
    attempts: number,
    options: ResolvedRetryOptions,
    cause?: unknown,
  ) {
    super(message);
    this.name = "RetryExhaustedError";
    this.attempts = attempts;
    this.options = options;
    this.cause = cause;
  }
}

const DEFAULTS: Omit<ResolvedRetryOptions, "maxDelayMs"> & {
  maxDelayMs: number | undefined;
  onAttemptError?: RetryOptions["onAttemptError"];
} = {
  retries: 3,
  delayMs: 200,
  maxDelayMs: undefined,
  backoff: "exponential",
  jitterRatio: 0.25,
  onAttemptError: (error, attempt) => {
    logger.warn({ attempt, error }, "retry-utils: attempt failed");
  },
};

/**
 * Sleep for a specified duration.
 *
 * @param ms - The duration in milliseconds to sleep.
 * @returns A promise that resolves after the specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Calculate the next delay based on the retry options.
 *
 * @param base - The base delay in milliseconds.
 * @param attempt - The current attempt number.
 * @param opts - The resolved retry options.
 * @returns The next delay in milliseconds.
 */
function nextDelay(base: number, attempt: number, opts: ResolvedRetryOptions): number {
  const { backoff, jitterRatio } = opts;
  let delay = base;
  switch (backoff) {
    case "fixed":
      delay = base;
      break;
    case "exponential":
      delay = base * 2 ** (attempt - 1);
      break;
    case "exponential-jitter": {
      const raw = base * 2 ** (attempt - 1);
      const jitter = raw * jitterRatio;
      const min = Math.max(0, raw - jitter);
      const max = raw + jitter;
      delay = Math.floor(min + Math.random() * (max - min));
      break;
    }
  }
  return delay;
}

export const RetryUtils = {
  /**
   * Retries an async function according to the provided options.
   *
   * @typeParam T - The return type of the operation
   * @param operation - Async function to execute
   * @param options - Retry options controlling attempts and backoff
   * @returns Resolves with the operation result or rejects after exhausting attempts
   * @throws {RetryExhaustedError} When all retry attempts are exhausted
   * @throws {Error} AbortError when options.signal aborts during execution
   *
   * @example
   * const result = await RetryUtils.retryAsync(() => fetchThing(), {
   *   retries: 4,
   *   delayMs: 200,
   *   backoff: "exponential-jitter",
   *   maxDelayMs: 5_000,
   *   onAttemptError: (err, attempt) => logger.warn({ attempt, err }, "retrying"),
   * });
   */
  async retryAsync<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const opts: ResolvedRetryOptions = { ...DEFAULTS, ...options } as ResolvedRetryOptions;
    let attempt = 0;
    const totalAttempts = Math.max(1, (options.retries ?? DEFAULTS.retries) + 1);
    const { signal } = options;

    const throwAbort = () => {
      const err =
        options.signal?.reason instanceof Error
          ? options.signal.reason
          : new Error("Operation aborted");
      (err as Error).name = (err as Error).name || "AbortError";
      throw err;
    };

    while (true) {
      attempt += 1;
      if (signal?.aborted) throwAbort();
      if (logger.isLevelEnabled("trace")) {
        logger.trace({ attempt, totalAttempts, opts }, "retry-utils: starting attempt");
      }
      try {
        const result = await operation();
        if (logger.isLevelEnabled("debug")) {
          logger.debug({ attempt }, "retry-utils: attempt succeeded");
        }
        return result;
      } catch (err) {
        if (logger.isLevelEnabled("debug")) {
          logger.debug({ attempt, totalAttempts, err }, "retry-utils: attempt failed");
        }
        if (signal?.aborted) throwAbort();
        if (opts.shouldRetry) {
          const retryable = await opts.shouldRetry(err, attempt);
          if (!retryable) throw err;
        }
        if (opts.onAttemptError) await opts.onAttemptError(err, attempt);
        if (attempt >= totalAttempts) {
          throw new RetryExhaustedError("Retry attempts exhausted", attempt, opts, err);
        }
        let delay = nextDelay(opts.delayMs, attempt, opts);
        const capped = opts.maxDelayMs != null && delay > (opts.maxDelayMs as number);
        if (opts.maxDelayMs != null) delay = Math.min(delay, opts.maxDelayMs as number);
        if (logger.isLevelEnabled("debug")) {
          logger.debug(
            { attempt, nextDelayMs: delay, wasCapped: capped },
            "retry-utils: sleeping before next attempt",
          );
        }
        // Sleep with abort support
        const sleepPromise = sleep(delay);
        if (signal) {
          await Promise.race([
            sleepPromise,
            new Promise<never>((_, reject) => {
              const onAbort = () => {
                signal.removeEventListener("abort", onAbort);
                const e =
                  signal.reason instanceof Error ? signal.reason : new Error("Operation aborted");
                (e as Error).name = (e as Error).name || "AbortError";
                reject(e);
              };
              if (signal.aborted) onAbort();
              else signal.addEventListener("abort", onAbort, { once: true });
            }),
          ]);
        } else {
          await sleepPromise;
        }
      }
    }
  },
} as const;
