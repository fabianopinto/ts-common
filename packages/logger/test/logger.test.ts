/**
 * @fileoverview Unit tests for @t68/logger
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BaseLogger } from "../src/index";
import { AppError } from "@t68/errors";

function withPatchedEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const old: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    old[k] = process.env[k];
    const v = vars[k];
    if (typeof v === "undefined") delete (process.env as Record<string, string | undefined>)[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(vars)) {
      const v = old[k];
      if (typeof v === "undefined") delete (process.env as Record<string, string | undefined>)[k];
      else process.env[k] = v;
    }
  }
}

function captureStdout(): { restore: () => void; lines: string[] } {
  const lines: string[] = [];
  const spy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(
      (
        chunk: string | Uint8Array,
        encoding?: BufferEncoding | ((err?: Error | null) => void),
        cb?: (err?: Error | null) => void,
      ): boolean => {
        const str = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
        // tsup/pino may write multiple lines; split and collect JSON lines
        for (const line of str.split(/\n+/)) {
          if (line.trim()) lines.push(line);
        }
        // Invoke callback if provided
        if (typeof encoding === "function") encoding();
        else if (typeof cb === "function") cb();
        return true;
      },
    );
  return {
    restore: () => spy.mockRestore(),
    lines,
  };
}

describe("BaseLogger serialization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes AppError under error key", () => {
    const { restore, lines } = captureStdout();
    try {
      const logger = new BaseLogger({ pretty: false, level: "info" });
      const err = new AppError("boom", { code: "X", status: 500, context: { a: 1 } });
      logger.error(err, "failed");
      expect(lines.length).toBeGreaterThan(0);
      const rec = JSON.parse(lines[0]);
      expect(rec.level).toBeDefined();
      expect(rec.msg).toBe("failed");
      expect(rec.error).toBeDefined();
      expect(rec.error.name).toBe("AppError");
      expect(rec.error.code).toBe("X");
      expect(rec.error.status).toBe(500);
      expect(rec.error.context).toEqual({ a: 1 });
    } finally {
      restore();
    }
  });

  it("wraps native Error as { error } and serializes", () => {
    const { restore, lines } = captureStdout();
    try {
      const logger = new BaseLogger({ pretty: false, level: "info" });
      const err = new Error("boom");
      logger.error(err, "failed");
      const rec = JSON.parse(lines[0]);
      expect(rec.error).toBeDefined();
      expect(rec.error.type || rec.error.name).toBeDefined();
    } finally {
      restore();
    }
  });

  it("passes through object containing { error }", () => {
    const { restore, lines } = captureStdout();
    try {
      const logger = new BaseLogger({ pretty: false, level: "info" });
      const err = new Error("oops");
      logger.error({ error: err, extra: 1 }, "with object");
      const rec = JSON.parse(lines[0]);
      expect(rec.extra).toBe(1);
      expect(rec.error).toBeDefined();
    } finally {
      restore();
    }
  });

  it("returns non-Error values unchanged from error serializer (covers passthrough)", () => {
    const { restore, lines } = captureStdout();
    try {
      const logger = new BaseLogger({ pretty: false, level: "info" });
      logger.error({ error: "not-an-error", meta: 42 }, "string error passthrough");
      const rec = JSON.parse(lines[0]);
      expect(rec.msg).toBe("string error passthrough");
      expect(rec.meta).toBe(42);
      expect(rec.error).toBe("not-an-error");
    } finally {
      restore();
    }
  });

  it("does not auto-wrap second-arg Error (documented behavior)", () => {
    const { restore, lines } = captureStdout();
    try {
      const logger = new BaseLogger({ pretty: false, level: "info" });
      const err = new Error("boom");
      // @ts-expect-error: Deliberately passing Error as the 2nd arg to assert we do NOT auto-wrap it
      logger.error("only message", err);
      const rec = JSON.parse(lines[0]);
      expect(rec.msg).toBe("only message");
      expect(rec.error).toBeUndefined();
    } finally {
      restore();
    }
  });

  it("handles fatal with AppError identically to error", () => {
    const { restore, lines } = captureStdout();
    try {
      const logger = new BaseLogger({ pretty: false, level: "trace" });
      logger.fatal(new AppError("fatal", { code: "F" }), "shutdown");
      const rec = JSON.parse(lines[0]);
      expect(rec.level).toBeDefined();
      expect(rec.msg).toBe("shutdown");
      expect(rec.error?.name).toBe("AppError");
      expect(rec.error?.code).toBe("F");
    } finally {
      restore();
    }
  });
});

describe("BaseLogger levels and configuration", () => {
  it("respects setLevel and isLevelEnabled", () => {
    const logger = new BaseLogger({ pretty: false, level: "warn" });
    expect(logger.isLevelEnabled("info")).toBe(false);
    logger.setLevel("info");
    expect(logger.isLevelEnabled("info")).toBe(true);
  });

  it("normalizes invalid LOG_LEVEL and falls back to info (ternary/short-circuit path)", () => {
    withPatchedEnv({ LOG_LEVEL: "verbose" }, () => {
      const logger = new BaseLogger({ pretty: false });
      // default is info; debug should be disabled
      expect(logger.isLevelEnabled("debug")).toBe(false);
      expect(logger.isLevelEnabled("info")).toBe(true);
    });
  });

  it("pretty defaults to false in production (short-circuit path) and emits JSON", () => {
    withPatchedEnv({ NODE_ENV: "production" }, () => {
      const { restore, lines } = captureStdout();
      try {
        const logger = new BaseLogger();
        logger.info({ a: 1 }, "hello");
        const rec = JSON.parse(lines[0]);
        expect(rec.msg).toBe("hello");
        expect(rec.a).toBe(1);
      } finally {
        restore();
      }
    });
  });

  it("child logger inherits and binds methods", () => {
    const { restore, lines } = captureStdout();
    try {
      const root = new BaseLogger({ pretty: false, level: "info" });
      const child = root.child({ component: "auth" });
      child.info("child message");
      const rec = JSON.parse(lines[0]);
      expect(rec.component).toBe("auth");
      expect(rec.msg).toBe("child message");
    } finally {
      restore();
    }
  });

  it("falls back to JSON when pino-pretty cannot be resolved (covers catch path)", async () => {
    const { restore, lines } = captureStdout();
    try {
      // Re-import logger with mocked createRequire that throws in resolve
      vi.resetModules();
      vi.doMock("module", () => ({
        createRequire: () => ({
          resolve: () => {
            throw new Error("not found");
          },
        }),
      }));
      const mod = await import("../src/index");
      const Logger = mod.BaseLogger as typeof import("../src/index").BaseLogger;
      const logger = new Logger({ pretty: true, level: "info" });
      logger.info({ k: 1 }, "json fallback");
      const rec = JSON.parse(lines[0]);
      expect(rec.msg).toBe("json fallback");
      expect(rec.k).toBe(1);
    } finally {
      restore();
      vi.resetModules();
    }
  });
});
