/**
 * @fileoverview String utility helpers (pure functions).
 *
 * Provides helpers for emptiness checks, whitespace normalization, casing
 * conversions, truncation, safe JSON parsing, and slug creation.
 */

/**
 * Tokenize a string into word parts from mixed casing and separators
 *
 * @param value - Input string
 * @returns Array of word parts
 */
function tokenize(value: string): string[] {
  const withBoundaries = value
    // Insert spaces between case boundaries (fooBar => foo Bar, HTTPServer => HTTP Server)
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  const cleaned = withBoundaries
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
  return cleaned.split(/[^A-Za-z0-9]+/g).filter(Boolean);
}

export const StringUtils = {
  /**
   * Returns true if the provided value is null/undefined or only whitespace.
   *
   * @param value - Value to check
   * @returns True when value is empty after trimming
   */
  isEmpty(value: string | null | undefined): boolean {
    return value == null || value.trim().length === 0;
  },

  /**
   * Convert a string to Title Case (each word capitalized, others lowercased).
   *
   * Uses the same tokenization rules as `toCamelCase` and friends.
   *
   * @param value - Input string
   * @returns Title-cased string with words separated by a single space
   *
   * @example
   * StringUtils.toTitleCase("hello world") // => "Hello World"
   * StringUtils.toTitleCase("HTTP server") // => "Http Server"
   */
  toTitleCase(value: string): string {
    const parts = tokenize(value);
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
  },

  /**
   * Collapses all whitespace runs to a single space and trims the ends.
   *
   * @param value - Input string
   * @returns Normalized string with single spaces
   *
   * @example
   * StringUtils.normalizeWhitespace("  a\t b\n c  ") // => "a b c"
   */
  normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  },

  /**
   * Capitalize the first letter of a string.
   *
   * @param value - Input string
   * @returns String with first character uppercased
   *
   * @example
   * StringUtils.capitalize("hello") // => "Hello"
   */
  capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  },

  /**
   * Convert a string to camelCase.
   *
   * @param value - Input string
   * @returns camelCased string
   *
   * @example
   * StringUtils.toCamelCase("hello world") // => "helloWorld"
   * StringUtils.toCamelCase("Hello_world") // => "helloWorld"
   * StringUtils.toCamelCase("HTTP server") // => "httpServer"
   */
  toCamelCase(value: string): string {
    const parts = tokenize(value);
    if (parts.length === 0) return "";
    const [first, ...rest] = parts as [string, ...string[]];
    return (
      first.toLowerCase() +
      rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("")
    );
  },

  /**
   * Convert a string to kebab-case.
   *
   * @param value - Input string
   * @returns kebab-cased string
   *
   * @example
   * StringUtils.toKebabCase("Hello World") // => "hello-world"
   * StringUtils.toKebabCase("HTTPServer")  // => "http-server"
   */
  toKebabCase(value: string): string {
    const parts = tokenize(value).map((p) => p.toLowerCase());
    return parts.join("-");
  },

  /**
   * Convert a string to snake_case.
   *
   * @param value - Input string
   * @returns snake_cased string
   *
   * @example
   * StringUtils.toSnakeCase("Hello World") // => "hello_world"
   * StringUtils.toSnakeCase("HTTPServer")  // => "http_server"
   */
  toSnakeCase(value: string): string {
    const parts = tokenize(value).map((p) => p.toLowerCase());
    return parts.join("_");
  },

  /**
   * Truncate a string to a maximum length and append an ellipsis if truncated.
   * Guarantees the returned string's length does not exceed `maxLength`.
   *
   * @param value - Input string
   * @param maxLength - Maximum length of the result
   * @param ellipsis - Ellipsis/suffix to use when truncating (default "…")
   * @returns Possibly truncated string
   *
   * @example
   * StringUtils.truncate("abcdef", 4) // => "abc…"
   * StringUtils.truncate("abc", 4)    // => "abc"
   */
  truncate(value: string, maxLength: number, ellipsis = "…"): string {
    if (maxLength <= 0) return "";
    if (value.length <= maxLength) return value;
    const safeEllipsis = ellipsis.slice(0, Math.max(0, maxLength));
    const sliceLen = Math.max(0, maxLength - safeEllipsis.length);
    return value.slice(0, sliceLen) + safeEllipsis.slice(0, maxLength - sliceLen);
  },

  /**
   * Safely parse a JSON string, returning undefined on failure.
   *
   * @param value - JSON string to parse
   * @returns Parsed value, or undefined if parsing fails
   *
   * @example
   * StringUtils.tryParseJson('{"a":1}') // => { a: 1 }
   * StringUtils.tryParseJson('not json') // => undefined
   */
  tryParseJson<T = unknown>(value: string): T | undefined {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  },

  /**
   * Convert a string to a URL-friendly slug.
   *
   * @param value - Input string
   * @returns Slugified string (lowercase, hyphen-separated)
   *
   * @example
   * StringUtils.slugify("Héllo, World!") // => "hello-world"
   */
  slugify(value: string): string {
    return value
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  },

  /**
   * Strip ANSI escape sequences from a string (e.g., terminal color codes).
   *
   * @param value - Input string potentially containing ANSI sequences
   * @returns Clean string without ANSI escape codes
   *
   * @example
   * StringUtils.stripAnsi("\u001B[31mError\u001B[0m") // => "Error"
   */
  stripAnsi(value: string): string {
    const re = /\u001B\[[0-?]*[ -\/]*[@-~]/g;
    return value.replace(re, "");
  },
} as const;
