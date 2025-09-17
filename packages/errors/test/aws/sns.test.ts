import { describe, it, expect } from "vitest";
import { SnsError, AwsErrorCodes } from "../../src/aws";

describe("aws/sns: SnsError static helpers", () => {
  it("topicNotFound", () => {
    const e = SnsError.topicNotFound();
    expect(e.code).toBe(AwsErrorCodes.SNS.TOPIC_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, internal", () => {
    expect(SnsError.throttling().code).toBe(AwsErrorCodes.SNS.THROTTLING);
    expect(SnsError.accessDenied().code).toBe(AwsErrorCodes.SNS.ACCESS_DENIED);
    expect(SnsError.validation().code).toBe(AwsErrorCodes.SNS.VALIDATION_ERROR);
    expect(SnsError.internal().code).toBe(AwsErrorCodes.SNS.INTERNAL_ERROR);
  });
});
