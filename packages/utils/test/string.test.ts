/**
 * @fileoverview Unit tests for StringUtils in @t68/utils
 */

import { describe, it, expect } from "vitest";
import { StringUtils } from "../src/string";

describe("StringUtils", () => {
  it("isEmpty handles null/undefined and whitespace (short-circuit)", () => {
    expect(StringUtils.isEmpty(null)).toBe(true);
    expect(StringUtils.isEmpty(undefined)).toBe(true);
    expect(StringUtils.isEmpty("   ")).toBe(true);
    expect(StringUtils.isEmpty("x")).toBe(false);
  });

  it("toTitleCase tokenizes and capitalizes words", () => {
    expect(StringUtils.toTitleCase("hello world")).toBe("Hello World");
    expect(StringUtils.toTitleCase("HTTPServer Test")).toBe("Http Server Test");
  });

  it("normalizeWhitespace collapses and trims", () => {
    expect(StringUtils.normalizeWhitespace("  a\t b\n  c  ")).toBe("a b c");
  });

  it("capitalize handles empty string and capitalizes first letter", () => {
    expect(StringUtils.capitalize("")).toBe("");
    expect(StringUtils.capitalize("hello")).toBe("Hello");
  });

  it("toCamelCase converts correctly", () => {
    expect(StringUtils.toCamelCase("hello world")).toBe("helloWorld");
    expect(StringUtils.toCamelCase("Hello_world")).toBe("helloWorld");
    expect(StringUtils.toCamelCase("HTTP server")).toBe("httpServer");
    expect(StringUtils.toCamelCase("")).toBe("");
  });

  it("toKebabCase converts correctly", () => {
    expect(StringUtils.toKebabCase("Hello World")).toBe("hello-world");
    expect(StringUtils.toKebabCase("HTTPServer")).toBe("http-server");
  });

  it("toSnakeCase converts correctly", () => {
    expect(StringUtils.toSnakeCase("Hello World")).toBe("hello_world");
    expect(StringUtils.toSnakeCase("HTTPServer")).toBe("http_server");
  });

  describe("truncate", () => {
    it("truncates with ellipsis and respects maxLength", () => {
      expect(StringUtils.truncate("abcdef", 4)).toBe("abc…");
      expect(StringUtils.truncate("abc", 4)).toBe("abc");
      expect(StringUtils.truncate("abcdef", 2, "..")).toBe("..");
      expect(StringUtils.truncate("abcdef", 0)).toBe("");
    });
  });

  it("tryParseJson returns value or undefined on failure", () => {
    expect(StringUtils.tryParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    expect(StringUtils.tryParseJson("not json")).toBeUndefined();
  });

  it("slugify normalizes and strips non-url chars", () => {
    expect(StringUtils.slugify("Héllo, World!")).toBe("hello-world");
    expect(StringUtils.slugify("  Multiple---Spaces  ")).toBe("multiple-spaces");
  });

  it("stripAnsi removes escape sequences", () => {
    expect(StringUtils.stripAnsi("\u001B[31mError\u001B[0m")).toBe("Error");
  });
});
