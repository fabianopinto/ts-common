/**
 * @fileoverview Unit tests for EnvUtils in @t68/utils
 */

import { describe, it, expect } from "vitest";
import { EnvUtils } from "../src/env";
import { ConfigurationError } from "@t68/errors";

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
      else process.env[k] = v!;
    }
  }
}

describe("EnvUtils", () => {
  it("getEnv returns trimmed values and defaults for nullish/empty (short-circuit)", () => {
    withPatchedEnv({ A: "  x  ", B: "", C: undefined }, () => {
      expect(EnvUtils.getEnv("A")).toBe("x");
      expect(EnvUtils.getEnv("B", "d")).toBe("d");
      expect(EnvUtils.getEnv("C", "d")).toBe("d");
    });
  });

  it("requireEnv returns trimmed or throws ConfigurationError", () => {
    withPatchedEnv({ REQ: "  ok  " }, () => {
      expect(EnvUtils.requireEnv("REQ")).toBe("ok");
    });
    withPatchedEnv({ MISS: "" }, () => {
      expect(() => EnvUtils.requireEnv("MISS")).toThrow(ConfigurationError);
    });
  });

  it("getBoolEnv parses truthy/falsy and falls back to default for unknown", () => {
    withPatchedEnv({ T1: "true", T2: "YES", F1: "false", F2: "0", U: "maybe" }, () => {
      expect(EnvUtils.getBoolEnv("T1", false)).toBe(true);
      expect(EnvUtils.getBoolEnv("T2", false)).toBe(true);
      expect(EnvUtils.getBoolEnv("F1", true)).toBe(false);
      expect(EnvUtils.getBoolEnv("F2", true)).toBe(false);
      expect(EnvUtils.getBoolEnv("U", true)).toBe(true); // default for unrecognized
      expect(EnvUtils.getBoolEnv("MISSING", true)).toBe(true);
    });
  });

  it("getNumberEnv parses finite numbers and uses default otherwise", () => {
    withPatchedEnv({ N1: "42", N2: "  7  ", BAD: "x", INF: String(Infinity) }, () => {
      expect(EnvUtils.getNumberEnv("N1", 0)).toBe(42);
      expect(EnvUtils.getNumberEnv("N2", 0)).toBe(7);
      expect(EnvUtils.getNumberEnv("BAD", 9)).toBe(9);
      expect(EnvUtils.getNumberEnv("INF", 1)).toBe(1);
      expect(EnvUtils.getNumberEnv("MISS", 5)).toBe(5);
    });
  });

  it("getJsonEnv parses JSON and returns default on error/absent (ternary/try-catch)", () => {
    withPatchedEnv({ J: '{"a":1}', BAD: "{]" }, () => {
      expect(EnvUtils.getJsonEnv<{ a: number }>("J")).toEqual({ a: 1 });
      expect(EnvUtils.getJsonEnv("BAD", { a: 0 })).toEqual({ a: 0 });
      expect(EnvUtils.getJsonEnv("MISS", { x: 1 })).toEqual({ x: 1 });
    });
  });
});
