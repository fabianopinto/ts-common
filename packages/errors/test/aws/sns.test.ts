import { describe, it, expect } from "vitest";
import { SnsError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/sns: SnsError static helpers", () => {
  it("topicNotFound", () => {
    const e = SnsError.topicNotFound();
    expect(e.code).toBe(AwsErrorCodes.SNS.TOPIC_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, internal", () => {
    expect(SnsError.throttling().code).toBe(AwsErrorCodes.SNS.THROTTLING);
    expect(SnsError.accessDenied().code).toBe(AwsErrorCodes.SNS.ACCESS_DENIED);
    expect(SnsError.validation().code).toBe(AwsErrorCodes.SNS.VALIDATION_ERROR);
    expect(SnsError.internal().code).toBe(AwsErrorCodes.SNS.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = SnsError.topicNotFound("missing", { context: { a: 1 } });
      const out = SnsError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = SnsError.accessDenied("denied", { context: { a: 1 } });
      const out = SnsError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(SnsError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.SNS.ACCESS_DENIED);
      expect(out.status).toBe(403);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = SnsError.internal("keep", { context: { a: 1 } });
      const out = SnsError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.SNS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to SnsError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = SnsError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(SnsError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.SNS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = SnsError.from(e);
      expect(out).toBeInstanceOf(SnsError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.SNS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = SnsError.from(cause);
      expect(out).toBeInstanceOf(SnsError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.SNS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = SnsError.topicNotFound("m", { context: { a: 1 } });
      const out = SnsError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new SnsError("m");
      const out = SnsError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
