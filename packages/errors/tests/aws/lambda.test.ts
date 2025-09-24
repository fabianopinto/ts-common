import { describe, it, expect } from "vitest";
import { LambdaError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/lambda: LambdaError static helpers", () => {
  it("functionNotFound", () => {
    const e = LambdaError.functionNotFound();
    expect(e.code).toBe(AwsErrorCodes.Lambda.FUNCTION_NOT_FOUND);
    expect(e.status).toBe(404);
  });
  it("throttling, accessDenied, timeout, validation, serviceUnavailable, internal", () => {
    expect(LambdaError.throttling().code).toBe(AwsErrorCodes.Lambda.THROTTLING);
    expect(LambdaError.accessDenied().code).toBe(AwsErrorCodes.Lambda.ACCESS_DENIED);
    expect(LambdaError.timeout().code).toBe(AwsErrorCodes.Lambda.TIMEOUT);
    expect(LambdaError.validation().code).toBe(AwsErrorCodes.Lambda.VALIDATION_ERROR);
    expect(LambdaError.serviceUnavailable().code).toBe(AwsErrorCodes.Lambda.SERVICE_UNAVAILABLE);
    expect(LambdaError.internal().code).toBe(AwsErrorCodes.Lambda.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = LambdaError.functionNotFound("missing", { context: { a: 1 } });
      const out = LambdaError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = LambdaError.validation("bad", { context: { a: 1 } });
      const out = LambdaError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(LambdaError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.Lambda.VALIDATION_ERROR);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = LambdaError.internal("keep", { context: { a: 1 } });
      const out = LambdaError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.Lambda.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to LambdaError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status to exercise fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = LambdaError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(LambdaError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.Lambda.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = LambdaError.from(e);
      expect(out).toBeInstanceOf(LambdaError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.Lambda.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = LambdaError.from(cause);
      expect(out).toBeInstanceOf(LambdaError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.Lambda.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = LambdaError.functionNotFound("m", { context: { a: 1 } });
      const out = LambdaError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new LambdaError("m");
      const out = LambdaError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
