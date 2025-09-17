import { describe, it, expect } from "vitest";
import { StepFunctionsError, AwsErrorCodes } from "../../src/aws";

describe("aws/stepfunctions: StepFunctionsError static helpers", () => {
  it("executionNotFound", () => {
    const e = StepFunctionsError.executionNotFound();
    expect(e.code).toBe(AwsErrorCodes.StepFunctions.EXECUTION_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("stateMachineNotFound", () => {
    const e = StepFunctionsError.stateMachineNotFound();
    expect(e.code).toBe(AwsErrorCodes.StepFunctions.STATE_MACHINE_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, internal", () => {
    expect(StepFunctionsError.throttling().code).toBe(AwsErrorCodes.StepFunctions.THROTTLING);
    expect(StepFunctionsError.accessDenied().code).toBe(AwsErrorCodes.StepFunctions.ACCESS_DENIED);
    expect(StepFunctionsError.validation().code).toBe(AwsErrorCodes.StepFunctions.VALIDATION_ERROR);
    expect(StepFunctionsError.internal().code).toBe(AwsErrorCodes.StepFunctions.INTERNAL_ERROR);
  });
});
