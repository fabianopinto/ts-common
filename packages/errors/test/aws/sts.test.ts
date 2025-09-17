import { describe, it, expect } from "vitest";
import { StsError, AwsErrorCodes } from "../../src/aws";

describe("aws/sts: StsError static helpers", () => {
  it("authentication, accessDenied, throttling, validation, timeout, internal", () => {
    expect(StsError.authentication().code).toBe(AwsErrorCodes.STS.AUTHENTICATION_ERROR);
    expect(StsError.accessDenied().code).toBe(AwsErrorCodes.STS.ACCESS_DENIED);
    expect(StsError.throttling().code).toBe(AwsErrorCodes.STS.THROTTLING);
    expect(StsError.validation().code).toBe(AwsErrorCodes.STS.VALIDATION_ERROR);
    expect(StsError.timeout().code).toBe(AwsErrorCodes.STS.TIMEOUT);
    expect(StsError.internal().code).toBe(AwsErrorCodes.STS.INTERNAL_ERROR);
  });
});
