import { describe, it, expect } from "vitest";
import { StepFunctionsError, AwsErrorCodes } from "../../src/aws";
import { AppError } from "../../src/base";

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

  describe("from", () => {
    it("returns same instance when no overrides provided", () => {
      const original = StepFunctionsError.executionNotFound("missing", { context: { a: 1 } });
      const out = StepFunctionsError.from(original);
      expect(out).toBe(original);
    });

    it("clones with message override and merges context", () => {
      const original = StepFunctionsError.stateMachineNotFound("missing", { context: { a: 1 } });
      const out = StepFunctionsError.from(original, "override", { b: 2 });
      expect(out).not.toBe(original);
      expect(out).toBeInstanceOf(StepFunctionsError);
      expect(out.message).toBe("override");
      expect(out.code).toBe(AwsErrorCodes.StepFunctions.STATE_MACHINE_NOT_FOUND);
      expect(out.status).toBe(404);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("keeps original message when override undefined and merges context", () => {
      const original = StepFunctionsError.internal("keep", { context: { a: 1 } });
      const out = StepFunctionsError.from(original, undefined, { b: 2 });
      expect(out.message).toBe("keep");
      expect(out.code).toBe(AwsErrorCodes.StepFunctions.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ a: 1, b: 2 });
    });

    it("maps AppError to StepFunctionsError with fallback code/status and merges context", () => {
      const app = new AppError("app", { context: { s: 1 } }); // no status → fallback 500
      // ensure isOperational undefined triggers default true in fromAwsError path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (app as any).isOperational;
      const out = StepFunctionsError.from(app, undefined, { t: 2 });
      expect(out).toBeInstanceOf(StepFunctionsError);
      expect(out.message).toBe("app");
      expect(out.code).toBe(AwsErrorCodes.StepFunctions.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.context).toEqual({ s: 1, t: 2 });
      expect(out.cause).toBe(app);
    });

    it("wraps native Error with fallback meta and uses original message when override undefined", () => {
      const e = new Error("boom");
      const out = StepFunctionsError.from(e);
      expect(out).toBeInstanceOf(StepFunctionsError);
      expect(out.message).toBe("boom");
      expect(out.code).toBe(AwsErrorCodes.StepFunctions.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toBe(e);
    });

    it("wraps unknown non-error with default message and attaches cause", () => {
      const cause = { any: true };
      const out = StepFunctionsError.from(cause);
      expect(out).toBeInstanceOf(StepFunctionsError);
      expect(out.message).toBe("AWS service error");
      expect(out.code).toBe(AwsErrorCodes.StepFunctions.INTERNAL_ERROR);
      expect(out.status).toBe(500);
      expect(out.cause).toEqual(cause);
    });

    it("preserves original context when provided context is undefined", () => {
      const original = StepFunctionsError.executionNotFound("m", { context: { a: 1 } });
      const out = StepFunctionsError.from(original, "override", undefined);
      expect(out.context).toEqual({ a: 1 });
    });

    it("uses provided context only when original context is undefined", () => {
      const original = new StepFunctionsError("m");
      const out = StepFunctionsError.from(original, "override", { added: true });
      expect(out.context).toEqual({ added: true });
    });
  });
});
