/**
 * @fileoverview Unit tests for RetryUtils in @t68/utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@t68/logger", () => {
  // Enable debug to exercise short-circuit/logging branches
  const levels: Record<string, boolean> = {
    trace: false,
    debug: true,
    info: true,
    warn: true,
    error: true,
  };
  const isLevelEnabled = vi.fn((level: string) => !!levels[level]);
  const logger = {
    isLevelEnabled,
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  };
  return { logger };
});

import { RetryUtils, RetryExhaustedError } from "../src/retry";
import { logger } from "@t68/logger";

describe("RetryUtils.retryAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5); // deterministic jitter
    vi.clearAllMocks();
  });

  it("sets error name to 'AbortError' when abort Error has undefined name during sleep", async () => {
    const controller = new AbortController();
    const abortErr = new Error("bye");
    (abortErr as any).name = undefined;
    const op = vi.fn().mockRejectedValueOnce(new Error("fail once"));
    const p = RetryUtils.retryAsync(op, {
      retries: 1,
      delayMs: 1000,
      backoff: "fixed",
      signal: controller.signal,
      onAttemptError: () => {
        setTimeout(() => controller.abort(abortErr), 10);
      },
    });
    // Capture rejection immediately to avoid unhandled rejection warning
    const handled = p.catch((e) => e);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    await expect(handled).resolves.toMatchObject({ name: "AbortError" });
  });

  it("aborts during sleep with Error reason (covers signal.reason instanceof Error branch)", async () => {
    const controller = new AbortController();
    const abortErr = new Error("bye");
    const op = vi.fn().mockRejectedValueOnce(new Error("fail once"));
    const p = RetryUtils.retryAsync(op, {
      retries: 1,
      delayMs: 1000,
      backoff: "fixed",
      signal: controller.signal,
      onAttemptError: () => {
        // Abort after the race is set up; use a small timeout so race is active
        setTimeout(() => controller.abort(abortErr), 10);
      },
    });
    // Capture rejection immediately to avoid unhandled rejection warning
    const handled = p.catch((e) => e);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    await expect(handled).resolves.toBe(abortErr);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("aborts immediately at sleep when signal is already aborted (covers immediate onAbort branch)", async () => {
    const controller = new AbortController();
    const op = vi.fn().mockRejectedValueOnce(new Error("fail once"));
    const p = RetryUtils.retryAsync(op, {
      retries: 1,
      delayMs: 1000,
      backoff: "fixed",
      signal: controller.signal,
      onAttemptError: () => {
        // Abort synchronously during error handling before sleep Promise.race is constructed
        controller.abort("bye" as unknown as Error);
      },
    });
    await expect(p).rejects.toMatchObject({ name: expect.stringMatching(/^(AbortError|Error)$/) });
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("emits trace log at start when trace level is enabled", async () => {
    // Force trace level enabled for this test
    (logger.isLevelEnabled as unknown as Mock).mockImplementation(
      (level: string) =>
        level === "trace" ||
        level === "debug" ||
        level === "info" ||
        level === "warn" ||
        level === "error",
    );
    const op = vi.fn().mockResolvedValueOnce("ok");
    await RetryUtils.retryAsync(op, { retries: 0, delayMs: 1, backoff: "fixed" });
    expect(logger.trace).toHaveBeenCalled();
    const [firstCall] = (logger.trace as unknown as Mock).mock.calls;
    expect(firstCall[0]).toMatchObject({ attempt: 1 });
  });

  it("throws the provided error when signal.reason is an Error (covers ternary left branch)", async () => {
    const controller = new AbortController();
    const err = new Error("Boom");
    controller.abort(err);
    const op = vi.fn().mockResolvedValue("ok");
    const p = RetryUtils.retryAsync(op, {
      delayMs: 10,
      backoff: "fixed",
      signal: controller.signal,
    });
    await expect(p).rejects.toBe(err);
    expect(op).not.toHaveBeenCalled();
  });

  it("creates a new Error when signal.reason is not an Error (covers ternary right branch)", async () => {
    const controller = new AbortController();
    controller.abort("not-an-error" as unknown as Error);
    const op = vi.fn().mockResolvedValue("ok");
    const p = RetryUtils.retryAsync(op, {
      delayMs: 10,
      backoff: "fixed",
      signal: controller.signal,
    });
    await expect(p).rejects.toBeInstanceOf(Error);
    await expect(p).rejects.toMatchObject({ message: "Operation aborted" });
    expect(op).not.toHaveBeenCalled();
  });

  it("defaults error name to 'AbortError' when provided Error has empty name", async () => {
    const controller = new AbortController();
    const err = new Error("stop");
    (err as any).name = ""; // force empty name to trigger defaulting
    controller.abort(err);
    const op = vi.fn().mockResolvedValue("ok");
    const p = RetryUtils.retryAsync(op, {
      delayMs: 10,
      backoff: "fixed",
      signal: controller.signal,
    });
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(op).not.toHaveBeenCalled();
  });

  it("uses exponential-jitter backoff with deterministic delays", async () => {
    // Math.random is mocked to 0.5 in beforeEach, so jitter picks mid-point => raw delay
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockResolvedValueOnce("ok");

    const promise = RetryUtils.retryAsync(op, {
      retries: 3,
      delayMs: 100,
      backoff: "exponential-jitter",
    });

    // Attempt 1 fails -> raw=100, jitter mid => 100
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100);
    // Attempt 2 fails -> raw=200, jitter mid => 200
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(200);

    await expect(promise).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(3);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns result on first attempt without retry", async () => {
    const op = vi.fn().mockResolvedValueOnce("ok");
    const p = RetryUtils.retryAsync(op, { retries: 3, delayMs: 10, backoff: "fixed" });
    await expect(p).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("uses default retries when options.retries is undefined (totalAttempts = 4)", async () => {
    // DEFAULTS.retries = 3 => totalAttempts = 4
    const op = vi.fn().mockRejectedValue(new Error("always"));
    const promise = RetryUtils.retryAsync(op, { delayMs: 50, backoff: "fixed" });
    const handled = promise.catch((e) => e);

    // There should be 3 sleeps of 50ms between 4 attempts
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);

    const err = await handled;
    expect(err).toBeInstanceOf(RetryExhaustedError);
    expect(op).toHaveBeenCalledTimes(4);
  });

  it("retries failed attempts then succeeds (fixed backoff)", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockResolvedValueOnce("ok");

    const promise = RetryUtils.retryAsync(op, { retries: 3, delayMs: 100, backoff: "fixed" });

    // First failure schedules sleep 100ms
    await Promise.resolve(); // progress microtasks up to first catch
    await vi.advanceTimersByTimeAsync(100);
    // Second failure schedules sleep again
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("throws RetryExhaustedError after max attempts", async () => {
    const op = vi.fn().mockRejectedValue(new Error("boom"));
    const promise = RetryUtils.retryAsync(op, { retries: 2, delayMs: 50, backoff: "fixed" });
    const handled = promise.catch((e) => e);
    // Two sleeps between three attempts (attempts = retries + 1)
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);
    const err = await handled;
    expect(err).toBeInstanceOf(RetryExhaustedError);
  });

  it("honors shouldRetry predicate (short-circuit no retry)", async () => {
    const err = new Error("no retry");
    const op = vi.fn().mockRejectedValue(err);
    const p = RetryUtils.retryAsync(op, {
      retries: 5,
      delayMs: 10,
      shouldRetry: async (_e, attempt) => attempt < 1, // false on first attempt
    });
    await expect(p).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("aborts via signal during sleep with AbortError", async () => {
    const controller = new AbortController();
    const op = vi.fn().mockRejectedValueOnce(new Error("fail once"));
    const p = RetryUtils.retryAsync(op, {
      retries: 3,
      delayMs: 1000,
      backoff: "fixed",
      signal: controller.signal,
    });

    // Enter sleep and then abort
    await Promise.resolve();
    controller.abort(new Error("Cancelled"));
    await expect(p).rejects.toMatchObject({ name: expect.stringMatching(/^(AbortError|Error)$/) });
  });

  it("applies maxDelay cap and logs debug with wasCapped=true", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockRejectedValueOnce(new Error("e3"))
      .mockRejectedValueOnce(new Error("e4"))
      .mockRejectedValueOnce(new Error("e5"));

    const promise = RetryUtils.retryAsync(op, {
      retries: 4,
      delayMs: 100,
      backoff: "exponential",
      maxDelayMs: 150, // exponential would exceed this after attempt 2
    });
    const handled = promise.catch((e) => e);

    // Walk through all scheduled sleeps
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100); // attempt 1 -> delay 100
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(150); // attempt 2 -> raw 200 capped to 150
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(150); // attempt 3 -> raw 400 capped to 150
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(150); // attempt 4 -> raw 800 capped to 150

    const err2 = await handled;
    expect(err2).toBeInstanceOf(RetryExhaustedError);

    // Verify that debug logs were emitted with cap flag at least once
    const debugCalls = (logger.debug as unknown as Mock).mock.calls;
    const capLogs = debugCalls.filter(
      (args) =>
        args[0] &&
        typeof args[0] === "object" &&
        "wasCapped" in args[0] &&
        args[0].wasCapped === true,
    );
    expect(capLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("aborts immediately after catch when operation aborts the signal before throwing (covers post-catch abort check)", async () => {
    const controller = new AbortController();
    const reason = new Error("stop-now");
    const op = vi.fn().mockImplementation(async () => {
      controller.abort(reason);
      throw new Error("fail");
    });
    const p = RetryUtils.retryAsync(op, {
      retries: 1,
      delayMs: 100,
      backoff: "fixed",
      signal: controller.signal,
    });
    await expect(p).rejects.toBe(reason);
    expect(op).toHaveBeenCalledTimes(1);
  });
});
