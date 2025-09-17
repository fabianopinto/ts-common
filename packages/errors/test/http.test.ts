/**
 * @fileoverview This file contains unit tests for the HTTP error classes.
 */

import { describe, it, expect } from "vitest";
import { HttpError, ErrorCode } from "../src/http";
import { AppError } from "../src/base";

describe("HttpError", () => {
  it("should create an instance and set status automatically from code", () => {
    const error = new HttpError("Not Found", { code: ErrorCode.NOT_FOUND });
    expect(error).toBeInstanceOf(HttpError);
    expect(error.message).toBe("Not Found");
    expect(error.name).toBe("HttpError");
    expect(error.status).toBe(404);
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
  });

  describe("withContext", () => {
    it("merges extra context with existing and preserves properties", () => {
      const base = new HttpError("m", { code: ErrorCode.BAD_REQUEST, context: { a: 1 } });
      const next = base.withContext({ b: 2 });
      expect(next).toBeInstanceOf(HttpError);
      expect(next).not.toBe(base);
      expect(next.message).toBe("m");
      expect(next.code).toBe(ErrorCode.BAD_REQUEST);
      expect(next.status).toBe(400);
      expect(next.context).toEqual({ a: 1, b: 2 });
    });

    it("handles undefined initial context (covers ...(this.context ?? {}))", () => {
      const base = new HttpError("m", { code: ErrorCode.CONFLICT });
      const next = base.withContext({ added: true });
      expect(next.context).toEqual({ added: true });
      expect(next.code).toBe(ErrorCode.CONFLICT);
      expect(next.status).toBe(409);
    });

    it("defaults code to INTERNAL_SERVER_ERROR when this.code is undefined (covers code ?? fallback)", () => {
      const base = new HttpError("m", { code: ErrorCode.BAD_REQUEST, status: 400 });
      // Remove code to make it undefined for the withContext call
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (base as any).code;
      const next = base.withContext({ x: 1 });
      expect(next).toBeInstanceOf(HttpError);
      expect(next.message).toBe("m");
      expect(next.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR); // fallback
      expect(next.status).toBe(400); // preserved
      expect(next.context).toEqual({ x: 1 });
    });
  });

  describe("is type guard", () => {
    it("returns true for HttpError", () => {
      expect(HttpError.is(new HttpError("x", { code: ErrorCode.NOT_FOUND }))).toBe(true);
    });
    it("returns false for non-HttpError", () => {
      expect(HttpError.is(new Error("e"))).toBe(false);
      class NotHttpError extends Error {}
      expect(HttpError.is(new NotHttpError())).toBe(false);
    });
  });

  describe("fromCode", () => {
    it("when err is HttpError and both message and context are undefined, returns same instance (covers short-circuit)", () => {
      const original = new HttpError("keep", { code: ErrorCode.BAD_REQUEST, context: { a: 1 } });
      const out = HttpError.fromCode(original, ErrorCode.CONFLICT);
      expect(out).toBe(original);
      // Ensure no accidental mutation
      expect(out.code).toBe(ErrorCode.BAD_REQUEST);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1 });
    });

    it("when err is HttpError and message undefined, keeps original message and merges context", () => {
      const original = new HttpError("keep", { code: ErrorCode.BAD_REQUEST, context: { a: 1 } });
      const out = HttpError.fromCode(original, ErrorCode.CONFLICT, undefined, { b: 2 });
      expect(out).toBeInstanceOf(HttpError);
      expect(out).not.toBe(original);
      expect(out.message).toBe("keep");
      expect(out.code).toBe(ErrorCode.CONFLICT);
      expect(out.status).toBe(409);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("when err is HttpError and original context undefined, uses provided context only (covers ...(err.context ?? {}))", () => {
      const original = new HttpError("keep", { code: ErrorCode.BAD_REQUEST }); // no context
      const out = HttpError.fromCode(original, ErrorCode.CONFLICT, undefined, { b: 2 });
      expect(out).toBeInstanceOf(HttpError);
      expect(out).not.toBe(original);
      expect(out.message).toBe("keep");
      expect(out.code).toBe(ErrorCode.CONFLICT);
      expect(out.status).toBe(409);
      expect(out.context).toEqual({ b: 2 });
    });

    it("when err is HttpError and context undefined, preserves original context and overrides message", () => {
      const original = new HttpError("m", { code: ErrorCode.NOT_FOUND, context: { a: 1 } });
      const out = HttpError.fromCode(original, ErrorCode.BAD_REQUEST, "override", undefined);
      expect(out.message).toBe("override");
      expect(out.code).toBe(ErrorCode.BAD_REQUEST);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1 });
    });

    it("when err is AppError and original context undefined, uses provided context only", () => {
      const app = new AppError("app", { status: 418 });
      const out = HttpError.fromCode(app, ErrorCode.UNPROCESSABLE_ENTITY, undefined, { b: 2 });
      expect(out).toBeInstanceOf(HttpError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(ErrorCode.UNPROCESSABLE_ENTITY);
      expect(out.status).toBe(422);
      expect(out.context).toEqual({ b: 2 });
      expect(out.cause).toBe(app);
    });

    it("when err is AppError and provided context undefined, preserves original context", () => {
      const app = new AppError("app", { status: 401, context: { a: 1 } });
      const out = HttpError.fromCode(app, ErrorCode.UNAUTHORIZED, undefined, undefined);
      expect(out.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(out.status).toBe(401);
      expect(out.context).toEqual({ a: 1 });
    });

    it("when err is native Error and message undefined, uses original message and maps status", () => {
      const e = new Error("boom");
      const out = HttpError.fromCode(e, ErrorCode.TOO_MANY_REQUESTS);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(ErrorCode.TOO_MANY_REQUESTS);
      expect(out.status).toBe(429);
      expect(out.cause).toBe(e);
    });

    it("when err is unknown non-error, uses default message and attaches cause", () => {
      const unknown = { u: 1 };
      const out = HttpError.fromCode(unknown, ErrorCode.FORBIDDEN);
      expect(out.message).toBe("HTTP error");
      expect(out.code).toBe(ErrorCode.FORBIDDEN);
      expect(out.status).toBe(403);
      expect(out.cause).toEqual(unknown);
    });

    it("wrappers like fromTooManyRequests map to fromCode", () => {
      const e = new Error("rate");
      const out = HttpError.fromTooManyRequests(e, undefined, { a: 1 });
      expect(out.code).toBe(ErrorCode.TOO_MANY_REQUESTS);
      expect(out.status).toBe(429);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ a: 1 });
    });

    it("fromBadRequest maps to fromCode with BAD_REQUEST", () => {
      const e = new Error("bad input");
      const out = HttpError.fromBadRequest(e, undefined, { field: "q" });
      expect(out.code).toBe(ErrorCode.BAD_REQUEST);
      expect(out.status).toBe(400);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ field: "q" });
    });

    it("fromUnauthorized maps to fromCode with UNAUTHORIZED", () => {
      const e = new Error("no auth");
      const out = HttpError.fromUnauthorized(e, undefined, { hdr: "Authorization" });
      expect(out.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(out.status).toBe(401);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ hdr: "Authorization" });
    });

    it("fromForbidden maps to fromCode with FORBIDDEN", () => {
      const e = new Error("forbidden");
      const out = HttpError.fromForbidden(e, undefined, { perm: "x" });
      expect(out.code).toBe(ErrorCode.FORBIDDEN);
      expect(out.status).toBe(403);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ perm: "x" });
    });

    it("fromNotFound maps to fromCode with NOT_FOUND", () => {
      const e = new Error("missing");
      const out = HttpError.fromNotFound(e, undefined, { res: "item" });
      expect(out.code).toBe(ErrorCode.NOT_FOUND);
      expect(out.status).toBe(404);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ res: "item" });
    });

    it("fromMethodNotAllowed maps to fromCode with METHOD_NOT_ALLOWED", () => {
      const e = new Error("method");
      const out = HttpError.fromMethodNotAllowed(e, undefined, { method: "PUT" });
      expect(out.code).toBe(ErrorCode.METHOD_NOT_ALLOWED);
      expect(out.status).toBe(405);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ method: "PUT" });
    });

    it("fromConflict maps to fromCode with CONFLICT", () => {
      const e = new Error("conflict");
      const out = HttpError.fromConflict(e, undefined, { id: 1 });
      expect(out.code).toBe(ErrorCode.CONFLICT);
      expect(out.status).toBe(409);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ id: 1 });
    });

    it("fromUnprocessableEntity maps to fromCode with UNPROCESSABLE_ENTITY", () => {
      const e = new Error("unprocessable");
      const out = HttpError.fromUnprocessableEntity(e, undefined, { field: "name" });
      expect(out.code).toBe(ErrorCode.UNPROCESSABLE_ENTITY);
      expect(out.status).toBe(422);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ field: "name" });
    });

    it("fromInternalServerError maps to fromCode with INTERNAL_SERVER_ERROR", () => {
      const e = new Error("ise");
      const out = HttpError.fromInternalServerError(e, undefined, { trace: true });
      expect(out.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
      expect(out.context).toEqual({ trace: true });
    });
  });

  describe("guards", () => {
    it("ensure throws on falsy and not on truthy", () => {
      expect(() => HttpError.ensure(true)).not.toThrow();
      expect(() => HttpError.ensure(1)).not.toThrow();
      expect(() => HttpError.ensure("x")).not.toThrow();
      expect(() => HttpError.ensure({})).not.toThrow();
      expect(() => HttpError.ensure(0)).toThrowError(HttpError);
      expect(() => HttpError.ensure("" as unknown)).toThrowError(HttpError);
      expect(() => HttpError.ensure(null as unknown)).toThrowError(HttpError);
      expect(() => HttpError.ensure(undefined as unknown)).toThrowError(HttpError);
    });

    it("require returns value and throws on nullish", () => {
      expect(HttpError.require(123)).toBe(123);
      expect(HttpError.require("ok")).toBe("ok");
      expect(() => HttpError.require(null as any)).toThrowError(HttpError);
      expect(() => HttpError.require(undefined as any)).toThrowError(HttpError);
    });
  });

  it("should allow overriding the status code", () => {
    const error = new HttpError("Custom Not Found", { code: ErrorCode.NOT_FOUND, status: 499 });
    expect(error.status).toBe(499);
  });

  describe("Static Factory Methods", () => {
    it("should create a BAD_REQUEST error", () => {
      const error = HttpError.badRequest("Invalid input");
      expect(error.status).toBe(400);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.message).toBe("Invalid input");
    });

    it("should create a METHOD_NOT_ALLOWED error", () => {
      const error = HttpError.methodNotAllowed("Method not allowed");
      expect(error.status).toBe(405);
      expect(error.code).toBe(ErrorCode.METHOD_NOT_ALLOWED);
      expect(error.message).toBe("Method not allowed");
    });

    it("should create a NOT_FOUND error", () => {
      const error = HttpError.notFound("Resource not found");
      expect(error.status).toBe(404);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe("Resource not found");
    });

    it("should create an UNAUTHORIZED error", () => {
      const error = HttpError.unauthorized("Authentication required");
      expect(error.status).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe("Authentication required");
    });

    it("should create a FORBIDDEN error", () => {
      const error = HttpError.forbidden("Access denied");
      expect(error.status).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe("Access denied");
    });

    it("should create a CONFLICT error", () => {
      const error = HttpError.conflict("Resource already exists");
      expect(error.status).toBe(409);
      expect(error.code).toBe(ErrorCode.CONFLICT);
      expect(error.message).toBe("Resource already exists");
    });

    it("should create an UNPROCESSABLE_ENTITY error", () => {
      const error = HttpError.unprocessableEntity("Validation failed");
      expect(error.status).toBe(422);
      expect(error.code).toBe(ErrorCode.UNPROCESSABLE_ENTITY);
      expect(error.message).toBe("Validation failed");
    });

    it("should create a TOO_MANY_REQUESTS error", () => {
      const error = HttpError.tooManyRequests("Rate limit exceeded");
      expect(error.status).toBe(429);
      expect(error.code).toBe(ErrorCode.TOO_MANY_REQUESTS);
      expect(error.message).toBe("Rate limit exceeded");
    });

    it("should create an INTERNAL_SERVER_ERROR", () => {
      const cause = new Error("Underlying issue");
      const error = HttpError.internalServerError("Something went wrong", cause, { id: 123 });
      expect(error.status).toBe(500);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe("Something went wrong");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual({ id: 123 });
    });
  });

  describe("toJSON shape", () => {
    it("serializes BAD_REQUEST with context and cause", () => {
      const cause = new Error("invalid");
      const err = new HttpError("bad", { code: ErrorCode.BAD_REQUEST, context: { field: "q" }, status: 400, cause });
      const json = err.toJSON();
      expect(json).toMatchObject({
        name: "HttpError",
        message: "bad",
        code: ErrorCode.BAD_REQUEST,
        status: 400,
        context: { field: "q" },
      } as any);
      expect(json.cause).toMatchObject({ name: "Error", message: "invalid" });
      expect(typeof json.stack === "string" || json.stack === undefined).toBe(true);
    });
  });
});
