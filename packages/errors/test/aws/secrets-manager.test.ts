import { describe, it, expect } from "vitest";
import { SecretsManagerError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/secrets-manager: SecretsManagerError static helpers", () => {
  it("secretNotFound", () => {
    const e = SecretsManagerError.secretNotFound();
    expect(e.code).toBe(AwsErrorCodes.SecretsManager.SECRET_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("decryptionFailure", () => {
    const e = SecretsManagerError.decryptionFailure();
    expect(e.code).toBe(AwsErrorCodes.SecretsManager.DECRYPTION_FAILURE);
    expect(e.status).toBe(500);
  });

  it("throttling, accessDenied, validation, internal", () => {
    expect(SecretsManagerError.throttling().code).toBe(AwsErrorCodes.SecretsManager.THROTTLING);
    expect(SecretsManagerError.accessDenied().code).toBe(
      AwsErrorCodes.SecretsManager.ACCESS_DENIED,
    );
    expect(SecretsManagerError.validation().code).toBe(
      AwsErrorCodes.SecretsManager.VALIDATION_ERROR,
    );
    expect(SecretsManagerError.internal().code).toBe(AwsErrorCodes.SecretsManager.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = SecretsManagerError.secretNotFound("missing", { context: { a: 1 } });
      const out = SecretsManagerError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = SecretsManagerError.accessDenied("denied", { context: { a: 1 } });
      const out = SecretsManagerError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(SecretsManagerError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.SecretsManager.ACCESS_DENIED);
      expect(out.status).toBe(403);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = SecretsManagerError.decryptionFailure("keep", { context: { a: 1 } });
      const out = SecretsManagerError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.SecretsManager.DECRYPTION_FAILURE);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to SecretsManagerError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status to exercise fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = SecretsManagerError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(SecretsManagerError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.SecretsManager.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = SecretsManagerError.from(e);
      expect(out).toBeInstanceOf(SecretsManagerError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.SecretsManager.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = SecretsManagerError.from(cause);
      expect(out).toBeInstanceOf(SecretsManagerError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.SecretsManager.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = SecretsManagerError.secretNotFound("m", { context: { a: 1 } });
      const out = SecretsManagerError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new SecretsManagerError("m");
      const out = SecretsManagerError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
