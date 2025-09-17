import { describe, it, expect } from "vitest";
import { SqsError, AwsErrorCodes } from "../../src/aws";

describe("aws/sqs: SqsError static helpers", () => {
  it("queueNotFound", () => {
    const e = SqsError.queueNotFound();
    expect(e.code).toBe(AwsErrorCodes.SQS.QUEUE_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("messageTooLarge", () => {
    const e = SqsError.messageTooLarge();
    expect(e.code).toBe(AwsErrorCodes.SQS.MESSAGE_TOO_LARGE);
    expect(e.status).toBe(400);
  });

  it("throttling, accessDenied, validation, timeout, internal", () => {
    expect(SqsError.throttling().code).toBe(AwsErrorCodes.SQS.THROTTLING);
    expect(SqsError.accessDenied().code).toBe(AwsErrorCodes.SQS.ACCESS_DENIED);
    expect(SqsError.validation().code).toBe(AwsErrorCodes.SQS.VALIDATION_ERROR);
    expect(SqsError.timeout().code).toBe(AwsErrorCodes.SQS.TIMEOUT);
    expect(SqsError.internal().code).toBe(AwsErrorCodes.SQS.INTERNAL_ERROR);
  });
});
