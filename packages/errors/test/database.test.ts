/**
 * @fileoverview Snapshot-like toJSON shape tests for DatabaseError.
 */

import { describe, it, expect } from "vitest";
import { DatabaseError, DatabaseErrorCodes } from "../src/database";
import { AppError } from "../src/base";

describe("DatabaseError toJSON", () => {
  it("connection() includes code/status/context and cause", () => {
    const cause = new Error("tcp reset");
    const err = DatabaseError.connection("db down", { cause, context: { host: "db" } });
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: "DatabaseError",
      message: "db down",
      code: DatabaseErrorCodes.CONNECTION_FAILED,
      status: 503,
      isOperational: true,
      context: { host: "db" },
    } as any);
    expect(json.cause).toMatchObject({ name: "Error", message: "tcp reset" });
    expect(typeof json.stack === "string" || json.stack === undefined).toBe(true);
  });

  it("uniqueViolation() serializes properly with merged context", () => {
    const err = DatabaseError.uniqueViolation("duplicate key", { context: { key: "email" } });
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: "DatabaseError",
      code: DatabaseErrorCodes.UNIQUE_VIOLATION,
      status: 409,
      isOperational: true,
      context: { key: "email" },
    } as any);
  });
});

describe("DatabaseError.withContext", () => {
  it("should merge context and preserve properties", () => {
    const base = new DatabaseError("db", { code: DatabaseErrorCodes.TIMEOUT, status: 504, context: { a: 1 } });
    const next = base.withContext({ b: 2 });
    expect(next).not.toBe(base);
    expect(next.message).toBe("db");
    expect(next.code).toBe(DatabaseErrorCodes.TIMEOUT);
    expect(next.status).toBe(504);
    expect(next.context).toEqual({ a: 1, b: 2 });
    expect(next.isOperational).toBe(true);
  });

  it("should handle undefined initial context (covers ...(this.context ?? {}))", () => {
    const base = new DatabaseError("db");
    const next = base.withContext({ only: "extra" });
    expect(next.context).toEqual({ only: "extra" });
  });
});

describe("DatabaseError.is type guard", () => {
  it("returns true for DatabaseError instances", () => {
    const err = new DatabaseError("x");
    expect(DatabaseError.is(err)).toBe(true);
  });

  it("returns false for non-DatabaseError instances", () => {
    expect(DatabaseError.is(new Error("e"))).toBe(false);
    class NotDatabaseError extends Error {}
    expect(DatabaseError.is(new NotDatabaseError())).toBe(false);
  });
});

describe("DatabaseError.from", () => {
  it("returns same instance when no overrides given", () => {
    const original = DatabaseError.queryFailed("q fail", { context: { a: 1 } });
    const out = DatabaseError.from(original);
    expect(out).toBe(original);
  });

  it("clones with overrides and merges context", () => {
    const original = DatabaseError.queryFailed("q fail", { context: { a: 1 }, status: 500 });
    const out = DatabaseError.from(original, "new msg", { b: 2 });
    expect(out).not.toBe(original);
    expect(out.message).toBe("new msg");
    expect(out.code).toBe(DatabaseErrorCodes.QUERY_FAILED);
    expect(out.status).toBe(500);
    expect(out.context).toEqual({ a: 1, b: 2 });
    expect(out.isOperational).toBe(true);
  });

  it("clones using original message when override is undefined and merges context (covers message ?? err.message)", () => {
    const original = DatabaseError.queryFailed("keep this", { context: { a: 1 }, status: 500 });
    const out = DatabaseError.from(original, undefined, { b: 2 });
    expect(out).not.toBe(original);
    expect(out.message).toBe("keep this");
    expect(out.code).toBe(DatabaseErrorCodes.QUERY_FAILED);
    expect(out.status).toBe(500);
    expect(out.context).toEqual({ a: 1, b: 2 });
    expect(out.isOperational).toBe(true);
  });

  it("wraps AppError preserving fields and defaulting code/status/isOperational", () => {
    const app = new AppError("app fail", { status: 418, context: { s: 1 } });
    // code is undefined so should default to INTERNAL_ERROR; isOperational omitted -> true via ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (app as any).isOperational;
    const out = DatabaseError.from(app, undefined, { t: 2 });
    expect(out).toBeInstanceOf(DatabaseError);
    expect(out.message).toBe("app fail");
    expect(out.code).toBe(DatabaseErrorCodes.INTERNAL_ERROR);
    expect(out.status).toBe(418);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ s: 1, t: 2 });
    expect(out.cause).toBe(app);
  });

  it("wraps native Error and uses original message when override is undefined", () => {
    const e = new Error("native");
    const out = DatabaseError.from(e);
    expect(out).toBeInstanceOf(DatabaseError);
    expect(out.message).toBe("native");
    expect(out.code).toBeUndefined();
    expect(out.status).toBeUndefined();
    expect(out.cause).toBe(e);
  });

  it("wraps non-error unknown with default message", () => {
    const out = DatabaseError.from({ any: true });
    expect(out.message).toBe("Database error");
    expect(out.cause).toEqual({ any: true });
  });

  it("clones DatabaseError with message override and undefined original context (covers ...(err.context ?? {}))", () => {
    const original = new DatabaseError("orig"); // context is undefined
    const out = DatabaseError.from(original, "override", undefined);
    expect(out).not.toBe(original);
    expect(out).toBeInstanceOf(DatabaseError);
    expect(out.message).toBe("override");
    expect(out.code).toBeUndefined();
    expect(out.status).toBeUndefined();
    expect(out.context).toEqual({});
    expect(out.isOperational).toBe(true);
  });

  it("wraps AppError with undefined original context and uses provided context only (covers ...(err.context ?? {}))", () => {
    const app = new AppError("app branch", { status: 502 }); // context is undefined
    const out = DatabaseError.from(app, undefined, { added: true });
    expect(out).toBeInstanceOf(DatabaseError);
    expect(out.message).toBe("app branch");
    expect(out.code).toBe(DatabaseErrorCodes.INTERNAL_ERROR);
    expect(out.status).toBe(502);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ added: true });
    expect(out.cause).toBe(app);
  });

  it("wraps AppError and preserves original context when provided context is undefined (covers ...(context ?? {}))", () => {
    const app = new AppError("ctx preserve", { status: 500, context: { a: 1 } });
    const out = DatabaseError.from(app, undefined, undefined);
    expect(out).toBeInstanceOf(DatabaseError);
    expect(out.message).toBe("ctx preserve");
    expect(out.code).toBe(DatabaseErrorCodes.INTERNAL_ERROR);
    expect(out.status).toBe(500);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ a: 1 });
    expect(out.cause).toBe(app);
  });
});

describe("DatabaseError factory helpers", () => {
  it("basic helpers produce expected code/status and are operational", () => {
    const cases = [
      [DatabaseError.connection("m"), DatabaseErrorCodes.CONNECTION_FAILED, 503],
      [DatabaseError.queryFailed("m"), DatabaseErrorCodes.QUERY_FAILED, 500],
      [DatabaseError.transactionFailed("m"), DatabaseErrorCodes.TRANSACTION_FAILED, 500],
      [DatabaseError.deadlock("m"), DatabaseErrorCodes.DEADLOCK, 409],
      [DatabaseError.serializationFailure("m"), DatabaseErrorCodes.SERIALIZATION_FAILURE, 409],
      [DatabaseError.uniqueViolation("m"), DatabaseErrorCodes.UNIQUE_VIOLATION, 409],
      [DatabaseError.timeout("m"), DatabaseErrorCodes.TIMEOUT, 504],
      [DatabaseError.throttling("m"), DatabaseErrorCodes.THROTTLING, 429],
      [DatabaseError.notFound("m"), DatabaseErrorCodes.NOT_FOUND, 404],
      [DatabaseError.conflict("m"), DatabaseErrorCodes.CONFLICT, 409],
      [DatabaseError.validation("m"), DatabaseErrorCodes.VALIDATION_ERROR, 400],
      [DatabaseError.serviceUnavailable("m"), DatabaseErrorCodes.SERVICE_UNAVAILABLE, 503],
      [DatabaseError.internal("m"), DatabaseErrorCodes.INTERNAL_ERROR, 500],
    ] as const;

    for (const [err, code, status] of cases) {
      expect(err).toBeInstanceOf(DatabaseError);
      expect(err.code).toBe(code);
      expect(err.status).toBe(status);
      expect(err.isOperational).toBe(true);
    }
  });
});
