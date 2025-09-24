/**
 * @fileoverview Numeric utility helpers (pure functions).
 *
 * Provides common helpers for numeric parsing, validation, and range operations.
 */

export const NumberUtils = {
  /**
   * Clamp a number to the inclusive range `[min, max]`.
   *
   * @param value - Input number
   * @param min - Inclusive lower bound
   * @param max - Inclusive upper bound
   * @returns The clamped value
   * @throws `RangeError` if `min > max`
   *
   * @example
   * ```typescript
   * NumberUtils.clamp(10, 0, 5) // => 5
   * NumberUtils.clamp(-2, 0, 5) // => 0
   * NumberUtils.clamp(3, 0, 5)  // => 3
   * ```
   */
  clamp(value: number, min: number, max: number): number {
    if (min > max) throw new RangeError("min must be <= max");
    if (value < min) return min;
    if (value > max) return max;
    return value;
  },

  /**
   * Check whether a number is within the inclusive range `[min, max]`.
   *
   * @param value - Input number
   * @param min - Inclusive lower bound
   * @param max - Inclusive upper bound
   * @returns `true` if value is in `[min, max]`, `false` otherwise
   * @throws `RangeError` if `min > max`
   *
   * @example
   * ```typescript
   * NumberUtils.inRange(3, 1, 5) // => true
   * NumberUtils.inRange(0, 1, 5) // => false
   * ```
   */
  inRange(value: number, min: number, max: number): boolean {
    if (min > max) throw new RangeError("min must be <= max");
    return value >= min && value <= max;
  },

  /**
   * Safely parse an integer value from unknown input.
   *
   * For string inputs, uses `parseInt` with the provided radix and returns
   * `defaultValue` when parsing results in `NaN`. For number inputs, returns
   * `Math.trunc` when finite; otherwise `defaultValue`. All other input types
   * return `defaultValue`.
   *
   * @param input - Unknown input
   * @param defaultValue - Value to return on failure (default `0`)
   * @param radix - Number base for string parsing (default `10`)
   * @returns Parsed integer or `defaultValue`
   *
   * @example
   * ```typescript
   * NumberUtils.safeParseInt("42")        // => 42
   * NumberUtils.safeParseInt("08", 0, 10) // => 8
   * NumberUtils.safeParseInt("x", 7)      // => 7
   * NumberUtils.safeParseInt(12.9)        // => 12
   * ```
   */
  safeParseInt(input: unknown, defaultValue = 0, radix = 10): number {
    if (typeof input === "number") {
      return Number.isFinite(input) ? Math.trunc(input) : defaultValue;
    }
    if (typeof input === "string") {
      const s = input.trim();
      if (s.length === 0) return defaultValue;
      const n = Number.parseInt(s, radix);
      return Number.isNaN(n) ? defaultValue : n;
    }
    return defaultValue;
  },

  /**
   * Safely parse a floating point number from unknown input.
   *
   * For string inputs, uses `parseFloat(s)` and returns `defaultValue` when
   * parsing fails or the result is not a finite number. For number inputs,
   * returns the value when finite; otherwise `defaultValue`. All other input
   * types return `defaultValue`.
   *
   * @param input - Unknown input
   * @param defaultValue - Value to return on failure (default `0`)
   * @returns Parsed float or `defaultValue`
   *
   * @example
   * ```typescript
   * NumberUtils.safeParseFloat("3.14") // => 3.14
   * NumberUtils.safeParseFloat("x", 1) // => 1
   * NumberUtils.safeParseFloat(2)      // => 2
   * ```
   */
  safeParseFloat(input: unknown, defaultValue = 0): number {
    if (typeof input === "number") {
      return Number.isFinite(input) ? input : defaultValue;
    }
    if (typeof input === "string") {
      const s = input.trim();
      if (s.length === 0) return defaultValue;
      const n = Number.parseFloat(s);
      return Number.isFinite(n) ? n : defaultValue;
    }
    return defaultValue;
  },
} as const;
