import { describe, it, expect } from "vitest";
import { LambdaError, AwsErrorCodes } from "../../src/aws";

describe("aws/lambda: LambdaError static helpers", () => {
  it("functionNotFound", () => {
    const e = LambdaError.functionNotFound();
    expect(e.code).toBe(AwsErrorCodes.Lambda.FUNCTION_NOT_FOUND);
    expect(e.status).toBe(404);
  });
  it("throttling, accessDenied, timeout, validation, serviceUnavailable, internal", () => {
    expect(LambdaError.throttling().code).toBe(AwsErrorCodes.Lambda.THROTTLING);
    expect(LambdaError.accessDenied().code).toBe(AwsErrorCodes.Lambda.ACCESS_DENIED);
    expect(LambdaError.timeout().code).toBe(AwsErrorCodes.Lambda.TIMEOUT);
    expect(LambdaError.validation().code).toBe(AwsErrorCodes.Lambda.VALIDATION_ERROR);
    expect(LambdaError.serviceUnavailable().code).toBe(AwsErrorCodes.Lambda.SERVICE_UNAVAILABLE);
    expect(LambdaError.internal().code).toBe(AwsErrorCodes.Lambda.INTERNAL_ERROR);
  });
});
