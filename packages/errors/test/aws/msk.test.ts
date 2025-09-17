import { describe, it, expect } from "vitest";
import { MskError, AwsErrorCodes } from "../../src/aws";

describe("aws/msk: MskError static helpers", () => {
  it("clusterNotFound", () => {
    const e = MskError.clusterNotFound();
    expect(e.code).toBe(AwsErrorCodes.MSK.CLUSTER_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, timeout, internal", () => {
    expect(MskError.throttling().code).toBe(AwsErrorCodes.MSK.THROTTLING);
    expect(MskError.accessDenied().code).toBe(AwsErrorCodes.MSK.ACCESS_DENIED);
    expect(MskError.validation().code).toBe(AwsErrorCodes.MSK.VALIDATION_ERROR);
    expect(MskError.timeout().code).toBe(AwsErrorCodes.MSK.TIMEOUT);
    expect(MskError.internal().code).toBe(AwsErrorCodes.MSK.INTERNAL_ERROR);
  });
});
