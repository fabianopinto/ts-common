/**
 * @fileoverview This file contains unit tests for the common, data, and AWS error classes.
 */

import { describe, it, expect } from "vitest";
import { ConfigurationError, DatabaseError, ThirdPartyServiceError } from "../src/common";
import { DataError, ValidationError, TransformationError } from "../src/data";
import { AwsError, S3Error, DynamoDbError, LambdaError, SqsError, SnsError } from "../src/aws";

describe("Common Error Classes", () => {
  it("ConfigurationError should be non-operational", () => {
    const error = new ConfigurationError("Invalid config");
    expect(error.name).toBe("ConfigurationError");
    expect(error.isOperational).toBe(false);
  });

  it("DatabaseError should be operational", () => {
    const error = new DatabaseError("Connection failed");
    expect(error.name).toBe("DatabaseError");
    expect(error.isOperational).toBe(true);
  });

  it("ThirdPartyServiceError should be operational", () => {
    const error = new ThirdPartyServiceError("API timeout");
    expect(error.name).toBe("ThirdPartyServiceError");
    expect(error.isOperational).toBe(true);
  });
});

describe("Data Error Classes", () => {
  it("DataError should be operational", () => {
    const error = new DataError("Invalid data");
    expect(error.name).toBe("DataError");
    expect(error.isOperational).toBe(true);
  });

  it("ValidationError should inherit from DataError", () => {
    const error = new ValidationError("Invalid email");
    expect(error).toBeInstanceOf(DataError);
    expect(error.name).toBe("ValidationError");
  });

  it("TransformationError should inherit from DataError", () => {
    const error = new TransformationError("Failed to transform");
    expect(error).toBeInstanceOf(DataError);
    expect(error.name).toBe("TransformationError");
  });
});

describe("AWS Error Classes", () => {
  it("AwsError should be operational", () => {
    const error = new AwsError("AWS issue");
    expect(error.name).toBe("AwsError");
    expect(error.isOperational).toBe(true);
  });

  it("S3Error should inherit from AwsError", () => {
    const error = new S3Error("Bucket not found");
    expect(error).toBeInstanceOf(AwsError);
    expect(error.name).toBe("S3Error");
  });

  it("DynamoDbError should inherit from AwsError", () => {
    const error = new DynamoDbError("Provisioned throughput exceeded");
    expect(error).toBeInstanceOf(AwsError);
    expect(error.name).toBe("DynamoDbError");
  });

  it("LambdaError should inherit from AwsError", () => {
    const error = new LambdaError("Function timeout");
    expect(error).toBeInstanceOf(AwsError);
    expect(error.name).toBe("LambdaError");
  });

  it("SqsError should inherit from AwsError", () => {
    const error = new SqsError("Message not available");
    expect(error).toBeInstanceOf(AwsError);
    expect(error.name).toBe("SqsError");
  });

  it("SnsError should inherit from AwsError", () => {
    const error = new SnsError("Invalid topic");
    expect(error).toBeInstanceOf(AwsError);
    expect(error.name).toBe("SnsError");
  });
});
