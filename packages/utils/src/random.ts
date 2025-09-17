/**
 * @fileoverview Random and UUID utility helpers.
 *
 * Provides utility functions for generating random numbers and UUIDs.
 *
 * Design:
 * - Pure, non-mutating functions
 * - Default behavior with extensible options
 * - Uses built-in Node.js crypto module for secure random number generation
 */

import { randomBytes, randomInt as nodeRandomInt, randomUUID as nodeRandomUUID } from "node:crypto";

/**
 * Generate random int using rejection sampling to avoid modulo bias.
 *
 * This function uses rejection sampling to avoid the modulo bias that can occur
 * when generating random numbers within a range using the modulo operator.
 *
 * @param min - The minimum value of the range (inclusive)
 * @param max - The maximum value of the range (inclusive)
 * @returns A random integer in the range [min, max]
 * @throws {RangeError} If min > max or the range is invalid
 */
function randomIntRejection(min: number, max: number): number {
  const range = BigInt(max) - BigInt(min) + 1n;
  if (range <= 0n) throw new RangeError("Invalid range");
  const bytesNeeded = Math.ceil(Number(range.toString(2).length) / 8);
  const maxNum = 1n << BigInt(bytesNeeded * 8);
  const cutoff = maxNum - (maxNum % range);
  while (true) {
    const buf = randomBytes(bytesNeeded);
    let val = 0n;
    for (let i = 0; i < buf.length; i++) {
      val = (val << 8n) + BigInt(buf[i]!);
    }
    if (val < cutoff) {
      const result = Number((val % range) + BigInt(min));
      return result;
    }
  }
}

export const RandomUtils = {
  /**
   * Generate a RFC 4122 v4 UUID.
   *
   * @returns A random UUID string
   */
  uuid(): string {
    if (typeof nodeRandomUUID === "function") {
      return nodeRandomUUID();
    }
    const buf = randomBytes(16);
    buf[6]! = (buf[6]! & 0x0f) | 0x40; // Version 4
    buf[8]! = (buf[8]! & 0x3f) | 0x80; // Variant 10xxxxxx
    const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
    return (
      hex.slice(0, 8) +
      "-" +
      hex.slice(8, 12) +
      "-" +
      hex.slice(12, 16) +
      "-" +
      hex.slice(16, 20) +
      "-" +
      hex.slice(20)
    );
  },

  /**
   * Generate a random integer in the inclusive range [min, max].
   *
   * Uses Node's CSPRNG and applies rejection sampling when needed to avoid modulo bias.
   *
   * @param min - The minimum value of the range (inclusive)
   * @param max - The maximum value of the range (inclusive)
   * @returns A random integer in the range [min, max]
   * @throws {RangeError} If min > max or the range is invalid
   */
  randomInt(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max))
      throw new RangeError("Bounds must be finite numbers");
    min = Math.ceil(min);
    max = Math.floor(max);
    if (min > max) throw new RangeError("min must be <= max");
    if (min === max) return min;
    if (max === Number.MAX_SAFE_INTEGER) {
      return randomIntRejection(min, max);
    }
    return nodeRandomInt(min, max + 1);
  },

  /**
   * Generate a random string from the provided character set.
   *
   * @param length - Desired output length
   * @param charset - Characters to sample from (default: alphanumeric)
   * @returns A random string of the specified length
   */
  randomString(
    length: number,
    charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  ): string {
    if (length < 0) throw new RangeError("length must be >= 0");
    if (length === 0) return "";
    if (!charset || charset.length === 0) throw new RangeError("charset must be non-empty");

    const chars = charset;
    const out: string[] = new Array(length);
    const charCount = chars.length;

    const maxMultiple = Math.floor(256 / charCount) * charCount;

    let i = 0;
    while (i < length) {
      const buf = randomBytes(Math.ceil((length - i) * 1.1));
      for (let j = 0; j < buf.length && i < length; j++) {
        const v = buf[j]!;
        if (v < maxMultiple) {
          const idx = v % charCount;
          out[i++] = chars.charAt(idx);
        }
      }
    }

    return out.join("");
  },

  /**
   * Pick a single random element from a non-empty array.
   *
   * @param arr - The array to pick from
   * @returns A random element from the array
   * @throws {RangeError} If the array is empty
   */
  pickOne<T>(arr: T[]): T {
    if (arr.length === 0) throw new RangeError("array must be non-empty");
    const idx = RandomUtils.randomInt(0, arr.length - 1);
    return arr[idx]!;
  },

  /**
   * Return a new array with elements shuffled using Fisher–Yates.
   *
   * @param arr - The array to shuffle
   * @returns A new array with elements shuffled
   */
  shuffle<T>(arr: T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = RandomUtils.randomInt(0, i);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  },
} as const;

// Internal/test-only exports
// Expose internal helpers for unit testing without changing the public API surface
export const __test = {
  randomIntRejection,
} as const;
