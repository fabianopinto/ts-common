import { describe, it, expect } from "vitest";
import { CloudWatchLogsError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/cloudwatch-logs: CloudWatchLogsError static helpers", () => {
  it("logGroupNotFound", () => {
    const e = CloudWatchLogsError.logGroupNotFound();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchLogs.LOG_GROUP_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("logStreamNotFound", () => {
    const e = CloudWatchLogsError.logStreamNotFound();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchLogs.LOG_STREAM_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, serviceUnavailable", () => {
    expect(CloudWatchLogsError.throttling().code).toBe(AwsErrorCodes.CloudWatchLogs.THROTTLING);
    expect(CloudWatchLogsError.accessDenied().code).toBe(
      AwsErrorCodes.CloudWatchLogs.ACCESS_DENIED,
    );
    expect(CloudWatchLogsError.validation().code).toBe(
      AwsErrorCodes.CloudWatchLogs.VALIDATION_ERROR,
    );
    expect(CloudWatchLogsError.serviceUnavailable().code).toBe(
      AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE,
    );
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = CloudWatchLogsError.logGroupNotFound("missing", { context: { a: 1 } });
      const out = CloudWatchLogsError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = CloudWatchLogsError.logStreamNotFound("missing", { context: { a: 1 } });
      const out = CloudWatchLogsError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(CloudWatchLogsError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchLogs.LOG_STREAM_NOT_FOUND);
      expect(out.status).toBe(404);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override is undefined and merges context", () => {
      const original = CloudWatchLogsError.validation("keep", { context: { a: 1 } });
      const out = CloudWatchLogsError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchLogs.VALIDATION_ERROR);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to CloudWatchLogsError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } });
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = CloudWatchLogsError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(CloudWatchLogsError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE);
      expect(out.status).toBe(503);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = CloudWatchLogsError.from(e);
      expect(out).toBeInstanceOf(CloudWatchLogsError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE);
      expect(out.status).toBe(503);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = CloudWatchLogsError.from(cause);
      expect(out).toBeInstanceOf(CloudWatchLogsError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE);
      expect(out.status).toBe(503);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = CloudWatchLogsError.logGroupNotFound("m", { context: { a: 1 } });
      const out = CloudWatchLogsError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new CloudWatchLogsError("m");
      const out = CloudWatchLogsError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
