/**
 * @fileoverview Environment variable utility helpers.
 *
 * Provides helpers for parsing environment variables.
 */

import { ConfigurationError } from "@fabianopinto/errors";

export const EnvUtils = {
  /**
   * Get an environment variable value or a default when not set.
   *
   * @param name - Environment variable name
   * @param defaultValue - Fallback returned when not set or empty
   * @returns Trimmed value or defaultValue
   *
   * @example
   * // Suppose process.env.PORT = " 3000 "
   * EnvUtils.getEnv("PORT") // => "3000"
   * EnvUtils.getEnv("MISSING", "8080") // => "8080"
   */
  getEnv(name: string, defaultValue?: string): string | undefined {
    const v = process.env[name];
    if (v == null) return defaultValue;
    const trimmed = String(v).trim();
    return trimmed === "" ? defaultValue : trimmed;
  },

  /**
   * Get an environment variable value or throw if missing.
   *
   * @param name - Environment variable name
   * @returns Trimmed value
   * @throws {ConfigurationError} When the variable is missing or empty
   *
   * @example
   * // Throws if not set
   * const secret = EnvUtils.requireEnv("API_SECRET")
   */
  requireEnv(name: string): string {
    const v = EnvUtils.getEnv(name);
    if (v == null || v === "") {
      throw new ConfigurationError(`Missing required environment variable: ${name}`, {
        code: "ERR_ENV_MISSING",
        context: { name },
        isOperational: true,
      });
    }
    return v;
  },

  /**
   * Parse a boolean environment variable.
   *
   * Accepts common truthy values: `true, 1, yes, y, on` and falsy values:
   * `false, 0, no, n, off` (case-insensitive). Returns default when not set or unrecognized.
   *
   * @param name - Environment variable name
   * @param defaultValue - Fallback returned when not set or empty
   * @returns Trimmed value or defaultValue
   *
   * @example
   * // Suppose process.env.DEBUG = "yes"
   * EnvUtils.getBoolEnv("DEBUG", false) // => true
   */
  getBoolEnv(name: string, defaultValue = false): boolean {
    const v = EnvUtils.getEnv(name);
    if (v == null) return defaultValue;
    const s = v.toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(s)) return true;
    if (["false", "0", "no", "n", "off"].includes(s)) return false;
    return defaultValue;
  },

  /**
   * Parse a numeric environment variable.
   *
   * Returns the default value when missing or not a finite number.
   *
   * @param name - Environment variable name
   * @param defaultValue - Fallback returned when not set or empty
   * @returns Trimmed value or defaultValue
   *
   * @example
   * // Suppose process.env.TIMEOUT = "2500"
   * EnvUtils.getNumberEnv("TIMEOUT", 1000) // => 2500
   */
  getNumberEnv(name: string, defaultValue = 0): number {
    const v = EnvUtils.getEnv(name);
    if (v == null) return defaultValue;
    const n = Number(v);
    return Number.isFinite(n) ? n : defaultValue;
  },

  /**
   * Parse a JSON environment variable.
   *
   * Returns defaultValue on parse failure.
   *
   * @param name - Environment variable name
   * @param defaultValue - Fallback returned when not set or empty
   * @returns Trimmed value or defaultValue
   *
   * @example
   * // Suppose process.env.FEATURE_FLAGS = '{"beta":true}'
   * EnvUtils.getJsonEnv<{ beta: boolean }>("FEATURE_FLAGS") // => { beta: true }
   * EnvUtils.getJsonEnv("BAD_JSON", { beta: false }) // => { beta: false }
   */
  getJsonEnv<T = unknown>(name: string, defaultValue?: T): T | undefined {
    const v = EnvUtils.getEnv(name);
    if (v == null) return defaultValue;
    try {
      return JSON.parse(v) as T;
    } catch {
      return defaultValue;
    }
  },
} as const;
