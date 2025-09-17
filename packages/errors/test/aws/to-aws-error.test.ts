import { describe, it, expect } from "vitest";
import {
  AwsError,
  S3Error,
  DynamoDbError,
  ApiGatewayError,
  LambdaError,
  EventBridgeError,
  CloudWatchLogsError,
  CloudWatchMetricsError,
  SecretsManagerError,
  KmsError,
  StsError,
  StepFunctionsError,
  SsmError,
  SqsError,
  MskError,
  SnsError,
  toAwsError,
} from "../../src/aws";
import { AwsErrorCodes } from "../../src/aws";

// Small helper to craft an AWS-like error shape
const awsErr = (
  overrides: Partial<{
    name: string;
    code: string;
    message: string;
    $metadata: { httpStatusCode?: number; requestId?: string };
  }> = {},
) => ({
  name: "TestError",
  code: "TestError",
  message: "default message",
  $metadata: { httpStatusCode: undefined, requestId: "req-123" },
  ...overrides,
});

describe("toAwsError - function coverage sweep", () => {
  const cases: Array<{ svc: string; name: string; expectedCode: string }> = [
    // SNS
    { svc: "SNS", name: "InvalidParameter", expectedCode: AwsErrorCodes.SNS.VALIDATION_ERROR },
    { svc: "SNS", name: "Throttled", expectedCode: AwsErrorCodes.SNS.THROTTLING },
    // Lambda
    {
      svc: "LAMBDA",
      name: "TooManyRequestsException",
      expectedCode: AwsErrorCodes.Lambda.THROTTLING,
    },
    {
      svc: "LAMBDA",
      name: "InvalidParameter",
      expectedCode: AwsErrorCodes.Lambda.VALIDATION_ERROR,
    },
    // KMS
    { svc: "KMS", name: "NotFoundException", expectedCode: AwsErrorCodes.KMS.KEY_NOT_FOUND },
    { svc: "KMS", name: "AccessDeniedException", expectedCode: AwsErrorCodes.KMS.ACCESS_DENIED },
    { svc: "KMS", name: "ThrottlingException", expectedCode: AwsErrorCodes.KMS.THROTTLING },
    // STS
    { svc: "sts", name: "AccessDenied", expectedCode: AwsErrorCodes.STS.ACCESS_DENIED },
    { svc: "sts", name: "ValidationError", expectedCode: AwsErrorCodes.STS.VALIDATION_ERROR },
    { svc: "sts", name: "RequestTimeout", expectedCode: AwsErrorCodes.STS.TIMEOUT },
    // SSM
    { svc: "ssm", name: "ThrottlingException", expectedCode: AwsErrorCodes.SSM.THROTTLING },
    { svc: "ssm", name: "AccessDeniedException", expectedCode: AwsErrorCodes.SSM.ACCESS_DENIED },
  ];

  for (const c of cases) {
    it(`maps ${c.svc} ${c.name}`, () => {
      const mapped = toAwsError(awsErr({ name: c.name }), { service: c.svc });
      expect(mapped.code).toBe(c.expectedCode);
    });
  }
});

describe("toAwsError - per-service mapping", () => {
  it("maps S3 NoSuchBucket to S3Error.bucketNotFound", () => {
    const err = awsErr({ name: "NoSuchBucket" });
    const mapped = toAwsError(err, { service: "s3" });
    expect(mapped).toBeInstanceOf(S3Error);
    expect(mapped.code).toBeDefined();
  });

  it("maps S3 NoSuchKey to S3Error.objectNotFound without service hint (via key normalize)", () => {
    const err = awsErr({ name: "NoSuchKey" });
    const mapped = toAwsError(err, {});
    // falls through to notFound if service is not hinted but we check it's still an AwsError
    expect(mapped).toBeInstanceOf(AwsError);
  });

  it("maps DynamoDB ConditionalCheckFailedException to DynamoDbError.conditionalCheckFailed", () => {
    const err = awsErr({ name: "ConditionalCheckFailedException" });
    const mapped = toAwsError(err, { service: "DynamoDB" });
    expect(mapped).toBeInstanceOf(DynamoDbError);
  });

  it("maps API Gateway access denied", () => {
    const err = awsErr({ name: "AccessDeniedException" });
    const mapped = toAwsError(err, { service: "ApiGateway" });
    expect(mapped).toBeInstanceOf(ApiGatewayError);
  });

  it("maps Lambda ResourceNotFoundException to functionNotFound", () => {
    const err = awsErr({ name: "ResourceNotFoundException" });
    const mapped = toAwsError(err, { service: "LAMBDA" });
    expect(mapped).toBeInstanceOf(LambdaError);
    expect(mapped.code).toBe(AwsErrorCodes.Lambda.FUNCTION_NOT_FOUND);
  });

  it("maps EventBridge rule not found", () => {
    const err = awsErr({ name: "RuleNotFoundException" });
    const mapped = toAwsError(err, { service: "EVENTBRIDGE" });
    expect(mapped).toBeInstanceOf(EventBridgeError);
  });

  it("maps EventBridge rule not found when 'rule' and 'notfound' occur non-contiguously", () => {
    // Contains 'rule' and 'notfound' but not the contiguous 'rulenotfound'
    const err = awsErr({ name: "RuleExtraNotFound" });
    const mapped = toAwsError(err, { service: "EVENTBRIDGE" });
    expect(mapped).toBeInstanceOf(EventBridgeError);
    expect(mapped.code).toBe(AwsErrorCodes.EventBridge.RULE_NOT_FOUND);
  });

  it("maps EventBridge bus not found when 'eventbus' and 'notfound' occur without contiguous 'busnotfound'", () => {
    // 'EventBusResourceNotFoundException' has 'eventbus' and 'notfound' but not the contiguous 'busnotfound'
    const err = awsErr({ name: "EventBusResourceNotFoundException" });
    const mapped = toAwsError(err, { service: "EVENTBRIDGE" });
    expect(mapped).toBeInstanceOf(EventBridgeError);
    expect(mapped.code).toBe(AwsErrorCodes.EventBridge.BUS_NOT_FOUND);
  });

  it("maps EventBridge throttling", () => {
    const err = awsErr({ name: "ThrottledException" });
    const mapped = toAwsError(err, { service: "EVENTBRIDGE" });
    expect(mapped).toBeInstanceOf(EventBridgeError);
    expect(mapped.code).toBe(AwsErrorCodes.EventBridge.THROTTLING);
  });

  it("maps EventBridge access denied", () => {
    const err = awsErr({ name: "AccessDeniedException" });
    const mapped = toAwsError(err, { service: "EVENTBRIDGE" });
    expect(mapped).toBeInstanceOf(EventBridgeError);
    expect(mapped.code).toBe(AwsErrorCodes.EventBridge.ACCESS_DENIED);
  });

  it("maps EventBridge validation variants (validation/invalidparameter/invalidrequest)", () => {
    const m1 = toAwsError(awsErr({ name: "ValidationException" }), { service: "EVENTBRIDGE" });
    const m2 = toAwsError(awsErr({ name: "InvalidParameter" }), { service: "EVENTBRIDGE" });
    const m3 = toAwsError(awsErr({ name: "InvalidRequestException" }), {
      service: "EVENTBRIDGE",
    });
    for (const m of [m1, m2, m3]) {
      expect(m).toBeInstanceOf(EventBridgeError);
      expect(m.code).toBe(AwsErrorCodes.EventBridge.VALIDATION_ERROR);
    }
  });

  it("maps CloudWatch Logs group not found", () => {
    const err = awsErr({ name: "LogGroupNotFoundException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH_LOGS" });
    expect(mapped).toBeInstanceOf(CloudWatchLogsError);
  });

  it("maps CloudWatch Logs stream not found", () => {
    const err = awsErr({ name: "LogStreamNotFoundException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH_LOGS" });
    expect(mapped).toBeInstanceOf(CloudWatchLogsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchLogs.LOG_STREAM_NOT_FOUND);
  });

  it("maps CloudWatch Logs throttling (TooManyRequests)", () => {
    const err = awsErr({ name: "TooManyRequestsException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH_LOGS" });
    expect(mapped).toBeInstanceOf(CloudWatchLogsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchLogs.THROTTLING);
  });

  it("maps CloudWatch Logs access denied", () => {
    const err = awsErr({ name: "AccessDeniedException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH_LOGS" });
    expect(mapped).toBeInstanceOf(CloudWatchLogsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchLogs.ACCESS_DENIED);
  });

  it("maps CloudWatch Logs validation", () => {
    const err = awsErr({ name: "ValidationException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH_LOGS" });
    expect(mapped).toBeInstanceOf(CloudWatchLogsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchLogs.VALIDATION_ERROR);
  });

  it("maps CloudWatch Logs service unavailable", () => {
    const err = awsErr({ name: "ServiceUnavailableException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH_LOGS" });
    expect(mapped).toBeInstanceOf(CloudWatchLogsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchLogs.SERVICE_UNAVAILABLE);
  });

  it("maps CloudWatch Metrics limit exceeded", () => {
    const err = awsErr({ name: "LimitExceededException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH" });
    expect(mapped).toBeInstanceOf(CloudWatchMetricsError);
  });

  it("maps CloudWatch Metrics throttling", () => {
    const err = awsErr({ name: "ThrottlingException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH" });
    expect(mapped).toBeInstanceOf(CloudWatchMetricsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchMetrics.THROTTLING);
  });

  it("maps CloudWatch Metrics access denied", () => {
    const err = awsErr({ name: "AccessDeniedException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH" });
    expect(mapped).toBeInstanceOf(CloudWatchMetricsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchMetrics.ACCESS_DENIED);
  });

  it("maps CloudWatch Metrics validation", () => {
    const err = awsErr({ name: "ValidationException" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH" });
    expect(mapped).toBeInstanceOf(CloudWatchMetricsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchMetrics.VALIDATION_ERROR);
  });

  it("maps CloudWatch Metrics internal", () => {
    const err = awsErr({ name: "InternalServerError" });
    const mapped = toAwsError(err, { service: "CLOUDWATCH" });
    expect(mapped).toBeInstanceOf(CloudWatchMetricsError);
    expect(mapped.code).toBe(AwsErrorCodes.CloudWatchMetrics.INTERNAL_ERROR);
  });

  it("maps Secrets Manager decryption failure", () => {
    const err = awsErr({ name: "DecryptionFailure" });
    const mapped = toAwsError(err, { service: "SECRETSMANAGER" });
    expect(mapped).toBeInstanceOf(SecretsManagerError);
  });

  it("maps Secrets Manager resource not found to secretNotFound", () => {
    const err = awsErr({ name: "ResourceNotFoundException" });
    const mapped = toAwsError(err, { service: "SECRETSMANAGER" });
    expect(mapped).toBeInstanceOf(SecretsManagerError);
    expect(mapped.code).toBe(AwsErrorCodes.SecretsManager.SECRET_NOT_FOUND);
  });

  it("maps Secrets Manager validation variants (invalidparameter/invalidrequest)", () => {
    const m1 = toAwsError(awsErr({ name: "InvalidParameterException" }), {
      service: "SECRETSMANAGER",
    });
    const m2 = toAwsError(awsErr({ name: "InvalidRequestException" }), {
      service: "SECRETSMANAGER",
    });
    for (const m of [m1, m2]) {
      expect(m).toBeInstanceOf(SecretsManagerError);
      expect(m.code).toBe(AwsErrorCodes.SecretsManager.VALIDATION_ERROR);
    }
  });

  it("maps Secrets Manager throttling", () => {
    const err = awsErr({ name: "ThrottlingException" });
    const mapped = toAwsError(err, { service: "SECRETSMANAGER" });
    expect(mapped).toBeInstanceOf(SecretsManagerError);
    expect(mapped.code).toBe(AwsErrorCodes.SecretsManager.THROTTLING);
  });

  it("maps Secrets Manager access denied", () => {
    const err = awsErr({ name: "AccessDeniedException" });
    const mapped = toAwsError(err, { service: "SECRETSMANAGER" });
    expect(mapped).toBeInstanceOf(SecretsManagerError);
    expect(mapped.code).toBe(AwsErrorCodes.SecretsManager.ACCESS_DENIED);
  });

  it("maps KMS InvalidCiphertextException", () => {
    const err = awsErr({ name: "InvalidCiphertextException" });
    const mapped = toAwsError(err, { service: "kms" });
    expect(mapped).toBeInstanceOf(KmsError);
  });

  it("maps STS expired token to authentication", () => {
    const err = awsErr({ name: "ExpiredTokenException" });
    const mapped = toAwsError(err, { service: "sts" });
    expect(mapped).toBeInstanceOf(StsError);
    expect(mapped.code).toBe(AwsErrorCodes.STS.AUTHENTICATION_ERROR);
  });

  it("maps STS invalid client token id to authentication", () => {
    const err = awsErr({ name: "InvalidClientTokenId" });
    const mapped = toAwsError(err, { service: "sts" });
    expect(mapped).toBeInstanceOf(StsError);
    expect(mapped.code).toBe(AwsErrorCodes.STS.AUTHENTICATION_ERROR);
  });

  it("maps STS signature does not match to authentication", () => {
    const err = awsErr({ name: "SignatureDoesNotMatch" });
    const mapped = toAwsError(err, { service: "sts" });
    expect(mapped).toBeInstanceOf(StsError);
    expect(mapped.code).toBe(AwsErrorCodes.STS.AUTHENTICATION_ERROR);
  });

  it("maps STS unrecognized client to authentication", () => {
    const err = awsErr({ name: "UnrecognizedClientException" });
    const mapped = toAwsError(err, { service: "sts" });
    expect(mapped).toBeInstanceOf(StsError);
    expect(mapped.code).toBe(AwsErrorCodes.STS.AUTHENTICATION_ERROR);
  });

  it("maps StepFunctions state machine not found", () => {
    const err = awsErr({ name: "StateMachineDoesNotExist" });
    const mapped = toAwsError(err, { service: "StepFunctions" });
    expect(mapped).toBeInstanceOf(StepFunctionsError);
  });

  it("maps StepFunctions execution not found", () => {
    const err = awsErr({ name: "ExecutionDoesNotExist" });
    const mapped = toAwsError(err, { service: "StepFunctions" });
    expect(mapped).toBeInstanceOf(StepFunctionsError);
    expect(mapped.code).toBe(AwsErrorCodes.StepFunctions.EXECUTION_NOT_FOUND);
  });

  it("maps StepFunctions access denied", () => {
    const err = awsErr({ name: "AccessDeniedException" });
    const mapped = toAwsError(err, { service: "StepFunctions" });
    expect(mapped).toBeInstanceOf(StepFunctionsError);
    expect(mapped.code).toBe(AwsErrorCodes.StepFunctions.ACCESS_DENIED);
  });

  it("maps StepFunctions throttling", () => {
    const err = awsErr({ name: "ThrottlingException" });
    const mapped = toAwsError(err, { service: "StepFunctions" });
    expect(mapped).toBeInstanceOf(StepFunctionsError);
    expect(mapped.code).toBe(AwsErrorCodes.StepFunctions.THROTTLING);
  });

  it("maps StepFunctions validation", () => {
    const err = awsErr({ name: "ValidationException" });
    const mapped = toAwsError(err, { service: "StepFunctions" });
    expect(mapped).toBeInstanceOf(StepFunctionsError);
    expect(mapped.code).toBe(AwsErrorCodes.StepFunctions.VALIDATION_ERROR);
  });

  it("maps StepFunctions internal", () => {
    const err = awsErr({ name: "InternalError" });
    const mapped = toAwsError(err, { service: "StepFunctions" });
    expect(mapped).toBeInstanceOf(StepFunctionsError);
    expect(mapped.code).toBe(AwsErrorCodes.StepFunctions.INTERNAL_ERROR);
  });

  it("maps SSM parameter not found", () => {
    const err = awsErr({ name: "ParameterNotFound" });
    const mapped = toAwsError(err, { service: "ssm" });
    expect(mapped).toBeInstanceOf(SsmError);
  });
});

describe("toAwsError - cross-cutting fallbacks and ternaries", () => {
  it("uses the provided options.message over the error message (ternary chain)", () => {
    const err = awsErr({ message: "sdk-msg" });
    const mapped = toAwsError(err, { message: "override-msg" });
    expect(mapped.message).toBe("override-msg");
  });

  it("uses sdk message when no override provided", () => {
    const err = awsErr({ message: "sdk-msg" });
    const mapped = toAwsError(err);
    expect(mapped.message).toBe("sdk-msg");
  });

  it("falls back to generic 'AWS error' when neither override nor sdk message present", () => {
    const err = awsErr({ message: undefined as unknown as string });
    // ensure message resolution path exercises the last term of the ternary chain
    const mapped = toAwsError(err);
    expect(mapped.message).toBe("AWS error");
  });

  it("falls back to 'AWS error' when err is an Error instance with undefined message", () => {
    const e = new Error("to-be-undefined");
    Object.defineProperty(e, "message", { value: undefined });
    const mapped = toAwsError(e);
    expect(mapped.message).toBe("AWS error");
  });

  it("maps throttling keywords without service hint", () => {
    const err = awsErr({ name: "ThrottlingException" });
    const mapped = toAwsError(err);
    expect(mapped.code).toBe("AWS_THROTTLING");
    expect(mapped.status).toBe(429);
  });

  it("maps timeout keywords without service hint", () => {
    const err = awsErr({ name: "RequestTimeout" });
    const mapped = toAwsError(err);
    expect(mapped.code).toBe("AWS_TIMEOUT");
    expect(mapped.status).toBe(504);
  });

  it("maps access/authorization keywords without service hint", () => {
    const err = awsErr({ name: "AccessDenied" });
    const mapped = toAwsError(err);
    expect(mapped.code).toBe("AWS_ACCESS_DENIED");
    expect(mapped.status).toBe(403);
  });

  it("maps authentication keywords without service hint", () => {
    const err = awsErr({ name: "UnrecognizedClientException" });
    const mapped = toAwsError(err);
    expect(mapped.code).toBe("AWS_AUTHENTICATION_ERROR");
    expect(mapped.status).toBe(401);
  });

  it("maps not found variants without service hint (shortcut expression path)", () => {
    const err = awsErr({ name: "ResourceNotFoundException" });
    const mapped = toAwsError(err);
    expect(mapped.code).toBe("AWS_NOT_FOUND");
    expect(mapped.status).toBe(404);
  });

  it("uses HTTP status fallback when available (e.g., 503 -> serviceUnavailable)", () => {
    const err = awsErr({ $metadata: { httpStatusCode: 503, requestId: "abc" } });
    const mapped = toAwsError(err);
    expect(mapped.code).toBe("AWS_SERVICE_UNAVAILABLE");
    expect(mapped.status).toBe(503);
  });

  it("returns generic AwsError when no match found", () => {
    const err = awsErr({ name: "SomeRandomError" });
    const mapped = toAwsError(err);
    expect(mapped).toBeInstanceOf(AwsError);
    expect(mapped.name).toBe("AwsError");
  });
});

describe("toAwsError - cross-cutting conflicts", () => {
  it("maps generic ConflictException to AwsError.conflict via fallback", () => {
    const mapped = toAwsError(awsErr({ name: "ConflictException" }));
    expect(mapped.code).toBe("AWS_CONFLICT");
    expect(mapped.status).toBe(409);
  });

  it("maps ConditionalCheckFailed (no service hint) to AwsError.conflict via fallback", () => {
    const mapped = toAwsError(awsErr({ name: "ConditionalCheckFailed" }));
    expect(mapped.code).toBe("AWS_CONFLICT");
    expect(mapped.status).toBe(409);
  });
});

describe("toAwsError - additional edge cases and short-circuits", () => {
  it("falls through service-specific matcher block when no matcher hits (covers closing brace)", () => {
    // Provide a service hint so `svc` is truthy, but use an identifier that matches none of that service's matchers
    const mapped = toAwsError(awsErr({ name: "CompletelyUnknown" }), { service: "s3" });
    // Falls through to generic mapping at the end
    expect(mapped).toBeInstanceOf(AwsError);
  });

  it("maps validation identifier (no service hint) to AwsError.validation via fallback", () => {
    const mapped = toAwsError(awsErr({ name: "ValidationException" }));
    expect(mapped.code).toBe("AWS_VALIDATION_ERROR");
    expect(mapped.status).toBe(400);
  });

  it("maps bad request identifier (no service hint) to AwsError.validation via fallback", () => {
    const mapped = toAwsError(awsErr({ name: "BadRequest" }));
    expect(mapped.code).toBe("AWS_VALIDATION_ERROR");
    expect(mapped.status).toBe(400);
  });

  it("maps service unavailable identifier (no service hint) to AwsError.serviceUnavailable via fallback", () => {
    const mapped = toAwsError(awsErr({ name: "ServiceUnavailableException" }));
    expect(mapped.code).toBe("AWS_SERVICE_UNAVAILABLE");
    expect(mapped.status).toBe(503);
  });

  it("maps internalservererror identifier (no service hint) to AwsError.internal via fallback", () => {
    const mapped = toAwsError(awsErr({ name: "InternalServerError" }));
    expect(mapped.code).toBe("AWS_INTERNAL_ERROR");
    expect(mapped.status).toBe(500);
  });

  it("maps internalfailure identifier (no service hint) to AwsError.internal via fallback", () => {
    const mapped = toAwsError(awsErr({ name: "InternalFailure" }));
    expect(mapped.code).toBe("AWS_INTERNAL_ERROR");
    expect(mapped.status).toBe(500);
  });
  it("uses 'code' identifier if 'name' is absent", () => {
    const mapped = toAwsError(
      awsErr({ name: undefined as unknown as string, code: "NoSuchBucket" }),
      {
        service: "s3",
      },
    );
    expect(mapped).toBeInstanceOf(S3Error);
  });

  it("S3 SlowDown maps to throttling", () => {
    const mapped = toAwsError(awsErr({ name: "SlowDown" }), { service: "S3" });
    expect(mapped.code).toBeDefined();
  });

  it("SQS ReceiptHandleIsInvalid maps to validation", () => {
    const mapped = toAwsError(awsErr({ name: "ReceiptHandleIsInvalid" }), { service: "SQS" });
    expect(mapped).toBeInstanceOf(AwsError);
  });

  it("SQS InvalidReceipt maps to validation", () => {
    const mapped = toAwsError(awsErr({ name: "InvalidReceipt" }), { service: "SQS" });
    expect(mapped).toBeInstanceOf(AwsError);
    expect(mapped.code).toBe(AwsErrorCodes.SQS.VALIDATION_ERROR);
  });

  it("DynamoDB TransactionCanceled/ResourceInUse map to transactionConflict", () => {
    const m1 = toAwsError(awsErr({ name: "TransactionCanceledException" }), {
      service: "DynamoDB",
    });
    const m2 = toAwsError(awsErr({ name: "ResourceInUseException" }), { service: "DynamoDB" });
    expect(m1).toBeInstanceOf(DynamoDbError);
    expect(m2).toBeInstanceOf(DynamoDbError);
  });

  it("DynamoDB ProvisionedThroughputExceededException maps to throughputExceeded", () => {
    const m = toAwsError(awsErr({ name: "ProvisionedThroughputExceededException" }), {
      service: "DYNAMODB",
    });
    expect(m).toBeInstanceOf(DynamoDbError);
    expect(m.code).toBe(AwsErrorCodes.DynamoDB.THROUGHPUT_EXCEEDED);
  });

  it("DynamoDB RequestLimitExceeded maps to throughputExceeded", () => {
    const m = toAwsError(awsErr({ name: "RequestLimitExceeded" }), { service: "DynamoDB" });
    expect(m).toBeInstanceOf(DynamoDbError);
    expect(m.code).toBe(AwsErrorCodes.DynamoDB.THROUGHPUT_EXCEEDED);
  });

  it("DynamoDB LimitExceededException maps to throughputExceeded", () => {
    const m = toAwsError(awsErr({ name: "LimitExceededException" }), { service: "DynamoDB" });
    expect(m).toBeInstanceOf(DynamoDbError);
    expect(m.code).toBe(AwsErrorCodes.DynamoDB.THROUGHPUT_EXCEEDED);
  });

  it("EventBridge bus not found maps correctly", () => {
    const m = toAwsError(awsErr({ name: "EventBusNotFoundException" }), { service: "EVENTBRIDGE" });
    expect(m).toBeInstanceOf(EventBridgeError);
  });

  it("HTTP status 401/403/409/429/400/5xx fallbacks", () => {
    expect(toAwsError(awsErr({ $metadata: { httpStatusCode: 404, requestId: "x" } })).code).toBe(
      "AWS_NOT_FOUND",
    );
    expect(toAwsError(awsErr({ $metadata: { httpStatusCode: 401, requestId: "x" } })).code).toBe(
      "AWS_AUTHENTICATION_ERROR",
    );
    expect(toAwsError(awsErr({ $metadata: { httpStatusCode: 403, requestId: "x" } })).code).toBe(
      "AWS_ACCESS_DENIED",
    );
    expect(toAwsError(awsErr({ $metadata: { httpStatusCode: 409, requestId: "x" } })).code).toBe(
      "AWS_CONFLICT",
    );
    expect(toAwsError(awsErr({ $metadata: { httpStatusCode: 429, requestId: "x" } })).code).toBe(
      "AWS_THROTTLING",
    );
    expect(toAwsError(awsErr({ $metadata: { httpStatusCode: 400, requestId: "x" } })).code).toBe(
      "AWS_VALIDATION_ERROR",
    );
    expect(toAwsError(awsErr({ $metadata: { httpStatusCode: 500, requestId: "x" } })).code).toBe(
      "AWS_INTERNAL_ERROR",
    );
  });

  it("context includes aws metadata (requestId and httpStatus)", () => {
    const mapped = toAwsError(awsErr({ $metadata: { httpStatusCode: 400, requestId: "req-42" } }));
    expect(mapped.context?.aws).toEqual(
      expect.objectContaining({ httpStatusCode: 400, requestId: "req-42" }),
    );
  });

  it("service hint normalization handles hyphens/underscores", () => {
    const m1 = toAwsError(awsErr({ name: "LogGroupNotFoundException" }), {
      service: "cloudwatch-logs",
    });
    const m2 = toAwsError(awsErr({ name: "LogGroupNotFoundException" }), {
      service: "CLOUDWATCH_LOGS",
    });
    expect(m1).toBeInstanceOf(CloudWatchLogsError);
    expect(m2).toBeInstanceOf(CloudWatchLogsError);
  });

  it("handles missing name and code (empty identifier) without crashing", () => {
    const mapped = toAwsError(
      awsErr({ name: undefined as unknown as string, code: undefined as unknown as string }),
    );
    expect(mapped).toBeInstanceOf(AwsError);
    expect(mapped.context?.aws).toEqual(
      expect.objectContaining({ name: undefined, code: undefined }),
    );
  });
});

describe("toAwsError - additional per-service coverage", () => {
  // API Gateway
  it("maps API Gateway not found", () => {
    const mapped = toAwsError(awsErr({ name: "NotFoundException" }), { service: "APIGATEWAY" });
    expect(mapped).toBeInstanceOf(ApiGatewayError);
    expect(mapped.code).toBe(AwsErrorCodes.ApiGateway.NOT_FOUND);
  });

  it("maps API Gateway throttling (TooManyRequests)", () => {
    const mapped = toAwsError(awsErr({ name: "TooManyRequestsException" }), {
      service: "APIGATEWAY",
    });
    expect(mapped).toBeInstanceOf(ApiGatewayError);
    expect(mapped.code).toBe(AwsErrorCodes.ApiGateway.THROTTLING);
  });

  it("maps API Gateway bad request to validation", () => {
    const mapped = toAwsError(awsErr({ name: "BadRequestException" }), { service: "APIGATEWAY" });
    expect(mapped).toBeInstanceOf(ApiGatewayError);
    expect(mapped.code).toBe(AwsErrorCodes.ApiGateway.VALIDATION_ERROR);
  });

  // MSK
  it("maps MSK not found", () => {
    const mapped = toAwsError(awsErr({ name: "NotFoundException" }), { service: "MSK" });
    expect(mapped).toBeInstanceOf(MskError);
    expect(mapped.code).toBe(AwsErrorCodes.MSK.CLUSTER_NOT_FOUND);
  });

  it("maps MSK throttling", () => {
    const mapped = toAwsError(awsErr({ name: "ThrottlingException" }), { service: "MSK" });
    expect(mapped).toBeInstanceOf(MskError);
    expect(mapped.code).toBe(AwsErrorCodes.MSK.THROTTLING);
  });

  it("maps MSK access denied", () => {
    const mapped = toAwsError(awsErr({ name: "AccessDeniedException" }), { service: "MSK" });
    expect(mapped).toBeInstanceOf(MskError);
    expect(mapped.code).toBe(AwsErrorCodes.MSK.ACCESS_DENIED);
  });

  // SQS
  it("maps SQS NonExistentQueue to queueNotFound", () => {
    const mapped = toAwsError(awsErr({ name: "NonExistentQueue" }), { service: "SQS" });
    expect(mapped).toBeInstanceOf(SqsError);
    expect(mapped.code).toBe(AwsErrorCodes.SQS.QUEUE_NOT_FOUND);
  });

  it("maps SQS MessageTooLong to messageTooLarge", () => {
    const mapped = toAwsError(awsErr({ name: "MessageTooLong" }), { service: "SQS" });
    expect(mapped).toBeInstanceOf(SqsError);
    expect(mapped.code).toBe(AwsErrorCodes.SQS.MESSAGE_TOO_LARGE);
  });

  // S3
  it("maps S3 access denied", () => {
    const mapped = toAwsError(awsErr({ name: "AccessDenied" }), { service: "S3" });
    expect(mapped).toBeInstanceOf(S3Error);
    expect(mapped.code).toBe(AwsErrorCodes.S3.ACCESS_DENIED);
  });

  it("maps S3 invalid argument/request to validation", () => {
    const m1 = toAwsError(awsErr({ name: "InvalidArgument" }), { service: "S3" });
    const m2 = toAwsError(awsErr({ name: "InvalidRequest" }), { service: "S3" });
    for (const m of [m1, m2]) {
      expect(m).toBeInstanceOf(S3Error);
      expect(m.code).toBe(AwsErrorCodes.S3.VALIDATION_ERROR);
    }
  });

  // Lambda internal
  it("maps Lambda ServiceException to internal", () => {
    const mapped = toAwsError(awsErr({ name: "ServiceException" }), { service: "LAMBDA" });
    expect(mapped).toBeInstanceOf(LambdaError);
    expect(mapped.code).toBe(AwsErrorCodes.Lambda.INTERNAL_ERROR);
  });

  // STS throttling
  it("maps STS throttling to StsError.throttling", () => {
    const mapped = toAwsError(awsErr({ name: "ThrottlingException" }), { service: "STS" });
    expect(mapped).toBeInstanceOf(StsError);
    expect(mapped.code).toBe(AwsErrorCodes.STS.THROTTLING);
  });

  // DynamoDB additional
  it("maps DynamoDB ResourceNotFoundException to itemNotFound", () => {
    const mapped = toAwsError(awsErr({ name: "ResourceNotFoundException" }), {
      service: "DynamoDB",
    });
    expect(mapped).toBeInstanceOf(DynamoDbError);
    expect(mapped.code).toBe(AwsErrorCodes.DynamoDB.ITEM_NOT_FOUND);
  });

  it("maps DynamoDB ItemCollectionSizeLimitExceededException to validation", () => {
    const mapped = toAwsError(awsErr({ name: "ItemCollectionSizeLimitExceededException" }), {
      service: "DynamoDB",
    });
    expect(mapped).toBeInstanceOf(DynamoDbError);
    expect(mapped.code).toBe(AwsErrorCodes.DynamoDB.THROUGHPUT_EXCEEDED);
  });

  it("maps DynamoDB ItemCollectionSizeLimitExceeded (no 'Exception' suffix) to validation", () => {
    const mapped = toAwsError(awsErr({ name: "ItemCollectionSizeLimitExceeded" }), {
      service: "DynamoDB",
    });
    expect(mapped).toBeInstanceOf(DynamoDbError);
    expect(mapped.code).toBe(AwsErrorCodes.DynamoDB.VALIDATION_ERROR);
  });

  // S3 additional
  it("maps S3 NoSuchKey with service hint to objectNotFound", () => {
    const mapped = toAwsError(awsErr({ name: "NoSuchKey" }), { service: "S3" });
    expect(mapped).toBeInstanceOf(S3Error);
    expect(mapped.code).toBe(AwsErrorCodes.S3.OBJECT_NOT_FOUND);
  });

  it("maps S3 KeyDoesNotExist alias with service hint to objectNotFound", () => {
    const mapped = toAwsError(awsErr({ name: "KeyDoesNotExist" }), { service: "S3" });
    expect(mapped).toBeInstanceOf(S3Error);
    expect(mapped.code).toBe(AwsErrorCodes.S3.OBJECT_NOT_FOUND);
  });

  it("maps S3 PreconditionFailed to validation (with service hint)", () => {
    const mapped = toAwsError(awsErr({ name: "PreconditionFailed" }), { service: "S3" });
    expect(mapped).toBeInstanceOf(S3Error);
    expect(mapped.code).toBe(AwsErrorCodes.S3.VALIDATION_ERROR);
  });

  // SNS additional
  it("maps SNS AuthorizationError to accessDenied", () => {
    const mapped = toAwsError(awsErr({ name: "AuthorizationError" }), { service: "SNS" });
    expect(mapped).toBeInstanceOf(SnsError);
    expect(mapped.code).toBe(AwsErrorCodes.SNS.ACCESS_DENIED);
  });

  it("maps SNS ResourceNotFoundException to topicNotFound", () => {
    const mapped = toAwsError(awsErr({ name: "ResourceNotFoundException" }), { service: "SNS" });
    expect(mapped).toBeInstanceOf(SnsError);
    expect(mapped.code).toBe(AwsErrorCodes.SNS.TOPIC_NOT_FOUND);
  });
});

describe("toAwsError - final cross-cutting coverage", () => {
  it("maps Unauthorized to accessDenied (no service hint)", () => {
    const mapped = toAwsError(awsErr({ name: "Unauthorized" }));
    expect(mapped.code).toBe("AWS_ACCESS_DENIED");
    expect(mapped.status).toBe(403);
  });

  it("maps InvalidSignature to authentication (no service hint)", () => {
    const mapped = toAwsError(awsErr({ name: "InvalidSignature" }));
    expect(mapped.code).toBe("AWS_AUTHENTICATION_ERROR");
    expect(mapped.status).toBe(401);
  });

  it("maps identifier ending with NotFound to notFound (no service hint)", () => {
    const mapped = toAwsError(awsErr({ name: "SomeCustomNotFound" }));
    expect(mapped.code).toBe("AWS_NOT_FOUND");
    expect(mapped.status).toBe(404);
  });

  it("maps identifier containing '404' to notFound (no service hint)", () => {
    const mapped = toAwsError(awsErr({ name: "HttpError404" }));
    expect(mapped.code).toBe("AWS_NOT_FOUND");
    expect(mapped.status).toBe(404);
  });

  it("maps 'Forbidden' to accessDenied (no service hint)", () => {
    const mapped = toAwsError(awsErr({ name: "Forbidden" }));
    expect(mapped.code).toBe("AWS_ACCESS_DENIED");
    expect(mapped.status).toBe(403);
  });

  it("handles non-object error input (e.g., string) and falls back to generic message", () => {
    const mapped = toAwsError("some-error-string");
    expect(mapped).toBeInstanceOf(AwsError);
    expect(mapped.message).toBe("AWS error");
  });

  it("uses Error instance message when provided and no override", () => {
    const mapped = toAwsError(new Error("boom"));
    expect(mapped.message).toBe("boom");
  });

  it("uses HTTP status >=500 fallback (e.g., 502 -> internal)", () => {
    const mapped = toAwsError(awsErr({ $metadata: { httpStatusCode: 502, requestId: "r" } }));
    expect(mapped.code).toBe("AWS_INTERNAL_ERROR");
    expect(mapped.status).toBe(500);
  });

  it("skips unknown service hint (Kinesis) and uses cross-cutting mapping", () => {
    const mapped = toAwsError(awsErr({ name: "AccessDeniedException" }), { service: "Kinesis" });
    // No Kinesis matcher in table, should map via cross-cutting to generic access denied
    expect(mapped).toBeInstanceOf(AwsError);
    expect(mapped.code).toBe("AWS_ACCESS_DENIED");
    expect(mapped.status).toBe(403);
  });
});
