import { describe, it, expect } from "vitest";
import { CloudWatchLogsError, AwsErrorCodes } from "../../src/aws";

describe("aws/cloudwatch-logs: CloudWatchLogsError static helpers", () => {
  it("logGroupNotFound", () => {
    const e = CloudWatchLogsError.logGroupNotFound();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchLogs.LOG_GROUP_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("logStreamNotFound", () => {
    const e = CloudWatchLogsError.logStreamNotFound();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchLogs.LOG_STREAM_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, serviceUnavailable", () => {
    expect(CloudWatchLogsError.throttling().code).toBe(AwsErrorCodes.CloudWatchLogs.THROTTLING);
    expect(CloudWatchLogsError.accessDenied().code).toBe(
      AwsErrorCodes.CloudWatchLogs.ACCESS_DENIED,
    );
    expect(CloudWatchLogsError.validation().code).toBe(
      AwsErrorCodes.CloudWatchLogs.VALIDATION_ERROR,
    );
    expect(CloudWatchLogsError.serviceUnavailable().code).toBe(
      AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE,
    );
  });
});
