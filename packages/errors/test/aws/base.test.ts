import { describe, it, expect } from "vitest";
import { AwsError, makeAwsServiceError, fromAwsError } from "../../src/aws";
import type { AppErrorOptions } from "../../src/base";

class DemoAwsError extends AwsError {}

describe("aws/base: AwsError static helpers", () => {
  const table: Array<[string, (msg?: string, opts?: AppErrorOptions) => AwsError, string, number]> =
    [
      ["authentication", AwsError.authentication, "AWS_AUTHENTICATION_ERROR", 401],
      ["accessDenied", AwsError.accessDenied, "AWS_ACCESS_DENIED", 403],
      ["throttling", AwsError.throttling, "AWS_THROTTLING", 429],
      ["timeout", AwsError.timeout, "AWS_TIMEOUT", 504],
      ["notFound", AwsError.notFound, "AWS_NOT_FOUND", 404],
      ["conflict", AwsError.conflict, "AWS_CONFLICT", 409],
      ["validation", AwsError.validation, "AWS_VALIDATION_ERROR", 400],
      ["serviceUnavailable", AwsError.serviceUnavailable, "AWS_SERVICE_UNAVAILABLE", 503],
      ["internal", AwsError.internal, "AWS_INTERNAL_ERROR", 500],
    ];

  it("creates instances with defaults and allows overrides", () => {
    for (const [name, factory, defaultCode, defaultStatus] of table) {
      const e1 = factory();
      expect(e1).toBeInstanceOf(AwsError);
      expect(e1.code).toBe(defaultCode);
      expect(e1.status).toBe(defaultStatus);

      const e2 = factory("msg", { code: "OVR", status: 999 });
      expect(e2.code).toBe("OVR");
      expect(e2.status).toBe(999);
    }
  });
});

describe("aws/base: fromAwsError", () => {
  class DemoCtor extends AwsError {}
  const FALLBACK = { code: "FALLBACK", status: 418 } as const;

  it("returns same instance when err is DemoCtor and no overrides provided", () => {
    const original = new DemoCtor("m", { code: "C", status: 200, context: { a: 1 } });
    const out = fromAwsError(DemoCtor, original, FALLBACK);
    expect(out).toBe(original);
  });

  it("clones DemoCtor with overrides: message override and context merge; falls back code/status via ??", () => {
    const original = new DemoCtor("keep", { context: { a: 1 } }); // code/status undefined
    const out = fromAwsError(DemoCtor, original, FALLBACK, "override", { b: 2 });
    expect(out).not.toBe(original);
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("override");
    expect(out.code).toBe(FALLBACK.code);
    expect(out.status).toBe(FALLBACK.status);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ a: 1, b: 2 });
  });

  it("when err is DemoCtor and isOperational is undefined, defaults to true via ?? in clone path", () => {
    const original = new DemoCtor("m", { code: "C", status: 200, context: { a: 1 } });
    // Force isOperational to be truly undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (original as any).isOperational;
    const out = fromAwsError(DemoCtor, original, FALLBACK, "override", { b: 2 });
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("override");
    expect(out.code).toBe("C");
    expect(out.status).toBe(200);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ a: 1, b: 2 });
  });

  it("when err is DemoCtor and message undefined, keeps original message and merges context", () => {
    const original = new DemoCtor("orig", { code: "C1", status: 201, context: { a: 1 } });
    const out = fromAwsError(DemoCtor, original, FALLBACK, undefined, { b: 2 });
    expect(out.message).toBe("orig");
    expect(out.code).toBe("C1");
    expect(out.status).toBe(201);
    expect(out.context).toEqual({ a: 1, b: 2 });
  });

  it("when err is DemoCtor and original context is undefined, uses provided context only (covers ...(err.context ?? {}))", () => {
    const original = new DemoCtor("m", { code: "C2", status: 202 }); // no context
    const out = fromAwsError(DemoCtor, original, FALLBACK, "override", { added: true });
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("override");
    expect(out.code).toBe("C2");
    expect(out.status).toBe(202);
    expect(out.context).toEqual({ added: true });
    expect(out.isOperational).toBe(true);
  });

  it("when err is DemoCtor, message defined and provided context undefined, preserves original context (covers ...(context ?? {}))", () => {
    const original = new DemoCtor("orig", { code: "C3", status: 207, context: { a: 1 } });
    const out = fromAwsError(DemoCtor, original, FALLBACK, "override", undefined);
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("override");
    expect(out.code).toBe("C3");
    expect(out.status).toBe(207);
    expect(out.context).toEqual({ a: 1 });
    expect(out.isOperational).toBe(true);
  });

  it("maps AppError to DemoCtor with fallback code/status and merges contexts; defaults isOperational when undefined", () => {
    const app = new AwsError("app", { status: 500, context: { s: 1 } });
    // remove isOperational to make it undefined for the ?? true path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (app as any).isOperational;
    const out = fromAwsError(DemoCtor, app, FALLBACK, undefined, { t: 2 });
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("app");
    expect(out.code).toBe(FALLBACK.code);
    expect(out.status).toBe(500);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ s: 1, t: 2 });
  });

  it("when err is AppError and provided context undefined, preserves original context", () => {
    const app = new AwsError("app", { status: 500, context: { a: 1 } });
    const out = fromAwsError(DemoCtor, app, FALLBACK, "m", undefined);
    expect(out.context).toEqual({ a: 1 });
  });

  it("when err is AppError and original context is undefined, uses provided context only (covers ...(err.context ?? {}))", () => {
    const app = new AwsError("app", { status: 500 }); // no context
    const out = fromAwsError(DemoCtor, app, FALLBACK, undefined, { added: true });
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("app");
    expect(out.code).toBe(FALLBACK.code);
    expect(out.status).toBe(500);
    expect(out.context).toEqual({ added: true });
  });

  it("when err is AppError and status is undefined, status falls back to fallback.status (covers status ?? fallback.status)", () => {
    const app = new AwsError("app", { context: { s: 1 } }); // status undefined
    const out = fromAwsError(DemoCtor, app, FALLBACK, undefined, { t: 2 });
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("app");
    expect(out.code).toBe(FALLBACK.code);
    expect(out.status).toBe(FALLBACK.status);
    expect(out.context).toEqual({ s: 1, t: 2 });
  });

  it("when err is native Error and message undefined, uses original message and fallback meta", () => {
    const e = new Error("boom");
    const out = fromAwsError(DemoCtor, e, FALLBACK);
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("boom");
    expect(out.code).toBe(FALLBACK.code);
    expect(out.status).toBe(FALLBACK.status);
    expect(out.isOperational).toBe(true);
    expect(out.cause).toBe(e);
  });

  it("when err is unknown non-error, uses default message 'AWS service error' and fallback meta, attaches cause", () => {
    const unknown = { u: 1 };
    const out = fromAwsError(DemoCtor, unknown, FALLBACK);
    expect(out).toBeInstanceOf(DemoCtor);
    expect(out.message).toBe("AWS service error");
    expect(out.code).toBe(FALLBACK.code);
    expect(out.status).toBe(FALLBACK.status);
    expect(out.isOperational).toBe(true);
    expect(out.cause).toEqual(unknown);
  });
});

describe("aws/base: makeAwsServiceError", () => {
  it("applies defaults, merges options and forces isOperational true by default", () => {
    const err = makeAwsServiceError(
      DemoAwsError,
      "message",
      { code: "DEFAULT", status: 418 },
      { context: { x: 1 } },
    );
    expect(err).toBeInstanceOf(DemoAwsError);
    expect(err.code).toBe("DEFAULT");
    expect(err.status).toBe(418);
    expect(err.isOperational).toBe(true);
    expect(err.context).toEqual({ x: 1 });
  });

  it("respects explicit isOperational override via options", () => {
    const err = makeAwsServiceError(
      DemoAwsError,
      "message",
      { code: "DEFAULT" },
      { isOperational: false },
    );
    expect(err.isOperational).toBe(false);
  });
});

describe("aws/base: AwsError constructor isOperational nullish default", () => {
  it("defaults to true when isOperational is undefined", () => {
    const e = new AwsError("msg");
    expect(e.isOperational).toBe(true);
  });

  it("respects explicit false", () => {
    const e = new AwsError("msg", { isOperational: false });
    expect(e.isOperational).toBe(false);
  });

  it("respects explicit true", () => {
    const e = new AwsError("msg", { isOperational: true });
    expect(e.isOperational).toBe(true);
  });
});
