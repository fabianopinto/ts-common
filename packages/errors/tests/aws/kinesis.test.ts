import { describe, it, expect } from "vitest";
import { KinesisError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/kinesis: KinesisError static helpers", () => {
  it("provisionedThroughputExceeded", () => {
    const e = KinesisError.provisionedThroughputExceeded();
    expect(e.code).toBe(AwsErrorCodes.Kinesis.PROVISIONED_THROUGHPUT_EXCEEDED);
    expect(e.status).toBe(429);
  });

  it("throttling, streamNotFound, accessDenied, validation, timeout, internal", () => {
    expect(KinesisError.throttling().code).toBe(AwsErrorCodes.Kinesis.THROTTLING);
    expect(KinesisError.streamNotFound().code).toBe(AwsErrorCodes.Kinesis.STREAM_NOT_FOUND);
    expect(KinesisError.accessDenied().code).toBe(AwsErrorCodes.Kinesis.ACCESS_DENIED);
    expect(KinesisError.validation().code).toBe(AwsErrorCodes.Kinesis.VALIDATION_ERROR);
    expect(KinesisError.timeout().code).toBe(AwsErrorCodes.Kinesis.TIMEOUT);
    expect(KinesisError.internal().code).toBe(AwsErrorCodes.Kinesis.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = KinesisError.streamNotFound("missing", { context: { a: 1 } });
      const out = KinesisError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = KinesisError.throttling("th", { context: { a: 1 } });
      const out = KinesisError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(KinesisError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.Kinesis.THROTTLING);
      expect(out.status).toBe(429);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = KinesisError.internal("keep", { context: { a: 1 } });
      const out = KinesisError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.Kinesis.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to KinesisError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status to exercise fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = KinesisError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(KinesisError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.Kinesis.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = KinesisError.from(e);
      expect(out).toBeInstanceOf(KinesisError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.Kinesis.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = KinesisError.from(cause);
      expect(out).toBeInstanceOf(KinesisError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.Kinesis.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = KinesisError.timeout("m", { context: { a: 1 } });
      const out = KinesisError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new KinesisError("m");
      const out = KinesisError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
