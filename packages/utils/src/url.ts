/**
 * @fileoverview URL and query utilities.
 *
 * Lightweight helpers for URL path joining and query string manipulation.
 */

export const UrlUtils = {
  /**
   * Joins base URL with path ensuring single slash.
   *
   * @param base - Base URL or path
   * @param path - Path to append
   * @returns Joined URL string with a single slash between parts
   *
   * @example
   * ```typescript
   * UrlUtils.join("https://api.example.com/", "/v1/users")
   * // => "https://api.example.com/v1/users"
   * UrlUtils.join("/root/", "child") // => "/root/child"
   * ```
   */
  join(base: string, path: string): string {
    if (!base) return path;
    if (!path) return base;
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  },

  /**
   * Adds or replaces query parameters on a URL string.
   *
   * @param url - URL or path string
   * @param params - Key/value pairs to set as query parameters (`undefined`
   *   values are skipped)
   * @returns URL with updated query string
   *
   * @example
   * ```typescript
   * UrlUtils.withQuery("/users", { page: 2, q: "john" })
   * // => "/users?page=2&q=john"
   * UrlUtils.withQuery("https://x.dev?a=1", { a: 3, b: "y" })
   * // => "https://x.dev/?a=3&b=y"
   * ```
   */
  withQuery(url: string, params: Record<string, string | number | boolean | undefined>): string {
    const u = new URL(url, "resolve://");
    // In Node, URL requires a base for relative paths; we strip it later
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      u.searchParams.set(k, String(v));
    }
    let out = u.toString();
    out = out.replace(/^resolve:\/\//, "");
    return out;
  },

  /**
   * Converts an object to a query string without leading `'?'`.
   *
   * @param params - Key/value pairs (`undefined` values are skipped)
   * @returns Encoded query string (without leading `'?'`)
   *
   * @example
   * ```typescript
   * UrlUtils.toQueryString({ a: 1, b: "x", skip: undefined })
   * // => "a=1&b=x"
   * ```
   */
  toQueryString(params: Record<string, string | number | boolean | undefined>): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      usp.append(k, String(v));
    }
    return usp.toString();
  },

  /**
   * Parse a query string (with or without leading `'?'`) or a full URL into an
   * object.
   *
   * Duplicate keys are coalesced into arrays.
   *
   * @param input - Query string or full URL
   * @returns Object mapping keys to string or `string[]` values
   *
   * @example
   * ```typescript
   * UrlUtils.parseQueryString("?a=1&b=x&b=y")
   * // => { a: "1", b: ["x","y"] }
   * UrlUtils.parseQueryString("https://x.dev/path?a=1")
   * // => { a: "1" }
   * ```
   */
  parseQueryString(input: string): Record<string, string | string[]> {
    let usp: URLSearchParams;
    // If the input looks like a full URL, use URL to parse; otherwise treat as a plain query string
    if (input.includes("://")) {
      const u = new URL(input);
      usp = u.searchParams;
    } else {
      const s = input.startsWith("?") ? input.slice(1) : input;
      usp = new URLSearchParams(s);
    }
    const out: Record<string, string | string[]> = {};
    for (const [k, v] of usp.entries()) {
      const existing = out[k];
      if (existing === undefined) out[k] = v;
      else if (Array.isArray(existing)) existing.push(v);
      else out[k] = [existing, v];
    }
    return out;
  },
} as const;
