import { describe, it, expect } from "vitest";
import { CloudWatchMetricsError, AwsErrorCodes } from "../../src/aws";

describe("aws/cloudwatch-metrics: CloudWatchMetricsError static helpers", () => {
  it("throttling", () => {
    const e = CloudWatchMetricsError.throttling();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchMetrics.THROTTLING);
    expect(e.status).toBe(429);
  });

  it("limitExceeded", () => {
    const e = CloudWatchMetricsError.limitExceeded();
    expect(e.code).toBe(AwsErrorCodes.CloudWatchMetrics.LIMIT_EXCEEDED);
    expect(e.status).toBe(429);
  });

  it("accessDenied, validation, internal", () => {
    expect(CloudWatchMetricsError.accessDenied().code).toBe(
      AwsErrorCodes.CloudWatchMetrics.ACCESS_DENIED,
    );
    expect(CloudWatchMetricsError.validation().code).toBe(
      AwsErrorCodes.CloudWatchMetrics.VALIDATION_ERROR,
    );
    expect(CloudWatchMetricsError.internal().code).toBe(
      AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR,
    );
  });
});
