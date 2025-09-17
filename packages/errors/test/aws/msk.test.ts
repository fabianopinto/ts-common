import { describe, it, expect } from "vitest";
import { MskError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/msk: MskError static helpers", () => {
  it("clusterNotFound", () => {
    const e = MskError.clusterNotFound();
    expect(e.code).toBe(AwsErrorCodes.MSK.CLUSTER_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, timeout, internal", () => {
    expect(MskError.throttling().code).toBe(AwsErrorCodes.MSK.THROTTLING);
    expect(MskError.accessDenied().code).toBe(AwsErrorCodes.MSK.ACCESS_DENIED);
    expect(MskError.validation().code).toBe(AwsErrorCodes.MSK.VALIDATION_ERROR);
    expect(MskError.timeout().code).toBe(AwsErrorCodes.MSK.TIMEOUT);
    expect(MskError.internal().code).toBe(AwsErrorCodes.MSK.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = MskError.clusterNotFound("missing", { context: { a: 1 } });
      const out = MskError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = MskError.accessDenied("denied", { context: { a: 1 } });
      const out = MskError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(MskError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.MSK.ACCESS_DENIED);
      expect(out.status).toBe(403);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = MskError.validation("keep", { context: { a: 1 } });
      const out = MskError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.MSK.VALIDATION_ERROR);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to MskError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status to exercise fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = MskError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(MskError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.MSK.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = MskError.from(e);
      expect(out).toBeInstanceOf(MskError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.MSK.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = MskError.from(cause);
      expect(out).toBeInstanceOf(MskError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.MSK.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = MskError.clusterNotFound("m", { context: { a: 1 } });
      const out = MskError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new MskError("m");
      const out = MskError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
