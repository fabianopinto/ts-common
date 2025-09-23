/**
 * @fileoverview Unit tests for UrlUtils in @t68/utils
 */

import { describe, it, expect } from "vitest";
import { UrlUtils } from "../src/url";

describe("UrlUtils", () => {
  describe("join", () => {
    it("joins and normalizes slashes", () => {
      expect(UrlUtils.join("https://api.example.com/", "/v1/users")).toBe(
        "https://api.example.com/v1/users",
      );
      expect(UrlUtils.join("/root/", "child")).toBe("/root/child");
      expect(UrlUtils.join("/root", "/child")).toBe("/root/child");
      expect(UrlUtils.join("", "/x")).toBe("/x"); // short-circuit when base empty
      expect(UrlUtils.join("/x", "")).toBe("/x"); // short-circuit when path empty
    });
  });

  describe("withQuery", () => {
    it("adds and replaces params; removes temporary base (ternary/short-circuit on undefined)", () => {
      expect(UrlUtils.withQuery("/users", { page: 2, q: "john", skip: undefined })).toBe(
        "/users?page=2&q=john",
      );
      expect(UrlUtils.withQuery("https://x.dev?a=1", { a: 3, b: "y" })).toBe(
        "https://x.dev/?a=3&b=y",
      );
    });
  });

  describe("toQueryString", () => {
    it("encodes and skips undefined", () => {
      expect(UrlUtils.toQueryString({ a: 1, b: "x", skip: undefined })).toBe("a=1&b=x");
    });
  });

  describe("parseQueryString", () => {
    it("parses from string with or without leading ? and coalesces duplicates", () => {
      expect(UrlUtils.parseQueryString("?a=1&b=x&b=y")).toEqual({ a: "1", b: ["x", "y"] });
      expect(UrlUtils.parseQueryString("?a=1&b=2")).toEqual({ a: "1", b: "2" });
    });

    it("parses from full URL", () => {
      expect(UrlUtils.parseQueryString("https://x.dev/path?a=1")).toEqual({ a: "1" });
    });

    it("parses from string without leading ? (covers ternary false branch)", () => {
      expect(UrlUtils.parseQueryString("a=1&b=x&b=y")).toEqual({ a: "1", b: ["x", "y"] });
      expect(UrlUtils.parseQueryString("a=1&b=2")).toEqual({ a: "1", b: "2" });
    });

    it("coalesces 3+ duplicates by pushing into existing array (covers Array.isArray branch)", () => {
      expect(UrlUtils.parseQueryString("b=x&b=y&b=z")).toEqual({ b: ["x", "y", "z"] });
    });
  });
});
