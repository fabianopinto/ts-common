/**
 * @fileoverview Unit tests for ConfigurationError and related helpers.
 */

import { describe, it, expect } from "vitest";
import {
  ConfigurationError,
  ConfigErrorCodes,
  ERR_CONFIG_INVALID,
  ERR_CONFIG_MISSING,
  ERR_CONFIG_PARSE,
  ERR_ENV_MISSING,
  type ErrorContext,
} from "../src/config";
import { AppError } from "../src/base";

describe("ConfigurationError", () => {
  it("should construct with defaults (non-operational)", () => {
    const err = new ConfigurationError("cfg error");
    expect(err).toBeInstanceOf(ConfigurationError);
    expect(err.isOperational).toBe(false);
    expect(err.code).toBeUndefined();
    expect(err.status).toBeUndefined();
  });

  it("codes constant and named exports should match", () => {
    expect(ConfigErrorCodes.INVALID).toBe(ERR_CONFIG_INVALID);
    expect(ConfigErrorCodes.MISSING).toBe(ERR_CONFIG_MISSING);
    expect(ConfigErrorCodes.PARSE).toBe(ERR_CONFIG_PARSE);
    expect(ConfigErrorCodes.ENV_MISSING).toBe(ERR_ENV_MISSING);
  });

  it("withContext should merge context and preserve properties", () => {
    const base = new ConfigurationError("msg", {
      code: ERR_CONFIG_INVALID,
      status: 400,
      isOperational: false,
      context: { a: 1 },
    });
    const extra: ErrorContext = { b: 2 };
    const next = base.withContext(extra);
    expect(next).not.toBe(base);
    expect(next.message).toBe("msg");
    expect(next.code).toBe(ERR_CONFIG_INVALID);
    expect(next.status).toBe(400);
    expect(next.isOperational).toBe(false);
    expect(next.context).toEqual({ a: 1, b: 2 });
  });

  it("withContext should handle empty initial context (nullish)", () => {
    const base = new ConfigurationError("msg");
    const extra: ErrorContext = { only: "extra" };
    const next = base.withContext(extra);
    expect(next.context).toEqual({ only: "extra" });
  });

  it("withContext should allow extra to override existing keys (spread order)", () => {
    const base = new ConfigurationError("msg", { context: { k: 1, keep: true } });
    const next = base.withContext({ k: 2 });
    expect(next.context).toEqual({ k: 2, keep: true });
  });

  it("is() type guard should detect ConfigurationError", () => {
    const err = new ConfigurationError("x");
    expect(ConfigurationError.is(err)).toBe(true);
    expect(ConfigurationError.is(new Error("e"))).toBe(false);
  });

  describe("from", () => {
    it("should return same instance when already ConfigurationError and no overrides", () => {
      const original = new ConfigurationError("orig", { code: ERR_CONFIG_INVALID });
      const out = ConfigurationError.from(original);
      expect(out).toBe(original);
    });

    it("should rewrap ConfigurationError when overrides provided", () => {
      const original = new ConfigurationError("orig", {
        code: ERR_CONFIG_INVALID,
        status: 400,
        isOperational: false,
        context: { k: 1 },
      });
      const out = ConfigurationError.from(original, "new", { x: 2 });
      expect(out).not.toBe(original);
      expect(out.message).toBe("new");
      expect(out.code).toBe(ERR_CONFIG_INVALID);
      expect(out.status).toBe(400);
      expect(out.isOperational).toBe(false);
      expect(out.context).toEqual({ k: 1, x: 2 });
    });

    it("should rewrap when only context is provided (message undefined)", () => {
      const original = new ConfigurationError("orig", {
        code: ERR_CONFIG_INVALID,
        status: 400,
        isOperational: false,
        context: { a: 1 },
      });
      const out = ConfigurationError.from(original, undefined, { b: 2 });
      expect(out).not.toBe(original);
      expect(out.message).toBe("orig"); // message falls back to original when undefined
      expect(out.code).toBe(ERR_CONFIG_INVALID);
      expect(out.status).toBe(400);
      expect(out.isOperational).toBe(false);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("should rewrap ConfigurationError with undefined original context and merge provided context", () => {
      const original = new ConfigurationError("orig-noctx", {
        code: ERR_CONFIG_INVALID,
        status: 401,
        isOperational: false,
      });
      const out = ConfigurationError.from(original, undefined, { only: true });
      expect(out).not.toBe(original);
      expect(out.message).toBe("orig-noctx");
      expect(out.code).toBe(ERR_CONFIG_INVALID);
      expect(out.status).toBe(401);
      expect(out.isOperational).toBe(false);
      expect(out.context).toEqual({ only: true }); // merge from undefined original context
    });

    it("should rewrap when message provided and context undefined (preserve original context)", () => {
      const original = new ConfigurationError("orig", {
        code: ERR_CONFIG_INVALID,
        status: 400,
        isOperational: false,
        context: { a: 1 },
      });
      const out = ConfigurationError.from(original, "new msg", undefined);
      expect(out).not.toBe(original);
      expect(out.message).toBe("new msg");
      expect(out.code).toBe(ERR_CONFIG_INVALID);
      expect(out.status).toBe(400);
      expect(out.isOperational).toBe(false);
      // context arg undefined should not change original context
      expect(out.context).toEqual({ a: 1 });
    });

    it("should wrap AppError preserving details", () => {
      const cause = new AppError("app", { code: "X", status: 418, isOperational: true, context: { k: 1 } });
      const out = ConfigurationError.from(cause, "cfg");
      expect(out.message).toBe("cfg");
      expect(out.code).toBe("X");
      expect(out.status).toBe(418);
      expect(out.isOperational).toBe(true);
      expect(out.cause).toBe(cause);
      expect(out.context).toEqual({ k: 1 });
    });

    it("should wrap AppError with undefined context and merge provided context (code fallback)", () => {
      const cause = new AppError("app without ctx", { status: 500, isOperational: true });
      const out = ConfigurationError.from(cause, undefined, { merged: true });
      expect(out).toBeInstanceOf(ConfigurationError);
      // code falls back to INVALID when AppError.code is undefined
      expect(out.code).toBe(ERR_CONFIG_INVALID);
      expect(out.status).toBe(500);
      expect(out.isOperational).toBe(true);
      expect(out.cause).toBe(cause);
      expect(out.context).toEqual({ merged: true });
    });

    it("should wrap native Error and keep message when no override", () => {
      const native = new Error("boom");
      const out = ConfigurationError.from(native);
      expect(out.message).toBe("boom");
      expect(out.cause).toBe(native);
    });

    it("should wrap unknown values with default message", () => {
      const out = ConfigurationError.from(42 as unknown);
      expect(out.message).toBe("Unknown configuration error");
      expect(out.cause).toBe(42);
    });
  });

  describe("parseFrom", () => {
    it("should produce parse error with reason in context when Error provided", () => {
      const native = new Error("invalid json");
      const out = ConfigurationError.parseFrom(native);
      expect(out.code).toBe(ERR_CONFIG_PARSE);
      expect(out.status).toBe(400);
      expect(out.isOperational).toBe(false);
      expect(out.context).toMatchObject({ reason: "invalid json" });
    });

    it("should include reason when non-nullish non-Error provided", () => {
      const out = ConfigurationError.parseFrom("bad", undefined, { where: "file" });
      expect(out.code).toBe(ERR_CONFIG_PARSE);
      expect(out.context).toMatchObject({ where: "file", reason: "bad" });
    });

    it("should pass through context unchanged when reason is undefined (nullish err)", () => {
      const out = ConfigurationError.parseFrom(undefined, undefined, { where: "file" });
      expect(out.code).toBe(ERR_CONFIG_PARSE);
      // Default message from parse() used when message is undefined and reason is absent
      expect(out.message).toBe("Configuration parse error");
      expect(out.context).toEqual({ where: "file" });
      expect(Object.prototype.hasOwnProperty.call(out.context ?? {}, "reason")).toBe(false);
    });
  });

  describe("factory helpers", () => {
    it("parse() should default code/status and be non-operational", () => {
      const out = ConfigurationError.parse();
      expect(out.code).toBe(ERR_CONFIG_PARSE);
      expect(out.status).toBe(400);
      expect(out.isOperational).toBe(false);
    });

    it("missingEnv() should be operational and annotate name", () => {
      const out = ConfigurationError.missingEnv("API_KEY");
      expect(out.code).toBe(ERR_ENV_MISSING);
      expect(out.status).toBe(500);
      expect(out.isOperational).toBe(true);
      expect(out.context).toMatchObject({ name: "API_KEY", domain: "env" });
    });

    it("missing() should default to 500 and non-operational", () => {
      const out = ConfigurationError.missing();
      expect(out.code).toBe(ERR_CONFIG_MISSING);
      expect(out.status).toBe(500);
      expect(out.isOperational).toBe(false);
    });

    it("notFound() should set status 404 and include path", () => {
      const out = ConfigurationError.notFound("db.url");
      expect(out.code).toBe(ERR_CONFIG_MISSING);
      expect(out.status).toBe(404);
      expect(out.context).toMatchObject({ path: "db.url", domain: "config", component: "configuration" });
    });

    it("invalid() should set status 400 and be non-operational", () => {
      const out = ConfigurationError.invalid();
      expect(out.code).toBe(ERR_CONFIG_INVALID);
      expect(out.status).toBe(400);
      expect(out.isOperational).toBe(false);
    });

    it("uninitialized() should mark domain/component and default to 500 non-operational", () => {
      const out = ConfigurationError.uninitialized("getConfig");
      expect(out.code).toBe(ERR_CONFIG_MISSING);
      expect(out.status).toBe(500);
      expect(out.isOperational).toBe(false);
      expect(out.context).toMatchObject({ source: "getConfig", domain: "config", component: "configuration" });
    });

    it("referenceResolution() should annotate reason when provided", () => {
      const out = ConfigurationError.referenceResolution("no env var");
      expect(out.code).toBe(ERR_CONFIG_PARSE);
      expect(out.status).toBe(400);
      expect(out.context).toMatchObject({ reason: "no env var", domain: "config", component: "configuration" });
    });

    it("referenceResolution() should omit reason when undefined", () => {
      const out = ConfigurationError.referenceResolution(undefined, undefined, { context: { x: 1 } });
      expect(out.code).toBe(ERR_CONFIG_PARSE);
      expect(out.status).toBe(400);
      // Should NOT have a reason key
      expect(out.context).toMatchObject({ x: 1, domain: "config", component: "configuration" });
      expect(Object.prototype.hasOwnProperty.call(out.context ?? {}, "reason")).toBe(false);
    });

    it("parse() toJSON snapshot-like structure", () => {
      const cause = new Error("bad");
      const out = ConfigurationError.parse("parse failed", { cause, context: { src: "file" } });
      const json = out.toJSON();
      // Shape assertions instead of brittle snapshot
      expect(json).toMatchObject({
        name: "ConfigurationError",
        message: "parse failed",
        code: ERR_CONFIG_PARSE,
        status: 400,
        isOperational: false,
        context: { src: "file" },
      } as any);
      expect(json.cause).toMatchObject({ name: "Error", message: "bad" });
      expect(typeof json.stack === "string" || json.stack === undefined).toBe(true);
    });

    it("missingEnv() toJSON includes domain and name in context", () => {
      const out = ConfigurationError.missingEnv("TOKEN", undefined, { context: { stage: "prod" } });
      const json = out.toJSON();
      expect(json).toMatchObject({
        name: "ConfigurationError",
        code: ERR_ENV_MISSING,
        status: 500,
        isOperational: true,
        context: { name: "TOKEN", domain: "env", stage: "prod" },
      } as any);
    });

    it("notFound() toJSON merges extra context", () => {
      const out = ConfigurationError.notFound("db.uri", undefined, { context: { env: "test" } });
      expect(out.toJSON()).toMatchObject({
        code: ERR_CONFIG_MISSING,
        status: 404,
        context: { path: "db.uri", component: "configuration", domain: "config", env: "test" },
      } as any);
    });

    it("invalid() toJSON remains non-operational", () => {
      const out = ConfigurationError.invalid("invalid cfg", { context: { key: "val" } });
      const json = out.toJSON();
      expect(json).toMatchObject({ code: ERR_CONFIG_INVALID, status: 400, isOperational: false });
      expect(json.context).toMatchObject({ key: "val" });
    });

    it("uninitialized() allows extra context and remains non-operational", () => {
      const out = ConfigurationError.uninitialized("bootstrap", undefined, { context: { region: "eu" } });
      const json = out.toJSON();
      expect(json).toMatchObject({ code: ERR_CONFIG_MISSING, status: 500, isOperational: false });
      expect(json.context).toMatchObject({ source: "bootstrap", component: "configuration", domain: "config", region: "eu" });
    });

    it("uninitialized() should omit source when undefined", () => {
      const out = ConfigurationError.uninitialized(undefined, undefined, { context: { env: "dev" } });
      const ctx = out.context ?? {};
      expect(out.code).toBe(ERR_CONFIG_MISSING);
      expect(out.status).toBe(500);
      expect(ctx).toMatchObject({ env: "dev", component: "configuration", domain: "config" });
      expect(Object.prototype.hasOwnProperty.call(ctx, "source")).toBe(false);
    });
  });

  describe("guards", () => {
    it("ensure throws invalid when falsy", () => {
      expect(() => ConfigurationError.ensure(0)).toThrowError(ConfigurationError);
    });

    it("require returns value and throws when nullish", () => {
      const value = ConfigurationError.require("x");
      expect(value).toBe("x");
      expect(() => ConfigurationError.require(null)).toThrowError(ConfigurationError);
    });
  });
});
