import { describe, it, expect } from "vitest";
import { EventBridgeError, AwsErrorCodes } from "../../src/aws";

describe("aws/eventbridge: EventBridgeError static helpers", () => {
  it("busNotFound", () => {
    const e = EventBridgeError.busNotFound();
    expect(e.code).toBe(AwsErrorCodes.EventBridge.BUS_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("ruleNotFound", () => {
    const e = EventBridgeError.ruleNotFound();
    expect(e.code).toBe(AwsErrorCodes.EventBridge.RULE_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation", () => {
    expect(EventBridgeError.throttling().code).toBe(AwsErrorCodes.EventBridge.THROTTLING);
    expect(EventBridgeError.accessDenied().code).toBe(AwsErrorCodes.EventBridge.ACCESS_DENIED);
    expect(EventBridgeError.validation().code).toBe(AwsErrorCodes.EventBridge.VALIDATION_ERROR);
  });
});
