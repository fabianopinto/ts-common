import { describe, it, expect } from "vitest";
import { AwsError, makeAwsServiceError } from "../../src/aws";
import type { AppErrorOptions } from "../../src/base";

class DemoAwsError extends AwsError {}

describe("aws/base: AwsError static helpers", () => {
  const table: Array<[string, (msg?: string, opts?: AppErrorOptions) => AwsError, string, number]> =
    [
      ["authentication", AwsError.authentication, "AWS_AUTHENTICATION_ERROR", 401],
      ["accessDenied", AwsError.accessDenied, "AWS_ACCESS_DENIED", 403],
      ["throttling", AwsError.throttling, "AWS_THROTTLING", 429],
      ["timeout", AwsError.timeout, "AWS_TIMEOUT", 504],
      ["notFound", AwsError.notFound, "AWS_NOT_FOUND", 404],
      ["conflict", AwsError.conflict, "AWS_CONFLICT", 409],
      ["validation", AwsError.validation, "AWS_VALIDATION_ERROR", 400],
      ["serviceUnavailable", AwsError.serviceUnavailable, "AWS_SERVICE_UNAVAILABLE", 503],
      ["internal", AwsError.internal, "AWS_INTERNAL_ERROR", 500],
    ];

  it("creates instances with defaults and allows overrides", () => {
    for (const [name, factory, defaultCode, defaultStatus] of table) {
      const e1 = factory();
      expect(e1).toBeInstanceOf(AwsError);
      expect(e1.code).toBe(defaultCode);
      expect(e1.status).toBe(defaultStatus);

      const e2 = factory("msg", { code: "OVR", status: 999 });
      expect(e2.code).toBe("OVR");
      expect(e2.status).toBe(999);
    }
  });
});

describe("aws/base: makeAwsServiceError", () => {
  it("applies defaults, merges options and forces isOperational true by default", () => {
    const err = makeAwsServiceError(
      DemoAwsError,
      "message",
      { code: "DEFAULT", status: 418 },
      { context: { x: 1 } },
    );
    expect(err).toBeInstanceOf(DemoAwsError);
    expect(err.code).toBe("DEFAULT");
    expect(err.status).toBe(418);
    expect(err.isOperational).toBe(true);
    expect(err.context).toEqual({ x: 1 });
  });

  it("respects explicit isOperational override via options", () => {
    const err = makeAwsServiceError(
      DemoAwsError,
      "message",
      { code: "DEFAULT" },
      { isOperational: false },
    );
    expect(err.isOperational).toBe(false);
  });
});

describe("aws/base: AwsError constructor isOperational nullish default", () => {
  it("defaults to true when isOperational is undefined", () => {
    const e = new AwsError("msg");
    expect(e.isOperational).toBe(true);
  });

  it("respects explicit false", () => {
    const e = new AwsError("msg", { isOperational: false });
    expect(e.isOperational).toBe(false);
  });

  it("respects explicit true", () => {
    const e = new AwsError("msg", { isOperational: true });
    expect(e.isOperational).toBe(true);
  });
});
