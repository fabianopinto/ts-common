/**
 * @fileoverview Snapshot-like toJSON shape tests for DataError factory helpers.
 */

import { describe, it, expect } from "vitest";
import {
  DataError,
  ValidationError,
  TransformationError,
  DATA_PARSE_ERROR,
  DATA_VALIDATION_ERROR,
  DATA_TRANSFORMATION_ERROR,
} from "../src/data";
import { AppError } from "../src/base";

describe("DataError toJSON (factory helpers)", () => {
  it("parse() includes code/status/context and cause", () => {
    const cause = new Error("bad json");
    const err = DataError.parse("parse failed", { cause, context: { source: "file.json" } });
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: "DataError",
      message: "parse failed",
      code: DATA_PARSE_ERROR,
      status: 400,
      isOperational: true,
      context: { source: "file.json" },
    } as any);
    expect(json.cause).toMatchObject({ name: "Error", message: "bad json" });
    expect(typeof json.stack === "string" || json.stack === undefined).toBe(true);
  });

  it("validation() creates ValidationError with proper toJSON shape", () => {
    const err = DataError.validation("invalid data", { context: { field: "email" } });
    expect(err).toBeInstanceOf(ValidationError);
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: "ValidationError",
      message: "invalid data",
      code: DATA_VALIDATION_ERROR,
      status: 400,
      isOperational: true,
      context: { field: "email" },
    } as any);
  });

  it("transformation() creates TransformationError with proper toJSON shape", () => {
    const err = DataError.transformation("xform failed", { context: { step: "normalize" } });
    expect(err).toBeInstanceOf(TransformationError);
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: "TransformationError",
      message: "xform failed",
      code: DATA_TRANSFORMATION_ERROR,
      status: 500,
      isOperational: true,
      context: { step: "normalize" },
    } as any);
  });
});

describe("DataError.withContext", () => {
  it("should merge context and preserve properties", () => {
    const base = new DataError("msg", { code: DATA_PARSE_ERROR, status: 400, context: { a: 1 } });
    const next = base.withContext({ b: 2 });
    expect(next).not.toBe(base);
    expect(next.message).toBe("msg");
    expect(next.code).toBe(DATA_PARSE_ERROR);
    expect(next.status).toBe(400);
    expect(next.context).toEqual({ a: 1, b: 2 });
  });

  it("should handle empty initial context (nullish)", () => {
    const base = new DataError("msg");
    const next = base.withContext({ only: "extra" });
    expect(next.context).toEqual({ only: "extra" });
  });

  it("should allow extra to override existing keys (spread order)", () => {
    const base = new DataError("msg", { context: { k: 1, keep: true } });
    const next = base.withContext({ k: 2 });
    expect(next.context).toEqual({ k: 2, keep: true });
  });
});

describe("DataError.is type guard", () => {
  it("returns true for DataError instances", () => {
    const err = new DataError("msg");
    expect(DataError.is(err)).toBe(true);
  });

  it("returns false for non-DataError instances", () => {
    expect(DataError.is(new Error("e"))).toBe(false);
    class NotDataError extends Error {}
    expect(DataError.is(new NotDataError())).toBe(false);
  });
});

describe("DataError.from", () => {
  it("returns same instance when no overrides given", () => {
    const original = DataError.parse("parse failed", { context: { a: 1 } });
    const out = DataError.from(original);
    expect(out).toBe(original);
  });

  it("clones with overrides and merges context", () => {
    const original = DataError.parse("parse failed", {
      context: { a: 1 },
      status: 422,
    });
    const out = DataError.from(original, "new msg", { b: 2 });
    expect(out).not.toBe(original);
    expect(out.message).toBe("new msg");
    expect(out.code).toBe(DATA_PARSE_ERROR);
    expect(out.status).toBe(422);
    expect(out.context).toEqual({ a: 1, b: 2 });
    expect(out.isOperational).toBe(true);
  });

  it("clones using original message when override is undefined (covers message ?? err.message)", () => {
    const original = DataError.parse("keep this message", {
      context: { a: 1 },
      status: 400,
    });
    const out = DataError.from(original, undefined, { b: 2 });
    expect(out).not.toBe(original);
    expect(out.message).toBe("keep this message");
    expect(out.code).toBe(DATA_PARSE_ERROR);
    expect(out.status).toBe(400);
    expect(out.context).toEqual({ a: 1, b: 2 });
    expect(out.isOperational).toBe(true);
  });

  it("wraps AppError preserving fields and setting cause", () => {
    const app = new AppError("app boom", {
      code: "X",
      status: 503,
      isOperational: false,
      context: { s: 1 },
    });
    const out = DataError.from(app, undefined, { t: 2 });
    expect(out).toBeInstanceOf(DataError);
    expect(out.message).toBe("app boom");
    expect(out.code).toBe("X");
    expect(out.status).toBe(503);
    // DataError.from(err instanceof AppError) makes isOperational err.isOperational ?? true
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ s: 1, t: 2 });
    expect(out.cause).toBe(app);
  });

  it("wraps AppError and preserves isOperational=true (covers err.isOperational ?? true)", () => {
    const app = new AppError("stable", { code: "C", status: 200, isOperational: true });
    const out = DataError.from(app);
    expect(out).toBeInstanceOf(DataError);
    expect(out.message).toBe("stable");
    expect(out.code).toBe("C");
    expect(out.status).toBe(200);
    expect(out.isOperational).toBe(true);
    expect(out.cause).toBe(app);
  });

  it("wraps AppError with isOperational undefined and defaults to true (covers err.isOperational ?? true)", () => {
    const app = new AppError("no op flag", { code: "Y", status: 201 });
    // BaseError defaults isOperational to false when omitted.
    // Force it to be truly undefined to exercise the `?? true` fallback.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (app as any).isOperational;
    const out = DataError.from(app);
    expect(out).toBeInstanceOf(DataError);
    expect(out.message).toBe("no op flag");
    expect(out.code).toBe("Y");
    expect(out.status).toBe(201);
    expect(out.isOperational).toBe(true);
    expect(out.cause).toBe(app);
  });

  it("wraps native Error", () => {
    const e = new Error("native");
    const out = DataError.from(e, "override", { z: 9 });
    expect(out.message).toBe("override");
    expect(out.code).toBeUndefined();
    expect(out.status).toBeUndefined();
    expect(out.cause).toBe(e);
    expect(out.context).toEqual({ z: 9 });
  });

  it("wraps native Error and uses original message when override is undefined (covers message ?? err.message)", () => {
    const e = new Error("native keeps message");
    const out = DataError.from(e); // message undefined
    expect(out).toBeInstanceOf(DataError);
    expect(out.message).toBe("native keeps message");
    expect(out.code).toBeUndefined();
    expect(out.status).toBeUndefined();
    expect(out.cause).toBe(e);
    expect(out.context).toBeUndefined();
  });

  it("wraps non-error unknown with default message", () => {
    const out = DataError.from({ anything: true });
    expect(out.message).toBe("Data error");
    expect(out.cause).toEqual({ anything: true });
  });

  it("treats empty-string override as falsy in short-circuit and returns same instance", () => {
    const original = DataError.parse("original");
    const out = DataError.from(original, "");
    expect(out).toBe(original);
    expect(out.message).toBe("original");
  });

  it("merges provided context when original err.context is undefined (covers ...(err.context ?? {}))", () => {
    const original = new DataError("msg");
    // original.context is undefined by default
    const out = DataError.from(original, undefined, { added: true });
    expect(out).not.toBe(original);
    expect(out.message).toBe("msg");
    expect(out.context).toEqual({ added: true });
  });

  it("preserves original context when override context is undefined and message provided", () => {
    const original = new DataError("msg", { context: { a: 1 } });
    const out = DataError.from(original, "override", undefined);
    expect(out).not.toBe(original);
    expect(out.message).toBe("override");
    expect(out.context).toEqual({ a: 1 });
  });
});

describe("ValidationError helpers", () => {
  it("withContext merges and applies default code/status", () => {
    const base = new ValidationError("bad", { context: { a: 1 } });
    const next = base.withContext({ b: 2 });
    expect(next).toBeInstanceOf(ValidationError);
    expect(next.message).toBe("bad");
    expect(next.code).toBe(DATA_VALIDATION_ERROR);
    expect(next.status).toBe(400);
    expect(next.context).toEqual({ a: 1, b: 2 });
  });

  it("withContext merges when original context is undefined (covers ...(this.context ?? {}))", () => {
    const base = new ValidationError("no ctx"); // context is undefined
    const next = base.withContext({ added: true });
    expect(next).toBeInstanceOf(ValidationError);
    expect(next.message).toBe("no ctx");
    expect(next.code).toBe(DATA_VALIDATION_ERROR);
    expect(next.status).toBe(400);
    expect(next.context).toEqual({ added: true });
  });

  it("from(ValidationError) returns same unless overrides provided", () => {
    const err = new ValidationError("bad", { context: { a: 1 } });
    expect(ValidationError.from(err)).toBe(err);
    const cloned = ValidationError.from(err, "worse", { b: 2 });
    expect(cloned).not.toBe(err);
    expect(cloned.message).toBe("worse");
    expect(cloned.code).toBe(DATA_VALIDATION_ERROR);
    expect(cloned.status).toBe(400);
    expect(cloned.context).toEqual({ a: 1, b: 2 });
  });

  it("from(ValidationError) with message defined and context undefined preserves original context (covers ...(err.context ?? {}))", () => {
    const original = new ValidationError("orig", { context: { a: 1 } });
    const cloned = ValidationError.from(original, "override", undefined);
    expect(cloned).not.toBe(original);
    expect(cloned).toBeInstanceOf(ValidationError);
    expect(cloned.message).toBe("override");
    expect(cloned.code).toBe(DATA_VALIDATION_ERROR);
    expect(cloned.status).toBe(400);
    expect(cloned.context).toEqual({ a: 1 });
    expect(cloned.isOperational).toBe(true);
  });

  it("from(ValidationError) with undefined message uses original and merges context", () => {
    const err = new ValidationError("keep", { context: { a: 1 } });
    const cloned = ValidationError.from(err, undefined, { b: 2 });
    expect(cloned).not.toBe(err);
    expect(cloned.message).toBe("keep");
    expect(cloned.code).toBe(DATA_VALIDATION_ERROR);
    expect(cloned.status).toBe(400);
    expect(cloned.context).toEqual({ a: 1, b: 2 });
  });

  it("from(AppError) maps to ValidationError preserving code/status and defaulting isOperational", () => {
    const app = new AppError("app validation", { code: "APP", status: 418 });
    const out = ValidationError.from(app, undefined, { x: 1 });
    expect(out).toBeInstanceOf(ValidationError);
    expect(out.message).toBe("app validation");
    expect(out.code).toBe("APP");
    expect(out.status).toBe(418);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ x: 1 });
    expect(out.cause).toBe(app);
  });

  it("from(AppError with isOperational undefined) defaults isOperational to true (covers err.isOperational ?? true)", () => {
    const app = new AppError("app validation undefined op", { code: "APP2", status: 409 });
    // BaseError defaults isOperational to false when omitted; delete to make it truly undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (app as any).isOperational;
    const out = ValidationError.from(app, undefined, { x: 2 });
    expect(out).toBeInstanceOf(ValidationError);
    expect(out.message).toBe("app validation undefined op");
    expect(out.code).toBe("APP2");
    expect(out.status).toBe(409);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ x: 2 });
    expect(out.cause).toBe(app);
  });

  it("from(ValidationError with isOperational undefined) defaults isOperational to true (covers err.isOperational ?? true)", () => {
    const original = new ValidationError("bad", { context: { a: 1 } });
    // ValidationError/DataError constructor sets isOperational: true; remove it to make it undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (original as any).isOperational;
    const cloned = ValidationError.from(original, "still bad", { b: 2 });
    expect(cloned).toBeInstanceOf(ValidationError);
    expect(cloned.message).toBe("still bad");
    expect(cloned.status).toBe(400);
    expect(cloned.code).toBe(DATA_VALIDATION_ERROR);
    expect(cloned.context).toEqual({ a: 1, b: 2 });
    expect(cloned.isOperational).toBe(true);
  });

  it("from(ValidationError) merges provided context when original context is undefined (covers ...(err.context ?? {}))", () => {
    const original = new ValidationError("msg"); // no context provided => undefined
    const cloned = ValidationError.from(original, undefined, { added: true });
    expect(cloned).not.toBe(original);
    expect(cloned).toBeInstanceOf(ValidationError);
    expect(cloned.message).toBe("msg");
    expect(cloned.status).toBe(400);
    expect(cloned.code).toBe(DATA_VALIDATION_ERROR);
    expect(cloned.context).toEqual({ added: true });
    expect(cloned.isOperational).toBe(true);
  });

  it("from(Error) creates ValidationError with default code/status", () => {
    const e = new Error("native");
    const out = ValidationError.from(e);
    expect(out.message).toBe("native");
    expect(out.code).toBe(DATA_VALIDATION_ERROR);
    expect(out.status).toBe(400);
    expect(out.isOperational).toBe(true);
    expect(out.cause).toBe(e);
  });

  it("from(AppError without code/status) defaults code/status via ??", () => {
    const app = new AppError("no meta");
    const out = ValidationError.from(app);
    expect(out.code).toBe(DATA_VALIDATION_ERROR);
    expect(out.status).toBe(400);
  });

  it("from(unknown) produces default message and attaches cause", () => {
    const unknown = { foo: "bar" };
    const out = ValidationError.from(unknown);
    expect(out.message).toBe("Data validation error");
    expect(out.code).toBe(DATA_VALIDATION_ERROR);
    expect(out.status).toBe(400);
    expect(out.cause).toEqual(unknown);
    expect(out.isOperational).toBe(true);
  });

  it("ensure() throws when falsy and does not throw when truthy", () => {
    expect(() => ValidationError.ensure(true)).not.toThrow();
    expect(() => ValidationError.ensure(1)).not.toThrow();
    expect(() => ValidationError.ensure("x")).not.toThrow();
    expect(() => ValidationError.ensure({})).not.toThrow();
    expect(() => ValidationError.ensure(0)).toThrowError(ValidationError);
    expect(() => ValidationError.ensure("" as unknown)).toThrowError(ValidationError);
    expect(() => ValidationError.ensure(null as unknown)).toThrowError(ValidationError);
    expect(() => ValidationError.ensure(undefined as unknown)).toThrowError(ValidationError);
  });

  it("require() returns non-nullish and throws on null/undefined", () => {
    expect(ValidationError.require(123)).toBe(123);
    expect(ValidationError.require("ok")).toBe("ok");
    expect(() => ValidationError.require(null as any)).toThrowError(ValidationError);
    expect(() => ValidationError.require(undefined as any)).toThrowError(ValidationError);
  });
});

describe("TransformationError helpers", () => {
  it("withContext merges and applies default code/status", () => {
    const base = new TransformationError("boom", { context: { step: 1 } });
    const next = base.withContext({ phase: 2 });
    expect(next).toBeInstanceOf(TransformationError);
    expect(next.message).toBe("boom");
    expect(next.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(next.status).toBe(500);
    expect(next.context).toEqual({ step: 1, phase: 2 });
  });

  it("withContext merges when original context is undefined (covers ...(this.context ?? {}))", () => {
    const base = new TransformationError("no ctx"); // context is undefined
    const next = base.withContext({ added: true });
    expect(next).toBeInstanceOf(TransformationError);
    expect(next.message).toBe("no ctx");
    expect(next.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(next.status).toBe(500);
    expect(next.context).toEqual({ added: true });
  });

  it("from(TransformationError) returns same unless overrides provided", () => {
    const err = new TransformationError("boom", { context: { s: 1 } });
    expect(TransformationError.from(err)).toBe(err);
    const cloned = TransformationError.from(err, "bigger boom", { t: 2 });
    expect(cloned).not.toBe(err);
    expect(cloned.message).toBe("bigger boom");
    expect(cloned.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(cloned.status).toBe(500);
    expect(cloned.context).toEqual({ s: 1, t: 2 });
  });

  it("from(TransformationError) with undefined message uses original and merges context", () => {
    const err = new TransformationError("keep", { context: { s: 1 } });
    const cloned = TransformationError.from(err, undefined, { t: 2 });
    expect(cloned).not.toBe(err);
    expect(cloned.message).toBe("keep");
    expect(cloned.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(cloned.status).toBe(500);
    expect(cloned.context).toEqual({ s: 1, t: 2 });
  });

  it("from(TransformationError) with message defined and context undefined preserves original context (covers ...(err.context ?? {}))", () => {
    const original = new TransformationError("orig", { context: { s: 1 } });
    const cloned = TransformationError.from(original, "override", undefined);
    expect(cloned).not.toBe(original);
    expect(cloned).toBeInstanceOf(TransformationError);
    expect(cloned.message).toBe("override");
    expect(cloned.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(cloned.status).toBe(500);
    expect(cloned.context).toEqual({ s: 1 });
    expect(cloned.isOperational).toBe(true);
  });

  it("from(TransformationError with isOperational undefined) defaults isOperational to true (covers err.isOperational ?? true)", () => {
    const original = new TransformationError("boom", { context: { s: 1 } });
    // TransformationError/DataError constructor sets isOperational: true; remove it to make it undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (original as any).isOperational;
    const cloned = TransformationError.from(original, "boom again", { t: 2 });
    expect(cloned).toBeInstanceOf(TransformationError);
    expect(cloned.message).toBe("boom again");
    expect(cloned.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(cloned.status).toBe(500);
    expect(cloned.context).toEqual({ s: 1, t: 2 });
    expect(cloned.isOperational).toBe(true);
  });

  it("from(TransformationError) merges provided context when original context is undefined (covers ...(err.context ?? {}))", () => {
    const original = new TransformationError("boom"); // no context provided => undefined
    const cloned = TransformationError.from(original, undefined, { added: true });
    expect(cloned).not.toBe(original);
    expect(cloned).toBeInstanceOf(TransformationError);
    expect(cloned.message).toBe("boom");
    expect(cloned.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(cloned.status).toBe(500);
    expect(cloned.context).toEqual({ added: true });
    expect(cloned.isOperational).toBe(true);
  });

  it("from(AppError) maps to TransformationError preserving code/status and defaulting isOperational", () => {
    const app = new AppError("app transform", { code: "APP", status: 418 });
    const out = TransformationError.from(app, undefined, { x: 1 });
    expect(out).toBeInstanceOf(TransformationError);
    expect(out.message).toBe("app transform");
    expect(out.code).toBe("APP");
    expect(out.status).toBe(418);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ x: 1 });
    expect(out.cause).toBe(app);
  });

  it("from(AppError with isOperational undefined) defaults isOperational to true (covers err.isOperational ?? true)", () => {
    const app = new AppError("app transform undefined op", { code: "APP2", status: 502 });
    // BaseError sets isOperational when omitted; delete to make it truly undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (app as any).isOperational;
    const out = TransformationError.from(app, undefined, { y: 2 });
    expect(out).toBeInstanceOf(TransformationError);
    expect(out.message).toBe("app transform undefined op");
    expect(out.code).toBe("APP2");
    expect(out.status).toBe(502);
    expect(out.isOperational).toBe(true);
    expect(out.context).toEqual({ y: 2 });
    expect(out.cause).toBe(app);
  });

  it("from(Error) creates TransformationError with default code/status", () => {
    const e = new Error("native");
    const out = TransformationError.from(e);
    expect(out.message).toBe("native");
    expect(out.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(out.status).toBe(500);
    expect(out.isOperational).toBe(true);
    expect(out.cause).toBe(e);
  });

  it("from(AppError without code/status) defaults code/status via ??", () => {
    const app = new AppError("no meta");
    const out = TransformationError.from(app);
    expect(out.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(out.status).toBe(500);
  });

  it("from(unknown) produces default message and attaches cause", () => {
    const unknown = { x: 1 };
    const out = TransformationError.from(unknown);
    expect(out.message).toBe("Data transformation error");
    expect(out.code).toBe(DATA_TRANSFORMATION_ERROR);
    expect(out.status).toBe(500);
    expect(out.cause).toEqual(unknown);
    expect(out.isOperational).toBe(true);
  });
});

describe("Factory helpers and withContext nullish coalescing edge cases", () => {
  it("DataError.validation respects falsy status 0 and empty string code (but defaults isOperational true)", () => {
    const err = DataError.validation("m", {
      code: "",
      status: 0,
      isOperational: false,
      context: { a: 1 },
    });
    expect(err.code).toBe("");
    expect(err.status).toBe(0);
    expect(err.isOperational).toBe(true);
    expect(err.context).toEqual({ a: 1 });
  });

  it("DataError.transformation respects falsy status 0 and empty string code (but defaults isOperational true)", () => {
    const err = DataError.transformation("boom", {
      code: "",
      status: 0,
      isOperational: false,
      context: { s: 1 },
    });
    expect(err.code).toBe("");
    expect(err.status).toBe(0);
    expect(err.isOperational).toBe(true);
    expect(err.context).toEqual({ s: 1 });
  });

  it("ValidationError.withContext preserves falsy code/status on instance (uses ??, not ||)", () => {
    const base = new ValidationError("bad", { code: "", status: 0, context: { a: 1 } });
    const next = base.withContext({ b: 2 });
    expect(next.code).toBe("");
    expect(next.status).toBe(0);
    expect(next.context).toEqual({ a: 1, b: 2 });
  });

  it("TransformationError.withContext preserves falsy code/status on instance (uses ??, not ||)", () => {
    const base = new TransformationError("boom", { code: "", status: 0, context: { s: 1 } });
    const next = base.withContext({ t: 2 });
    expect(next.code).toBe("");
    expect(next.status).toBe(0);
    expect(next.context).toEqual({ s: 1, t: 2 });
  });
});
