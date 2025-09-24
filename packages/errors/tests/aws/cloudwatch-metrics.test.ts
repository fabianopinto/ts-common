import { describe, it, expect } from "vitest";
import { CloudWatchMetricsError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/cloudwatch-metrics: CloudWatchMetricsError static helpers", () => {
  it("throttling", () => {
    const e = CloudWatchMetricsError.throttling();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchMetrics.THROTTLING);
    expect(e.status).toBe(429);
  });

  it("limitExceeded", () => {
    const e = CloudWatchMetricsError.limitExceeded();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchMetrics.LIMIT_EXCEEDED);
    expect(e.status).toBe(429);
  });

  it("accessDenied, validation, internal", () => {
    expect(CloudWatchMetricsError.accessDenied().code).toBe(
      AwsErrorCodes.CloudWatchMetrics.ACCESS_DENIED,
    );
    expect(CloudWatchMetricsError.validation().code).toBe(
      AwsErrorCodes.CloudWatchMetrics.VALIDATION_ERROR,
    );
    expect(CloudWatchMetricsError.internal().code).toBe(
      AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR,
    );
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = CloudWatchMetricsError.accessDenied("denied", { context: { a: 1 } });
      const out = CloudWatchMetricsError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = CloudWatchMetricsError.validation("bad", { context: { a: 1 } });
      const out = CloudWatchMetricsError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(CloudWatchMetricsError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchMetrics.VALIDATION_ERROR);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = CloudWatchMetricsError.internal("keep", { context: { a: 1 } });
      const out = CloudWatchMetricsError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to CloudWatchMetricsError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // status undefined to exercise fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = CloudWatchMetricsError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(CloudWatchMetricsError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = CloudWatchMetricsError.from(e);
      expect(out).toBeInstanceOf(CloudWatchMetricsError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = CloudWatchMetricsError.from(cause);
      expect(out).toBeInstanceOf(CloudWatchMetricsError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = CloudWatchMetricsError.validation("m", { context: { a: 1 } });
      const out = CloudWatchMetricsError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new CloudWatchMetricsError("m");
      const out = CloudWatchMetricsError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
