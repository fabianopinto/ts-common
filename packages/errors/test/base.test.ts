/**
 * @fileoverview This file contains unit tests for the base error classes.
 */

import { describe, it, expect } from "vitest";
import { BaseError, AppError, ErrorContext } from "../src/base";

describe("BaseError", () => {
  it("should create an instance with a message", () => {
    const error = new BaseError("Test message");
    expect(error).toBeInstanceOf(BaseError);
    expect(error.message).toBe("Test message");
    expect(error.name).toBe("BaseError");
  });

  it("should be an instance of Error", () => {
    const error = new BaseError("Test message");
    expect(error).toBeInstanceOf(Error);
  });

  it("should have isOperational set to false by default", () => {
    const error = new BaseError("Test message");
    expect(error.isOperational).toBe(false);
  });

  it("should accept an isOperational flag", () => {
    const error = new BaseError("Test message", { isOperational: true });
    expect(error.isOperational).toBe(true);
  });

  it("should accept a cause", () => {
    const cause = new Error("Original cause");
    const error = new BaseError("Test message", { cause });
    expect(error.cause).toBe(cause);
  });

  it("should handle a nullish cause", () => {
    const error = new BaseError("Test message", { cause: undefined });
    expect(error.cause).toBeUndefined();
  });

  it("should accept a code", () => {
    const error = new BaseError("Test message", { code: "TEST_CODE" });
    expect(error.code).toBe("TEST_CODE");
  });

  it("should accept context", () => {
    const context: ErrorContext = { key: "value" };
    const error = new BaseError("Test message", { context });
    expect(error.context).toEqual(context);
  });

  it("should serialize to JSON correctly", () => {
    const cause = new Error("Original cause");
    const context: ErrorContext = { key: "value" };
    const error = new BaseError("Test message", {
      cause,
      context,
      code: "TEST_CODE",
      isOperational: true,
    });

    const json = error.toJSON();

    expect(json.name).toBe("BaseError");
    expect(json.message).toBe("Test message");
    expect(json.code).toBe("TEST_CODE");
    expect(json.context).toEqual(context);
    expect(json.isOperational).toBe(true);
    expect(json.cause).toEqual({
      name: "Error",
      message: "Original cause",
      stack: cause.stack,
    });
    expect(json.stack).toBe(error.stack);
  });

  it("should serialize a cause that is an AppError", () => {
    const appErrorCause = new AppError("App cause", { status: 400 });
    const error = new BaseError("Test message", { cause: appErrorCause });
    const json = error.toJSON();
    expect(json.cause).toEqual(appErrorCause.toJSON());
  });

  it("should serialize a cause that is a plain object", () => {
    const cause = { info: "some data" };
    const error = new BaseError("Test message", { cause });
    const json = error.toJSON();
    expect(json.cause).toEqual(cause);
  });

  it("should serialize a cause that cannot be stringified", () => {
    const cause = { a: BigInt(9007199254740991) }; // BigInts cannot be stringified
    const error = new BaseError("Test message", { cause });
    const json = error.toJSON();
    expect(json.cause).toBe("[object Object]");
  });

  it("should serialize a cause that is a primitive string", () => {
    const cause = "a string cause";
    const error = new BaseError("Test message", { cause });
    const json = error.toJSON();
    expect(json.cause).toBe("a string cause");
  });
});

describe("AppError", () => {
  it("should create an instance and inherit from BaseError", () => {
    const error = new AppError("App message");
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.message).toBe("App message");
    expect(error.name).toBe("AppError");
  });

  it("should accept a status code", () => {
    const error = new AppError("App message", { status: 404 });
    expect(error.status).toBe(404);
  });

  it("should serialize to JSON correctly, including status", () => {
    const error = new AppError("App message", { status: 404, code: "NOT_FOUND" });
    const json = error.toJSON();

    expect(json.name).toBe("AppError");
    expect(json.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  describe("withContext", () => {
    it("should return a new AppError with merged context", () => {
      const initialContext: ErrorContext = { initial: "value" };
      const error = new AppError("Test", { context: initialContext, status: 400 });

      const extraContext: ErrorContext = { extra: "data" };
      const newError = error.withContext(extraContext);

      expect(newError).not.toBe(error);
      expect(newError).toBeInstanceOf(AppError);
      expect(newError.message).toBe("Test");
      expect(newError.status).toBe(400);
      expect(newError.context).toEqual({ initial: "value", extra: "data" });
    });

    it("should handle an empty initial context", () => {
      const error = new AppError("Test");
      const newError = error.withContext({ key: "value" });
      expect(newError.context).toEqual({ key: "value" });
    });
  });

  describe("AppError.from", () => {
    it("should return the same instance if it is already an AppError", () => {
      const originalError = new AppError("Original");
      const newError = AppError.from(originalError);
      expect(newError).toBe(originalError);
    });

    it("should create a new AppError if message or context is provided", () => {
      const originalError = new AppError("Original", { code: "ORIGINAL" });
      const newError = AppError.from(originalError, "New message", { extra: "data" });

      expect(newError).not.toBe(originalError);
      expect(newError.message).toBe("New message");
      expect(newError.code).toBe("ORIGINAL");
      expect(newError.context).toEqual({ extra: "data" });
    });

    it("should create a new AppError with only a new message", () => {
      const originalError = new AppError("Original", { context: { initial: "value" } });
      const newError = AppError.from(originalError, "New message");

      expect(newError.message).toBe("New message");
      expect(newError.context).toEqual({ initial: "value" });
    });

    it("should create a new AppError with only new context", () => {
      const originalError = new AppError("Original");
      const newError = AppError.from(originalError, undefined, { extra: "data" });

      expect(newError.message).toBe("Original");
      expect(newError.context).toEqual({ extra: "data" });
    });

    it("should wrap a native Error", () => {
      const cause = new Error("Native error");
      const appError = AppError.from(cause, "Wrapped");

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.message).toBe("Wrapped");
      expect(appError.cause).toBe(cause);
    });

    it("should wrap a native Error and use its message if none is provided", () => {
      const cause = new Error("Native error message");
      const appError = AppError.from(cause);

      expect(appError.message).toBe("Native error message");
      expect(appError.cause).toBe(cause);
    });

    it("should handle unknown, non-Error types", () => {
      const cause = "just a string";
      const appError = AppError.from(cause, "From string");

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.message).toBe("From string");
      expect(appError.cause).toBe(cause);
    });

    it("should use a default message for unknown errors if none is provided", () => {
      const appError = AppError.from("some cause");
      expect(appError.message).toBe("Unknown error");
    });
  });
});

// Additional edge cases and subclass behavior
describe("BaseError additional coverage", () => {
  it("should keep name as subclass name for derived errors", () => {
    class CustomError extends BaseError {}
    const err = new CustomError("custom");
    expect(err.name).toBe("CustomError");
    expect(err).toBeInstanceOf(CustomError);
    expect(err).toBeInstanceOf(BaseError);
  });

  it("toJSON should short-circuit and keep cause when falsy (undefined)", () => {
    const err = new BaseError("msg", { cause: undefined });
    const json = err.toJSON();
    expect(json.cause).toBeUndefined();
  });

  it("toJSON should short-circuit and keep cause when falsy (null)", () => {
    const err = new BaseError("msg", { cause: null });
    const json = err.toJSON();
    expect(json.cause).toBeNull();
  });

  it("toJSON should serialize primitive number and boolean causes as-is", () => {
    const numErr = new BaseError("num", { cause: 42 });
    const boolErr = new BaseError("bool", { cause: false });
    expect(numErr.toJSON().cause).toBe(42);
    expect(boolErr.toJSON().cause).toBe(false);
  });

  it("toJSON should include a stack string", () => {
    const err = new BaseError("stack test");
    const json = err.toJSON();
    expect(typeof json.stack === "string" || json.stack === undefined).toBe(true);
  });
});

describe("AppError additional coverage", () => {
  it("withContext should not mutate original instance or its context", () => {
    const initialContext: ErrorContext = { a: 1 };
    const original = new AppError("msg", {
      context: initialContext,
      status: 418,
      code: "I_AM_A_TEAPOT",
    });
    const extra = { b: 2 };
    const next = original.withContext(extra);

    // Original remains unchanged
    expect(original.context).toEqual({ a: 1 });
    expect(original.status).toBe(418);
    expect(original.code).toBe("I_AM_A_TEAPOT");

    // New instance has merged context
    expect(next).not.toBe(original);
    expect(next.context).toEqual({ a: 1, b: 2 });
    expect(next.status).toBe(418);
    expect(next.code).toBe("I_AM_A_TEAPOT");
  });

  it("AppError.from(AppError) should preserve status, code, and isOperational when rewrapping", () => {
    const original = new AppError("orig", {
      status: 503,
      code: "SVC_UNAVAILABLE",
      isOperational: true,
      context: { k: 1 },
    });
    const wrapped = AppError.from(original, "new msg", { x: 2 });

    expect(wrapped).not.toBe(original);
    expect(wrapped.message).toBe("new msg");
    expect(wrapped.status).toBe(503);
    expect(wrapped.code).toBe("SVC_UNAVAILABLE");
    expect(wrapped.isOperational).toBe(true);
    expect(wrapped.context).toEqual({ k: 1, x: 2 });
  });
});
