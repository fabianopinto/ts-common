import { describe, it, expect } from "vitest";
import { SqsError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/sqs: SqsError static helpers", () => {
  it("queueNotFound", () => {
    const e = SqsError.queueNotFound();
    expect(e.code).toBe(AwsErrorCodes.SQS.QUEUE_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("messageTooLarge", () => {
    const e = SqsError.messageTooLarge();
    expect(e.code).toBe(AwsErrorCodes.SQS.MESSAGE_TOO_LARGE);
    expect(e.status).toBe(400);
  });

  it("throttling, accessDenied, validation, timeout, internal", () => {
    expect(SqsError.throttling().code).toBe(AwsErrorCodes.SQS.THROTTLING);
    expect(SqsError.accessDenied().code).toBe(AwsErrorCodes.SQS.ACCESS_DENIED);
    expect(SqsError.validation().code).toBe(AwsErrorCodes.SQS.VALIDATION_ERROR);
    expect(SqsError.timeout().code).toBe(AwsErrorCodes.SQS.TIMEOUT);
    expect(SqsError.internal().code).toBe(AwsErrorCodes.SQS.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = SqsError.queueNotFound("missing", { context: { a: 1 } });
      const out = SqsError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = SqsError.messageTooLarge("big", { context: { a: 1 } });
      const out = SqsError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(SqsError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.SQS.MESSAGE_TOO_LARGE);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = SqsError.internal("keep", { context: { a: 1 } });
      const out = SqsError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.SQS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to SqsError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = SqsError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(SqsError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.SQS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = SqsError.from(e);
      expect(out).toBeInstanceOf(SqsError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.SQS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = SqsError.from(cause);
      expect(out).toBeInstanceOf(SqsError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.SQS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = SqsError.queueNotFound("m", { context: { a: 1 } });
      const out = SqsError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new SqsError("m");
      const out = SqsError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
