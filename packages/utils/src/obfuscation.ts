/**
 * @fileoverview Obfuscation Utilities
 *
 * Lightweight helpers to obfuscate sensitive data in strings, headers, and
 * deep objects. Supports full and partial masking, with pattern-based
 * redaction for common secret-like property names (e.g., `password`, `token`,
 * `apiKey`, `authorization`).
 *
 * Design:
 * - Pure, non-mutating functions (object obfuscation returns a cloned shape)
 * - Opinionated defaults with extensible options
 * - Uses the shared `logger` for safe failure logging (warn level)
 */

import { logger } from "@t68/logger";

/**
 * Options for partial masking
 */
export interface PartialMaskOptions {
  /** How many characters to keep visible at the start. Default: 2 */
  visibleStart?: number;
  /** How many characters to keep visible at the end. Default: 2 */
  visibleEnd?: number;
  /** Mask character. Default: "*" */
  maskChar?: string;
  /** Minimum number of masked characters to enforce. Default: 4 */
  minMasked?: number;
}

/**
 * Options for object obfuscation
 */
export interface ObfuscateObjectOptions extends PartialMaskOptions {
  /**
   * Property name patterns that should be masked when encountered.
   * Defaults include common secret-like properties.
   */
  patterns?: (string | RegExp)[];
  /**
   * If true, fully mask matched values; otherwise partially mask. Default: true
   */
  fullMask?: boolean;
  /**
   * Custom predicate to decide whether a property should be masked.
   * When provided, this takes precedence over `patterns`.
   *
   * @param key - Property name
   * @param value - Property value
   * @param path - Array of property names leading to the current property
   * @returns True if the property should be masked, false otherwise
   */
  shouldMaskKey?: (key: string, value: unknown, path: string[]) => boolean;
}

const DEFAULT_PATTERNS: RegExp[] = [
  /pass(word)?/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /credential/i,
  /authorization/i,
  /bearer/i,
  /key$/i, // keep generic but at end to reduce false positives
];

/**
 * Normalize patterns to RegExp
 *
 * @param patterns - Array of string or RegExp patterns
 * @returns Array of RegExp objects
 */
function toRegexps(patterns?: (string | RegExp)[]): RegExp[] {
  const base = patterns?.length ? patterns : DEFAULT_PATTERNS;
  return base.map((p) => (typeof p === "string" ? new RegExp(p, "i") : p));
}

/**
 * Decide whether a key should be masked
 *
 * @param key - Property name
 * @param regs - Array of RegExp patterns
 * @returns True if the key matches any of the patterns, false otherwise
 */
function keyMatches(key: string, regs: RegExp[]): boolean {
  return regs.some((r) => r.test(key));
}

export const ObfuscationUtils = {
  /**
   * Fully masks a string with the given character (length preserved).
   *
   * @param value - Input string to mask
   * @param maskChar - Character to use for masking. Default: "*"
   * @returns Masked string with original length
   *
   * @example
   * ObfuscationUtils.mask("secret") // => "******"
   */
  mask(value: string, maskChar = "*"): string {
    if (!value) return value;
    return maskChar.repeat(value.length);
  },

  /**
   * Partially masks a string, preserving start/end visibility.
   * Ensures at least `minMasked` characters are masked when possible.
   *
   * @param value - Input string to mask
   * @param opts - Partial mask options
   * @returns A partially masked string
   *
   * @example
   * ObfuscationUtils.partialMask("supersecret") // => "su******et"
   */
  partialMask(value: string, opts: PartialMaskOptions = {}): string {
    const { visibleStart = 2, visibleEnd = 2, maskChar = "*", minMasked = 4 } = opts;
    if (!value) return value;
    const len = value.length;
    const start = Math.max(0, visibleStart);
    const end = Math.max(0, visibleEnd);
    const visibleTotal = Math.min(len, start + end);

    if (len <= visibleTotal) {
      // Not enough length to preserve both ends; mask all except first char when > 1
      if (len <= 2) return ObfuscationUtils.mask(value, maskChar);
      return value.slice(0, 1) + maskChar.repeat(len - 2) + value.slice(len - 1);
    }

    const maskedCount = len - (start + end);
    if (maskedCount < minMasked && len > start + end) {
      // Reduce visible to honor minimum masked
      const deficit = minMasked - maskedCount;
      const reduceStart = Math.min(start, Math.ceil(deficit / 2));
      const reduceEnd = Math.min(end, Math.floor(deficit / 2));
      const s = start - reduceStart;
      const e = end - reduceEnd;
      return value.slice(0, s) + maskChar.repeat(len - (s + e)) + value.slice(len - e);
    }

    return value.slice(0, start) + maskChar.repeat(maskedCount) + value.slice(len - end);
  },

  /**
   * Obfuscates HTTP header values, preserving schemes like "Bearer" while masking
   * the credential part.
   *
   * @param headers - Header name/value pairs
   * @param opts - Partial mask options to control visibility and mask char
   * @returns A new headers object with sensitive values obfuscated
   *
   * @example
   * ObfuscationUtils.obfuscateHeaders({ Authorization: "Bearer abcdef" })
   * // => { Authorization: "Bearer **cdef" } (last 4 visible by default)
   */
  obfuscateHeaders(
    headers: Record<string, string>,
    opts: PartialMaskOptions = {},
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v !== "string") {
        out[k] = v as unknown as string;
        continue;
      }
      if (/^authorization$/i.test(k)) {
        // Preserve scheme, mask credentials
        const parts = v.split(/\s+/, 2);
        if (parts.length === 2) {
          const [scheme, cred] = parts as [string, string];
          out[k] =
            `${scheme} ${ObfuscationUtils.partialMask(cred, { ...opts, visibleStart: 0, visibleEnd: 4 })}`;
        } else {
          out[k] = ObfuscationUtils.partialMask(v, { ...opts, visibleStart: 0, visibleEnd: 4 });
        }
      } else if (keyMatches(k, DEFAULT_PATTERNS)) {
        out[k] = ObfuscationUtils.partialMask(v, opts);
      } else {
        out[k] = v;
      }
    }
    return out;
  },

  /**
   * Recursively obfuscates an object or array by masking values of properties
   * whose names match sensitive patterns or satisfy a custom predicate.
   *
   * Notes:
   * - Does not mutate the input (returns a new structure)
   * - Circular reference safe
   * - Non-string values are left untouched
   *
   * @typeParam T - The input object/array type
   * @param input - Any object/array to obfuscate
   * @param options - Controls matching and masking behavior
   * @returns A new object/array with sensitive values obfuscated
   *
   * @example
   * ObfuscationUtils.obfuscateObject({ password: "p@ss", token: "abcd", keep: 1 })
   * // => { password: "****", token: "ab**", keep: 1 }
   */
  obfuscateObject<T>(input: T, options: ObfuscateObjectOptions = {}): T {
    const { patterns, fullMask: full = true, shouldMaskKey, ...partial } = options;
    const regs = toRegexps(patterns);
    const seen = new WeakSet<object>();

    const walk = (val: unknown, path: string[]): unknown => {
      if (val === null || typeof val !== "object") return val;
      if (seen.has(val as object)) return val; // do not duplicate structures
      seen.add(val as object);

      if (Array.isArray(val))
        return (val as unknown[]).map((v, i) => walk(v, path.concat(String(i))));

      const src = val as Record<string, unknown>;
      const out: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(src)) {
        const shouldMask = shouldMaskKey ? shouldMaskKey(k, v, path) : keyMatches(k, regs);
        if (shouldMask) {
          if (typeof v === "string") {
            out[k] = full
              ? ObfuscationUtils.mask(v, partial.maskChar ?? "*")
              : ObfuscationUtils.partialMask(v, partial);
          } else {
            out[k] = v;
          }
        } else if (v && typeof v === "object") {
          out[k] = walk(v, path.concat(k));
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    try {
      return walk(input as unknown, []) as T;
    } catch (err) {
      logger.warn({ err }, "obfuscation-utils: failed to obfuscate object; returning input");
      return input;
    }
  },

  /**
   * Redact arbitrary substrings in an input string using patterns.
   *
   * Accepts string or RegExp patterns. String patterns are treated as
   * case-insensitive literals. All matches are replaced by `replacement`.
   *
   * @param input - Input string
   * @param patterns - Array of string literals or RegExp patterns
   * @param replacement - Replacement token (default: "[REDACTED]")
   * @returns String with all pattern matches redacted
   *
   * @example
   * ObfuscationUtils.redactString("token=abc123; email=john@x.dev", [/token=\w+/i, /\b\S+@\S+\b/])
   * // => "[REDACTED]; [REDACTED]"
   */
  redactString(
    input: string,
    patterns: Array<string | RegExp>,
    replacement = "[REDACTED]",
  ): string {
    if (!input || patterns.length === 0) return input;
    const regs = patterns.map((p) =>
      typeof p === "string"
        ? new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
        : new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g"),
    );
    let out = input;
    for (const r of regs) {
      out = out.replace(r, replacement);
    }
    return out;
  },
} as const;
