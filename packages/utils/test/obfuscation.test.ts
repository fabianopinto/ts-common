/**
 * @fileoverview Unit tests for ObfuscationUtils in @fabianopinto/utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@fabianopinto/logger", () => {
  const levels: Record<string, boolean> = {
    trace: false,
    debug: false,
    info: false,
    warn: true,
    error: true,
  };
  const logger = {
    isLevelEnabled: (level: string) => !!levels[level],
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  };
  return { logger };
});

import { ObfuscationUtils } from "../src/obfuscation";
import { logger } from "@fabianopinto/logger";

describe("ObfuscationUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mask", () => {
    it("fully masks string and preserves length; short-circuits falsy", () => {
      expect(ObfuscationUtils.mask("secret")).toBe("******");
      // short-circuit returns input for empty
      expect(ObfuscationUtils.mask("")).toBe("");
    });
  });

  describe("partialMask", () => {
    it("partially masks with defaults and enforces minMasked", () => {
      expect(ObfuscationUtils.partialMask("supersecret")).toMatch(/^su\*+et$/);
    });

    it("handles very short strings by masking appropriately", () => {
      expect(ObfuscationUtils.partialMask("a")).toBe("*");
      expect(ObfuscationUtils.partialMask("ab")).toBe("**");
      expect(ObfuscationUtils.partialMask("abc")).toMatch(/^a\*c$/);
    });

    it("returns input when value is falsy (empty string short-circuit)", () => {
      expect(ObfuscationUtils.partialMask("")).toBe("");
      // with options present too
      expect(ObfuscationUtils.partialMask("", { visibleStart: 3, visibleEnd: 3 })).toBe("");
    });
  });

  describe("obfuscateHeaders", () => {
    it("masks Authorization preserving scheme and masks common patterns", () => {
      const headers = {
        Authorization: "Bearer abcdefgh",
        password: "p@ssw0rd",
        X: "keep",
      };
      const out = ObfuscationUtils.obfuscateHeaders(headers);
      expect(out.Authorization.startsWith("Bearer ")).toBe(true);
      expect(out.Authorization.length).toBeGreaterThan("Bearer ".length);
      expect(out.password).not.toBe("p@ssw0rd");
      expect(out.X).toBe("keep");
    });

    it("masks Authorization when no scheme is present (covers single-token path)", () => {
      const headers = {
        Authorization: "abcdefghi",
      };
      const out = ObfuscationUtils.obfuscateHeaders(headers);
      // Should not add a scheme, just mask with last 4 visible
      expect(out.Authorization).not.toBe("abcdefghi");
      expect(out.Authorization.endsWith("fghi")).toBe(true);
      expect(out.Authorization.length).toBe("abcdefghi".length);
    });

    it("leaves non-string header values unchanged and continues (covers typeof v !== 'string' branch)", () => {
      const headers: any = {
        Authorization: 12345, // non-string, should be copied as-is and skipped from further processing
        X: 7,
      };
      const out = ObfuscationUtils.obfuscateHeaders(headers);
      // Values remain non-string at runtime due to direct assignment; assert via any
      expect((out as any).Authorization).toBe(12345);
      expect((out as any).X).toBe(7);
    });
  });

  describe("obfuscateObject", () => {
    it("recursively masks matching keys and respects full vs partial", () => {
      const input = {
        password: "abcd",
        nested: { token: "xyz123", keep: 1 },
        arr: [{ apiKey: "api" }, "ok"],
      };
      const outFull = ObfuscationUtils.obfuscateObject(input, { fullMask: true });
      expect(outFull.password).toBe("****");
      expect((outFull.nested as any).token).toBe("******");
      const outPartial = ObfuscationUtils.obfuscateObject(input, {
        fullMask: false,
        visibleStart: 1,
        visibleEnd: 1,
      });
      // Given minMasked default = 4 and value length 4, partial mask enforces full mask
      expect(outPartial.password).toBe("****");
    });

    it("uses shouldMaskKey predicate when provided", () => {
      const input = { secretThing: "abc", keep: { deep: "value" } };
      const out = ObfuscationUtils.obfuscateObject(input, {
        fullMask: true,
        shouldMaskKey: (k) => k === "deep",
      });
      expect((out.keep as any).deep).toBe("*****");
      expect(out.secretThing).toBe("abc"); // not masked because predicate controls
    });

    it("leaves non-string values unchanged even when key matches (covers shouldMask && typeof v !== 'string' branch)", () => {
      const input = { password: 123, token: true, nested: { apiKey: null } } as any;
      const out = ObfuscationUtils.obfuscateObject(input, { fullMask: true });
      expect(out.password).toBe(123);
      expect((out as any).token).toBe(true);
      expect((out.nested as any).apiKey).toBeNull();
    });

    it("returns input and logs warn on unexpected errors (catch path)", () => {
      const throwing: Record<string, any> = {};
      Object.defineProperty(throwing, "bad", {
        enumerable: true,
        get() {
          throw new Error("boom");
        },
      });
      const out = ObfuscationUtils.obfuscateObject(throwing);
      expect(out).toBe(throwing);
      expect(logger.warn).toHaveBeenCalled();
    });

    it("handles circular references without crashing", () => {
      const a: any = { password: "top" };
      const b: any = { a };
      a.b = b;
      const out = ObfuscationUtils.obfuscateObject(a);
      expect(out.password).not.toBe("top");
    });

    it("uses only provided non-empty patterns and does not include defaults (covers ternary true branch)", () => {
      const input = { password: "abcd", foo: "secret" };
      // Provide a custom pattern list so toRegexps uses it instead of DEFAULT_PATTERNS
      const out = ObfuscationUtils.obfuscateObject(input, { patterns: [/^foo$/i], fullMask: true });
      // 'password' should NOT be masked because defaults are not included when custom patterns are provided
      expect(out.password).toBe("abcd");
      // 'foo' should be masked because it matches the provided pattern
      expect(out.foo).toBe("******");
    });

    it("falls back to default patterns when provided patterns is an empty array (covers ternary false branch)", () => {
      const input = { password: "abcd", foo: "secret" };
      // Empty array should trigger fallback to DEFAULT_PATTERNS inside toRegexps
      const out = ObfuscationUtils.obfuscateObject(input, { patterns: [], fullMask: true });
      // 'password' should be masked due to DEFAULT_PATTERNS
      expect(out.password).toBe("****");
      // 'foo' should remain unchanged as it is not in DEFAULT_PATTERNS
      expect(out.foo).toBe("secret");
    });

    it("converts string patterns to case-insensitive RegExp (covers ternary string branch)", () => {
      const input = { Foo: "secret", password: "abcd", bar: "keep" };
      // Provide a string pattern; toRegexps should convert to new RegExp(p, "i")
      const out = ObfuscationUtils.obfuscateObject(input, { patterns: ["^foo$"] });
      // Case-insensitive match should mask 'Foo'
      expect(out.Foo).not.toBe("secret");
      // Defaults should NOT be applied since we provided a non-empty custom patterns list
      expect(out.password).toBe("abcd");
      expect(out.bar).toBe("keep");
    });
  });

  describe("redactString", () => {
    it("redacts string and regex patterns; returns input when patterns empty (short-circuit)", () => {
      const input = "token=abc123; email=john@example.com";
      const out = ObfuscationUtils.redactString(input, [/token=\w+/i, /\b\S+@\S+\b/]);
      expect(out).toBe("[REDACTED]; [REDACTED]");
      expect(ObfuscationUtils.redactString(input, [])).toBe(input);
    });

    it("converts string patterns to escaped, case-insensitive, global regex (covers string branch)", () => {
      const input = "A+B a+b C";
      // "+" should be escaped; both cases should be matched due to 'i' and globally due to 'g'
      const out = ObfuscationUtils.redactString(input, ["a+b"], "X");
      expect(out).toBe("X X C");
    });

    it("ensures non-global regex patterns are applied globally (covers regex branch)", () => {
      const input = "id:12 id:34";
      // Provide a regex without 'g'; implementation should add 'g' to replace all occurrences
      const out = ObfuscationUtils.redactString(input, [/id:\d{2}/i], "X");
      expect(out).toBe("X X");
    });

    it("preserves existing global flag on provided RegExp (covers flags.includes('g') true branch)", () => {
      const input = "ref#1 ref#2 ref#3";
      const out = ObfuscationUtils.redactString(input, [/ref#\d/gi], "R");
      expect(out).toBe("R R R");
    });
  });
});
