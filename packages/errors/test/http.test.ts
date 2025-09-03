/**
 * @fileoverview This file contains unit tests for the HTTP error classes.
 */

import { describe, it, expect } from "vitest";
import { HttpError, ErrorCode } from "../src/http";

describe("HttpError", () => {
  it("should create an instance and set status automatically from code", () => {
    const error = new HttpError("Not Found", { code: ErrorCode.NOT_FOUND });
    expect(error).toBeInstanceOf(HttpError);
    expect(error.message).toBe("Not Found");
    expect(error.name).toBe("HttpError");
    expect(error.status).toBe(404);
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
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
});
