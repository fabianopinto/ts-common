import { describe, it, expect } from "vitest";
import { KinesisError, AwsErrorCodes } from "../../src/aws";

describe("aws/kinesis: KinesisError static helpers", () => {
  it("provisionedThroughputExceeded", () => {
    const e = KinesisError.provisionedThroughputExceeded();
    expect(e.code).toBe(AwsErrorCodes.Kinesis.PROVISIONED_THROUGHPUT_EXCEEDED);
    expect(e.status).toBe(429);
  });

  it("throttling, streamNotFound, accessDenied, validation, timeout, internal", () => {
    expect(KinesisError.throttling().code).toBe(AwsErrorCodes.Kinesis.THROTTLING);
    expect(KinesisError.streamNotFound().code).toBe(AwsErrorCodes.Kinesis.STREAM_NOT_FOUND);
    expect(KinesisError.accessDenied().code).toBe(AwsErrorCodes.Kinesis.ACCESS_DENIED);
    expect(KinesisError.validation().code).toBe(AwsErrorCodes.Kinesis.VALIDATION_ERROR);
    expect(KinesisError.timeout().code).toBe(AwsErrorCodes.Kinesis.TIMEOUT);
    expect(KinesisError.internal().code).toBe(AwsErrorCodes.Kinesis.INTERNAL_ERROR);
  });
});
