import { describe, it, expect } from "vitest";
import { DynamoDbError, AwsErrorCodes } from "../../src/aws";

describe("aws/dynamodb: DynamoDbError static helpers", () => {
  it("conditionalCheckFailed: defaults and overrides", () => {
    const d = DynamoDbError.conditionalCheckFailed();
    expect(d).toBeInstanceOf(DynamoDbError);
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.CONDITIONAL_CHECK_FAILED);
    expect(d.status).toBe(409);
    const o = DynamoDbError.conditionalCheckFailed("m", { code: "OVR", status: 499 });
    expect(o.code).toBe("OVR");
    expect(o.status).toBe(499);
  });

  it("throughputExceeded", () => {
    const d = DynamoDbError.throughputExceeded();
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.THROUGHPUT_EXCEEDED);
    expect(d.status).toBe(429);
  });

  it("itemNotFound", () => {
    const d = DynamoDbError.itemNotFound();
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.ITEM_NOT_FOUND);
    expect(d.status).toBe(404);
  });

  it("transactionConflict", () => {
    const d = DynamoDbError.transactionConflict();
    expect(d.code).toBe(AwsErrorCodes.DynamoDB.TRANSACTION_CONFLICT);
    expect(d.status).toBe(409);
  });

  it("accessDenied, throttling, validation, internal", () => {
    expect(DynamoDbError.accessDenied().code).toBe(AwsErrorCodes.DynamoDB.ACCESS_DENIED);
    expect(DynamoDbError.throttling().code).toBe(AwsErrorCodes.DynamoDB.THROTTLING);
    expect(DynamoDbError.validation().code).toBe(AwsErrorCodes.DynamoDB.VALIDATION_ERROR);
    expect(DynamoDbError.internal().code).toBe(AwsErrorCodes.DynamoDB.INTERNAL_ERROR);
  });
});
