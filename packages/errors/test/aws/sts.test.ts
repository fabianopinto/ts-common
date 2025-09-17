import { describe, it, expect } from "vitest";
import { StsError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/sts: StsError static helpers", () => {
  it("authentication, accessDenied, throttling, validation, timeout, internal", () => {
    expect(StsError.authentication().code).toBe(AwsErrorCodes.STS.AUTHENTICATION_ERROR);
    expect(StsError.accessDenied().code).toBe(AwsErrorCodes.STS.ACCESS_DENIED);
    expect(StsError.throttling().code).toBe(AwsErrorCodes.STS.THROTTLING);
    expect(StsError.validation().code).toBe(AwsErrorCodes.STS.VALIDATION_ERROR);
    expect(StsError.timeout().code).toBe(AwsErrorCodes.STS.TIMEOUT);
    expect(StsError.internal().code).toBe(AwsErrorCodes.STS.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = StsError.accessDenied("denied", { context: { a: 1 } });
      const out = StsError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = StsError.authentication("auth", { context: { a: 1 } });
      const out = StsError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(StsError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.STS.AUTHENTICATION_ERROR);
      expect(out.status).toBe(401);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = StsError.timeout("keep", { context: { a: 1 } });
      const out = StsError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.STS.TIMEOUT);
      expect(out.status).toBe(504);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to StsError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = StsError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(StsError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.STS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = StsError.from(e);
      expect(out).toBeInstanceOf(StsError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.STS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = StsError.from(cause);
      expect(out).toBeInstanceOf(StsError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.STS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = StsError.accessDenied("m", { context: { a: 1 } });
      const out = StsError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new StsError("m");
      const out = StsError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
