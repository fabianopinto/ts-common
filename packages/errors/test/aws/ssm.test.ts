import { describe, it, expect } from "vitest";
import { SsmError, AwsErrorCodes } from "../../src/aws";

describe("aws/ssm: SsmError static helpers", () => {
  it("parameterNotFound", () => {
    const e = SsmError.parameterNotFound();
    expect(e.code).toBe(AwsErrorCodes.SSM.PARAMETER_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied", () => {
    expect(SsmError.throttling().code).toBe(AwsErrorCodes.SSM.THROTTLING);
    expect(SsmError.accessDenied().code).toBe(AwsErrorCodes.SSM.ACCESS_DENIED);
  });
});
