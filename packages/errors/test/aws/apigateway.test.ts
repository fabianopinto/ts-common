import { describe, it, expect } from "vitest";
import { ApiGatewayError, AwsErrorCodes } from "../../src/aws";

describe("aws/apigateway: ApiGatewayError static helpers", () => {
  it("notFound", () => {
    const e = ApiGatewayError.notFound();
    expect(e.code).toBe(AwsErrorCodes.ApiGateway.NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("throttling, accessDenied, validation, timeout, internal", () => {
    expect(ApiGatewayError.throttling().code).toBe(AwsErrorCodes.ApiGateway.THROTTLING);
    expect(ApiGatewayError.accessDenied().code).toBe(AwsErrorCodes.ApiGateway.ACCESS_DENIED);
    expect(ApiGatewayError.validation().code).toBe(AwsErrorCodes.ApiGateway.VALIDATION_ERROR);
    expect(ApiGatewayError.timeout().code).toBe(AwsErrorCodes.ApiGateway.TIMEOUT);
    expect(ApiGatewayError.internal().code).toBe(AwsErrorCodes.ApiGateway.INTERNAL_ERROR);
  });
});
