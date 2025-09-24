import { describe, it, expect } from "vitest";
import { EventBridgeError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

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

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = EventBridgeError.busNotFound("missing", { context: { a: 1 } });
      const out = EventBridgeError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = EventBridgeError.ruleNotFound("missing", { context: { a: 1 } });
      const out = EventBridgeError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(EventBridgeError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.EventBridge.RULE_NOT_FOUND);
      expect(out.status).toBe(404);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = EventBridgeError.validation("keep", { context: { a: 1 } });
      const out = EventBridgeError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.EventBridge.VALIDATION_ERROR);
      expect(out.status).toBe(400);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to EventBridgeError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // status undefined → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = EventBridgeError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(EventBridgeError);
      expect(out.message).toBe("app");
      expect(out.code).toBe("EVENTBRIDGE_INTERNAL_ERROR");
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = EventBridgeError.from(e);
      expect(out).toBeInstanceOf(EventBridgeError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe("EVENTBRIDGE_INTERNAL_ERROR");
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = EventBridgeError.from(cause);
      expect(out).toBeInstanceOf(EventBridgeError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe("EVENTBRIDGE_INTERNAL_ERROR");
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = EventBridgeError.busNotFound("m", { context: { a: 1 } });
      const out = EventBridgeError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new EventBridgeError("m");
      const out = EventBridgeError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
