import { describe, it, expect } from "vitest";
import { S3Error, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

const expectDefaults = (e: S3Error, code: string, status: number) => {
  expect(e).toBeInstanceOf(S3Error);
  expect(e.code).toBe(code);
  expect(e.status).toBe(status);
};

describe("aws/s3: S3Error static helpers", () => {
  it("bucketNotFound: defaults and overrides", () => {
    expectDefaults(S3Error.bucketNotFound(), AwsErrorCodes.S3.BUCKET_NOT_FOUND, 404);
    const ovr = S3Error.bucketNotFound("m", { code: "OVR", status: 499 });
    expect(ovr.code).toBe("OVR");
    expect(ovr.status).toBe(499);
  });

  it("objectNotFound: defaults and overrides", () => {
    expectDefaults(S3Error.objectNotFound(), AwsErrorCodes.S3.OBJECT_NOT_FOUND, 404);
    const ovr = S3Error.objectNotFound("m", { code: "OVR", status: 499 });
    expect(ovr.code).toBe("OVR");
  });

  it("accessDenied: defaults and overrides", () => {
    expectDefaults(S3Error.accessDenied(), AwsErrorCodes.S3.ACCESS_DENIED, 403);
    expect(S3Error.accessDenied("m", { status: 401 }).status).toBe(401);
  });

  it("throttling, validation, timeout, internal", () => {
    expectDefaults(S3Error.throttling(), AwsErrorCodes.S3.THROTTLING, 429);
    expectDefaults(S3Error.validation(), AwsErrorCodes.S3.VALIDATION_ERROR, 400);
    expectDefaults(S3Error.timeout(), AwsErrorCodes.S3.TIMEOUT, 504);
    expectDefaults(S3Error.internal(), AwsErrorCodes.S3.INTERNAL_ERROR, 500);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = S3Error.bucketNotFound("missing", { context: { a: 1 } });
      const out = S3Error.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = S3Error.objectNotFound("obj", { context: { a: 1 } });
      const out = S3Error.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(S3Error);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.S3.OBJECT_NOT_FOUND);
      expect(out.status).toBe(404);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = S3Error.internal("keep", { context: { a: 1 } });
      const out = S3Error.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.S3.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to S3Error with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // status undefined → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = S3Error.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(S3Error);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.S3.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = S3Error.from(e);
      expect(out).toBeInstanceOf(S3Error);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.S3.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = S3Error.from(cause);
      expect(out).toBeInstanceOf(S3Error);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.S3.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = S3Error.bucketNotFound("m", { context: { a: 1 } });
      const out = S3Error.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new S3Error("m");
      const out = S3Error.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
