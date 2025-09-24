/**
 * @fileoverview Snapshot-like toJSON shape tests for ThirdPartyServiceError.
 */

import { describe, expect, it } from "vitest";
import { AppError } from "../src/base";
import { ThirdPartyErrorCodes, ThirdPartyServiceError } from "../src/third-party";

describe("ThirdPartyServiceError toJSON", () => {
  it("timeout() includes code/status/context and cause", () => {
    const cause = new Error("gateway timeout");
    const err = ThirdPartyServiceError.timeout("remote timed out", {
      cause,
      context: { provider: "acme" },
    });
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: "ThirdPartyServiceError",
      message: "remote timed out",
      code: ThirdPartyErrorCodes.TIMEOUT,
      status: 504,
      isOperational: true,
      context: { provider: "acme" },
    } as any);
    expect(json.cause).toMatchObject({ name: "Error", message: "gateway timeout" });
    expect(typeof json.stack === "string" || json.stack === undefined).toBe(true);
  });

  it("validation() serializes properly with merged context", () => {
    const err = ThirdPartyServiceError.validation("bad contract", {
      context: { endpoint: "/foo" },
    });
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: "ThirdPartyServiceError",
      code: ThirdPartyErrorCodes.VALIDATION_ERROR,
      status: 400,
      isOperational: true,
      context: { endpoint: "/foo" },
    } as any);
  });
});

describe("ThirdPartyServiceError.withContext", () => {
  it("merges extra context and preserves properties", () => {
    const base = new ThirdPartyServiceError("m", {
      code: ThirdPartyErrorCodes.TIMEOUT,
      status: 504,
      context: { a: 1 },
    });
    const next = base.withContext({ b: 2 });
    expect(next).not.toBe(base);
    expect(next.message).toBe("m");
    expect(next.code).toBe(ThirdPartyErrorCodes.TIMEOUT);
    expect(next.status).toBe(504);
    expect(next.context).toEqual({ a: 1, b: 2 });
    expect(next.isOperational).toBe(true);
  });

  it("handles undefined initial context (covers ...(this.context ?? {}))", () => {
    const base = new ThirdPartyServiceError("m");
    const next = base.withContext({ added: true });
    expect(next.context).toEqual({ added: true });
  });
});

describe("ThirdPartyServiceError.is type guard", () => {
  it("returns true for ThirdPartyServiceError instances", () => {
    expect(ThirdPartyServiceError.is(new ThirdPartyServiceError("x"))).toBe(true);
  });
  it("returns false for others", () => {
    expect(ThirdPartyServiceError.is(new Error("e"))).toBe(false);
    class NotTP extends Error {}
    expect(ThirdPartyServiceError.is(new NotTP())).toBe(false);
  });
});

describe("ThirdPartyServiceError.from", () => {
  it("returns same instance when no overrides given", () => {
    const original = ThirdPartyServiceError.timeout("t", { context: { a: 1 } });
    const out = ThirdPartyServiceError.from(original);
    expect(out).toBe(original);
  });

  it("clones with overrides and merges context", () => {
    const original = ThirdPartyServiceError.timeout("t", { context: { a: 1 }, status: 504 });
    const out = ThirdPartyServiceError.from(original, "new msg", { b: 2 });
    expect(out).not.toBe(original);
    expect(out.message).toBe("new msg");
    expect(out.code).toBe(ThirdPartyErrorCodes.TIMEOUT);
    expect(out.status).toBe(504);
    expect(out.context).toEqual({ a: 1, b: 2 });
    expect(out.isOperational).toBe(true);
  });

  it("uses original message when override undefined and merges context (covers message ?? err.message)", () => {
    const original = ThirdPartyServiceError.timeout("keep", { context: { a: 1 } });
    const out = ThirdPartyServiceError.from(original, undefined, { b: 2 });
    expect(out.message).toBe("keep");
    expect(out.context).toEqual({ a: 1, b: 2 });
  });

  it("clones ThirdPartyServiceError with original context undefined and uses provided context only (covers ...(err.context ?? {}))", () => {
    const original = new ThirdPartyServiceError("msg"); // no context
    const out = ThirdPartyServiceError.from(original, undefined, { added: true });
    expect(out).not.toBe(original);
    expect(out).toBeInstanceOf(ThirdPartyServiceError);
    expect(out.message).toBe("msg");
    expect(out.context).toEqual({ added: true });
    expect(out.isOperational).toBe(true);
  });

  it("when message defined and context undefined, preserves original context and overrides message (covers ...(context ?? {}))", () => {
    const original = ThirdPartyServiceError.timeout("m", { context: { a: 1 } });
    const out = ThirdPartyServiceError.from(original, "override", undefined);
    expect(out).not.toBe(original);
    expect(out).toBeInstanceOf(ThirdPartyServiceError);
    expect(out.message).toBe("override");
    expect(out.code).toBe(ThirdPartyErrorCodes.TIMEOUT);
    expect(out.status).toBe(504);
    expect(out.context).toEqual({ a: 1 });
    expect(out.isOperational).toBe(true);
  });

  it("AppError maps to ThirdPartyServiceError with default code and isOperational=true when undefined", () => {
    const app = new AppError("app", { status: 502, context: { s: 1 } });
    // Force isOperational to be truly undefined to exercise ?? true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (app as any).isOperational;
    const out = ThirdPartyServiceError.from(app, undefined, { t: 2 });
    expect(out).toBeInstanceOf(ThirdPartyServiceError);
    expect(out.message).toBe("app");
    expect(out.code).toBe(ThirdPartyErrorCodes.INTERNAL_ERROR);
    expect(out.status).toBe(502);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ s: 1, t: 2 });
    expect(out.cause).toBe(app);
  });

  it("wraps native Error and uses original message when override is undefined", () => {
    const e = new Error("boom");
    const out = ThirdPartyServiceError.from(e);
    expect(out).toBeInstanceOf(ThirdPartyServiceError);
    expect(out.message).toBe("boom");
    expect(out.code).toBeUndefined();
    expect(out.status).toBeUndefined();
    expect(out.cause).toBe(e);
  });

  it("wraps non-error unknown with default message", () => {
    const out = ThirdPartyServiceError.from({ any: true });
    expect(out.message).toBe("Third-party service error");
    expect(out.cause).toEqual({ any: true });
  });

  it("AppError branch with undefined original context uses only provided context (covers ...(err.context ?? {}))", () => {
    const app = new AppError("ctx", { status: 500 });
    const out = ThirdPartyServiceError.from(app, undefined, { added: true });
    expect(out.context).toEqual({ added: true });
  });

  it("AppError branch with provided context undefined preserves original context (covers ...(context ?? {}))", () => {
    const app = new AppError("ctx", { status: 500, context: { a: 1 } });
    const out = ThirdPartyServiceError.from(app, undefined, undefined);
    expect(out.context).toEqual({ a: 1 });
  });
});

describe("Third-party factory helpers", () => {
  it("produce expected code/status and are operational", () => {
    const cases = [
      [ThirdPartyServiceError.authentication("m"), ThirdPartyErrorCodes.AUTHENTICATION_ERROR, 401],
      [ThirdPartyServiceError.accessDenied("m"), ThirdPartyErrorCodes.ACCESS_DENIED, 403],
      [ThirdPartyServiceError.throttling("m"), ThirdPartyErrorCodes.THROTTLING, 429],
      [ThirdPartyServiceError.rateLimit("m"), ThirdPartyErrorCodes.RATE_LIMIT, 429],
      [ThirdPartyServiceError.timeout("m"), ThirdPartyErrorCodes.TIMEOUT, 504],
      [ThirdPartyServiceError.notFound("m"), ThirdPartyErrorCodes.NOT_FOUND, 404],
      [ThirdPartyServiceError.conflict("m"), ThirdPartyErrorCodes.CONFLICT, 409],
      [ThirdPartyServiceError.validation("m"), ThirdPartyErrorCodes.VALIDATION_ERROR, 400],
      [
        ThirdPartyServiceError.serviceUnavailable("m"),
        ThirdPartyErrorCodes.SERVICE_UNAVAILABLE,
        503,
      ],
      [ThirdPartyServiceError.internal("m"), ThirdPartyErrorCodes.INTERNAL_ERROR, 500],
    ] as const;

    for (const [err, code, status] of cases) {
      expect(err).toBeInstanceOf(ThirdPartyServiceError);
      expect(err.code).toBe(code);
      expect(err.status).toBe(status);
      expect(err.isOperational).toBe(true);
    }
  });
});
