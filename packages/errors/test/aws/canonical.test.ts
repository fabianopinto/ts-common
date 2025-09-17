import { describe, it, expect } from "vitest";
import { canonicalService } from "../../src/aws";

describe("aws/canonical: canonicalService", () => {
  it("returns undefined for falsy inputs", () => {
    expect(canonicalService()).toBeUndefined();
    expect(canonicalService(null)).toBeUndefined();
    expect(canonicalService("")).toBeUndefined();
  });

  it("normalizes case, underscores and hyphens", () => {
    expect(canonicalService("CLOUDWATCH_LOGS")).toBe("CLOUDWATCH_LOGS");
    expect(canonicalService("cloudwatch-logs")).toBe("CLOUDWATCH_LOGS");
    expect(canonicalService("CloudWatchLogs")).toBe("CLOUDWATCH_LOGS");
  });

  it("maps common aliases", () => {
    expect(canonicalService("ddb")).toBe("DYNAMODB");
    expect(canonicalService("apigw")).toBe("APIGATEWAY");
    expect(canonicalService("kafka")).toBe("MSK");
    expect(canonicalService("secretsmanager")).toBe("SECRETSMANAGER");
  });
});
