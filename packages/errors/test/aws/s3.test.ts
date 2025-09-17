import { describe, it, expect } from "vitest";
import { S3Error, AwsErrorCodes } from "../../src/aws";

const expectDefaults = (e: S3Error, code: string, status: number) => {
  expect(e).toBeInstanceOf(S3Error);
  expect(e.code).toBe(code);
  expect(e.status).toBe(status);
};

describe("aws/s3: S3Error static helpers", () => {
  it("bucketNotFound: defaults and overrides", () => {
    expectDefaults(S3Error.bucketNotFound(), AwsErrorCodes.S3.BUCKET_NOT_FOUND, 404);
    const ovr = S3Error.bucketNotFound("m", { code: "OVR", status: 499 });
    expect(ovr.code).toBe("OVR");
    expect(ovr.status).toBe(499);
  });

  it("objectNotFound: defaults and overrides", () => {
    expectDefaults(S3Error.objectNotFound(), AwsErrorCodes.S3.OBJECT_NOT_FOUND, 404);
    const ovr = S3Error.objectNotFound("m", { code: "OVR", status: 499 });
    expect(ovr.code).toBe("OVR");
  });

  it("accessDenied: defaults and overrides", () => {
    expectDefaults(S3Error.accessDenied(), AwsErrorCodes.S3.ACCESS_DENIED, 403);
    expect(S3Error.accessDenied("m", { status: 401 }).status).toBe(401);
  });

  it("throttling, validation, timeout, internal", () => {
    expectDefaults(S3Error.throttling(), AwsErrorCodes.S3.THROTTLING, 429);
    expectDefaults(S3Error.validation(), AwsErrorCodes.S3.VALIDATION_ERROR, 400);
    expectDefaults(S3Error.timeout(), AwsErrorCodes.S3.TIMEOUT, 504);
    expectDefaults(S3Error.internal(), AwsErrorCodes.S3.INTERNAL_ERROR, 500);
  });
});
