/**
 * @fileoverview Date/time utility helpers (pure functions).
 *
 * Provides common helpers for date formatting, conversions, comparisons,
 * arithmetic, duration parsing, and simple async timing utilities.
 */

/**
 * Internal helper to throw consistent errors for invalid durations
 * @param kind - Type of error ("type" or "syntax")
 * @param reason - Reason for the error
 * @param input - Input value that caused the error
 */
function throwDurationError(kind: "type" | "syntax", reason: string, input: unknown): never {
  const msg = `Invalid duration: ${reason}. input=${String(input)}`;
  if (kind === "type") throw new TypeError(msg);
  throw new SyntaxError(msg);
}

export const DateUtils = {
  /**
   * Return an ISO-8601 string without milliseconds.
   *
   * @param date - Date instance (defaults to `new Date()`)
   * @returns ISO string without milliseconds
   *
   * @example
   * DateUtils.formatISO(new Date("2020-01-01T12:34:56.789Z")) // => "2020-01-01T12:34:56.000Z"
   */
  formatISO(date: Date = new Date()): string {
    const d = new Date(date.getTime());
    d.setMilliseconds(0);
    return d.toISOString();
  },

  /**
   * Get the current timestamp as ISO-8601 (includes milliseconds).
   *
   * @returns ISO string with milliseconds
   *
   * @example
   * DateUtils.getCurrentTimestamp() // => "2020-01-01T12:34:56.789Z"
   */
  getCurrentTimestamp(): string {
    return new Date().toISOString();
  },

  /**
   * Convert a Date (or now) to a Unix timestamp in seconds.
   *
   * @param date - Date instance (defaults to `new Date()`)
   * @returns Unix timestamp in seconds
   *
   * @example
   * DateUtils.toUnix(new Date("2020-01-01T12:34:56.789Z")) // => 1577836496
   */
  toUnix(date: Date = new Date()): number {
    return Math.floor(date.getTime() / 1000);
  },

  /**
   * Convert a Unix timestamp in seconds to a Date.
   *
   * @param seconds - Unix timestamp in seconds
   * @returns Date instance
   *
   * @example
   * DateUtils.fromUnix(1577836496) // => Date("2020-01-01T12:34:56.789Z")
   */
  fromUnix(seconds: number): Date {
    return new Date(seconds * 1000);
  },

  /**
   * Whether two dates fall on the same UTC calendar day.
   *
   * @param a - First date
   * @param b - Second date
   * @returns True if both dates fall on the same UTC calendar day
   *
   * @example
   * DateUtils.isSameDay(new Date("2020-01-01T12:34:56.789Z"), new Date("2020-01-01T12:34:56.789Z")) // => true
   */
  isSameDay(a: Date, b: Date): boolean {
    return (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate()
    );
  },

  /**
   * Return a new Date equal to `date` plus `days` days.
   *
   * @param date - Base date
   * @param days - Number of days to add
   * @returns New Date instance
   *
   * @example
   * DateUtils.addDays(new Date("2020-01-01T12:34:56.789Z"), 1) // => Date("2020-01-02T12:34:56.789Z")
   */
  addDays(date: Date, days: number): Date {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  },

  /**
   * Whether `date` is strictly before the `reference` time (defaults to now).
   *
   * @param date - Base date
   * @param reference - Reference date (defaults to current time)
   * @returns True if `date` is before `reference`
   *
   * @example
   * DateUtils.isExpired(new Date("2020-01-01T12:34:56.789Z")) // => false
   * DateUtils.isExpired(new Date("2020-01-01T12:34:56.789Z"), new Date("2020-01-02T12:34:56.789Z")) // => true
   */
  isExpired(date: Date, reference: Date = new Date()): boolean {
    return date.getTime() < reference.getTime();
  },

  /**
   * Parse a human-readable duration string to milliseconds.
   *
   * Supports compound values like `"1h30m"`, fractional units like `"1.5h"`,
   * negative values, and bare millisecond numbers (e.g., `"1500"`).
   *
   * Units: `ms`, `s`, `m`, `h`, `d`, `w`.
   *
   * @param input - Duration string (or bare millisecond string)
   * @returns Milliseconds (truncated to integer)
   * @throws {TypeError|SyntaxError} When input is invalid
   *
   * @example
   * DateUtils.parseDuration("1.5h") // => 5400000
   * DateUtils.parseDuration("1h 30m") // => 5400000
   * DateUtils.parseDuration("1500") // => 1500
   */
  parseDuration(input: string): number {
    if (typeof input !== "string") {
      throwDurationError("type", "expected a string", input);
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      throwDurationError("syntax", "empty string", input);
    }

    const unitToMs = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    } as const;

    // Match sequences like 1.5h, 30m, 45s, 200ms (case-insensitive)
    const re = /(-?\d+(?:\.\d+)?)(ms|s|m|h|d|w)/gi;
    let match: RegExpExecArray | null;
    let total = 0;
    let matchedAny = false;

    while ((match = re.exec(trimmed)) !== null) {
      matchedAny = true;
      const value = parseFloat(match[1]!);
      const unit = match[2]!.toLowerCase() as keyof typeof unitToMs;
      const factor = unitToMs[unit];
      total += value * factor;
    }

    if (matchedAny) return Math.trunc(total);

    // If no unit parts matched, try to parse as a bare millisecond number
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) return Math.trunc(asNumber);

    throwDurationError("syntax", "could not parse", input);
  },

  /**
   * Promise that resolves after a delay. Accepts ms number or duration string.
   *
   * @param duration - Milliseconds (number) or a duration string (e.g. "1.5h", "30s")
   * @returns Promise that resolves after the specified duration
   *
   * @example
   * await DateUtils.wait("1s")
   * await DateUtils.wait(500)
   */
  wait(duration: number | string): Promise<void> {
    let ms: number;
    if (typeof duration === "number") {
      ms = duration;
    } else if (typeof duration === "string") {
      ms = DateUtils.parseDuration(duration);
    } else {
      throwDurationError("type", "expected a number or string", duration);
    }
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  },
} as const;
