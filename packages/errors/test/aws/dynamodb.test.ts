import { describe, it, expect } from "vitest";
import { DynamoDbError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/dynamodb: DynamoDbError static helpers", () => {
  it("conditionalCheckFailed: defaults and overrides", () => {
    const d = DynamoDbError.conditionalCheckFailed();
    expect(d).toBeInstanceOf(DynamoDbError);
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.CONDITIONAL_CHECK_FAILED);
    expect(d.status).toBe(409);
    const o = DynamoDbError.conditionalCheckFailed("m", { code: "OVR", status: 499 });
    expect(o.code).toBe("OVR");
    expect(o.status).toBe(499);
  });

  it("throughputExceeded", () => {
    const d = DynamoDbError.throughputExceeded();
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.THROUGHPUT_EXCEEDED);
    expect(d.status).toBe(429);
  });

  it("itemNotFound", () => {
    const d = DynamoDbError.itemNotFound();
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.ITEM_NOT_FOUND);
    expect(d.status).toBe(404);
  });

  it("transactionConflict", () => {
    const d = DynamoDbError.transactionConflict();
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.TRANSACTION_CONFLICT);
    expect(d.status).toBe(409);
  });

  it("accessDenied, throttling, validation, internal", () => {
    expect(DynamoDbError.accessDenied().code).toBe(AwsErrorCodes.DynamoDB.ACCESS_DENIED);
    expect(DynamoDbError.throttling().code).toBe(AwsErrorCodes.DynamoDB.THROTTLING);
    expect(DynamoDbError.validation().code).toBe(AwsErrorCodes.DynamoDB.VALIDATION_ERROR);
    expect(DynamoDbError.internal().code).toBe(AwsErrorCodes.DynamoDB.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = DynamoDbError.itemNotFound("missing", { context: { a: 1 } });
      const out = DynamoDbError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = DynamoDbError.transactionConflict("conflict", { context: { a: 1 } });
      const out = DynamoDbError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(DynamoDbError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.DynamoDB.TRANSACTION_CONFLICT);
      expect(out.status).toBe(409);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = DynamoDbError.internal("keep", { context: { a: 1 } });
      const out = DynamoDbError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.DynamoDB.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to DynamoDbError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // status undefined → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = DynamoDbError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(DynamoDbError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.DynamoDB.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = DynamoDbError.from(e);
      expect(out).toBeInstanceOf(DynamoDbError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.DynamoDB.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = DynamoDbError.from(cause);
      expect(out).toBeInstanceOf(DynamoDbError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.DynamoDB.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = DynamoDbError.validation("m", { context: { a: 1 } });
      const out = DynamoDbError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new DynamoDbError("m");
      const out = DynamoDbError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
