import { describe, it, expect } from "vitest";
import { ApiGatewayError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

describe("aws/apigateway: ApiGatewayError static helpers", () => {
  it("notFound", () => {
    const e = ApiGatewayError.notFound();
    expect(e.code).toBe(AwsErrorCodes.ApiGateway.NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, timeout, internal", () => {
    expect(ApiGatewayError.throttling().code).toBe(AwsErrorCodes.ApiGateway.THROTTLING);
    expect(ApiGatewayError.accessDenied().code).toBe(AwsErrorCodes.ApiGateway.ACCESS_DENIED);
    expect(ApiGatewayError.validation().code).toBe(AwsErrorCodes.ApiGateway.VALIDATION_ERROR);
    expect(ApiGatewayError.timeout().code).toBe(AwsErrorCodes.ApiGateway.TIMEOUT);
    expect(ApiGatewayError.internal().code).toBe(AwsErrorCodes.ApiGateway.INTERNAL_ERROR);
  });

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = ApiGatewayError.notFound("missing", { context: { a: 1 } });
      const out = ApiGatewayError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = ApiGatewayError.notFound("missing", { context: { a: 1 } });
      const out = ApiGatewayError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(ApiGatewayError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.ApiGateway.NOT_FOUND);
      expect(out.status).toBe(404);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override is undefined and merges context", () => {
      const original = ApiGatewayError.timeout("keep", { context: { a: 1 } });
      const out = ApiGatewayError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.ApiGateway.TIMEOUT);
      expect(out.status).toBe(504);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to ApiGatewayError with default code/status and merges context", () => {
      const app = new AppError("app", { status: 500, context: { s: 1 } });
      // Remove isOperational to make it undefined and exercise defaults in fromAwsError pipeline if any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = ApiGatewayError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(ApiGatewayError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.ApiGateway.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with default meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = ApiGatewayError.from(e);
      expect(out).toBeInstanceOf(ApiGatewayError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.ApiGateway.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = ApiGatewayError.from(cause);
      expect(out).toBeInstanceOf(ApiGatewayError);
      expect(out.message).toBe("AWS service error");
      // fromAwsError default meta applied
      expect(out.code).toBe(AwsErrorCodes.ApiGateway.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = ApiGatewayError.validation("m", { context: { a: 1 } });
      const out = ApiGatewayError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });
  });
});
