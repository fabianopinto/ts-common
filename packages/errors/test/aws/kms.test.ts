import { describe, it, expect } from "vitest";
import { KmsError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/kms: KmsError static helpers", () => {
  it("keyNotFound", () => {
    const e = KmsError.keyNotFound();
    expect(e.code).toBe(AwsErrorCodes.KMS.KEY_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("invalidCiphertext, throttling, accessDenied, internal", () => {
    expect(KmsError.invalidCiphertext().code).toBe(AwsErrorCodes.KMS.INVALID_CIPHERTEXT);
    expect(KmsError.throttling().code).toBe(AwsErrorCodes.KMS.THROTTLING);
    expect(KmsError.accessDenied().code).toBe(AwsErrorCodes.KMS.ACCESS_DENIED);
    expect(KmsError.internal().code).toBe(AwsErrorCodes.KMS.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = KmsError.keyNotFound("missing", { context: { a: 1 } });
      const out = KmsError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = KmsError.accessDenied("denied", { context: { a: 1 } });
      const out = KmsError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(KmsError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.KMS.ACCESS_DENIED);
      expect(out.status).toBe(403);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = KmsError.invalidCiphertext("keep", { context: { a: 1 } });
      const out = KmsError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.KMS.INVALID_CIPHERTEXT);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to KmsError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // status undefined → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = KmsError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(KmsError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.KMS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = KmsError.from(e);
      expect(out).toBeInstanceOf(KmsError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.KMS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = KmsError.from(cause);
      expect(out).toBeInstanceOf(KmsError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.KMS.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = KmsError.invalidCiphertext("m", { context: { a: 1 } });
      const out = KmsError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new KmsError("m");
      const out = KmsError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
