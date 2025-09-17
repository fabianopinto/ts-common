/**
 * @fileoverview AWS error mapping utilities.
 *
 * Provides `toAwsError` which maps unknown AWS SDK errors to `AwsError` (or
 * service-specific subclasses) using a per-service matcher table and
 * cross-cutting fallbacks.
 */

import { ApiGatewayError } from "./apigateway.js";
import { AwsError, type ErrorContext } from "./base.js";
import { type CanonicalService, canonicalService } from "./canonical.js";
import { CloudWatchLogsError } from "./cloudwatch-logs.js";
import { CloudWatchMetricsError } from "./cloudwatch-metrics.js";
import { DynamoDbError } from "./dynamodb.js";
import { EventBridgeError } from "./eventbridge.js";
import { KmsError } from "./kms.js";
import { LambdaError } from "./lambda.js";
import { MskError } from "./msk.js";
import { S3Error } from "./s3.js";
import { SecretsManagerError } from "./secrets-manager.js";
import { SnsError } from "./sns.js";
import { SqsError } from "./sqs.js";
import { SsmError } from "./ssm.js";
import { StepFunctionsError } from "./stepfunctions.js";
import { StsError } from "./sts.js";

/**
 * Maps an unknown AWS SDK error into an `AwsError` (or service-specific) instance.
 *
 * Designed primarily for AWS SDK v3, but will do its best with v2-like shapes too.
 * Uses a per-service matcher table to identify common error identifiers and
 * returns the corresponding service-specific error. If no service match is
 * found, applies cross-cutting fallbacks (e.g., throttling, timeout, auth) and
 * finally an HTTP-status-based fallback.
 *
 * @param err - The unknown error thrown by an AWS SDK call.
 * @param options - Optional mapping options.
 * @param options.service - Optional service hint; accepts `CanonicalService` or alias.
 * @param options.context - Additional context merged into the error.
 * @param options.message - Optional message override.
 * @returns A mapped `AwsError` or service-specific subclass instance.
 */
export function toAwsError(
  err: unknown,
  options: {
    service?: CanonicalService | string;
    context?: ErrorContext;
    message?: string;
  } = {},
): AwsError {
  const { service, context, message } = options;

  // Best-effort extraction of common AWS error properties
  const anyErr = err as {
    name?: string;
    code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number; requestId?: string };
  } | null;

  const id = (anyErr?.name || anyErr?.code || "").toString();
  const httpStatus = anyErr?.$metadata?.httpStatusCode;

  // Base context merged with AWS metadata
  const baseContext: ErrorContext = {
    ...(context ?? {}),
    aws: {
      name: anyErr?.name,
      code: anyErr?.code,
      httpStatusCode: httpStatus,
      requestId: anyErr?.$metadata?.requestId,
    },
  };

  const candidate = message ?? anyErr?.message ?? (err instanceof Error ? err.message : undefined);
  const finalMessage = candidate ?? "AWS error";

  // Normalize identifier for comparisons (keep original for context)
  const key = id.toLowerCase();

  // Service-specialized mappings first (normalize aliases/format)
  const svc = canonicalService(service);

  // Per-service mapping table to simplify matching and enable easier unit testing.
  // Each entry is a tuple of [service, matchers], where matchers are ordered tests with mappers.
  const serviceMatchers: Array<
    [
      CanonicalService,
      Array<{
        test: (k: string) => boolean;
        map: () => AwsError;
      }>,
    ]
  > = [
    [
      "S3",
      [
        {
          test: (k) => k.includes("nosuchbucket"),
          map: () => S3Error.bucketNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("nosuchkey") || k.includes("keydoesnotexist"),
          map: () => S3Error.objectNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () => S3Error.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) =>
            k.includes("preconditionfailed") ||
            k.includes("invalidargument") ||
            k.includes("invalidrequest"),
          map: () => S3Error.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("slowdown"),
          map: () => S3Error.throttling(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "DYNAMODB",
      [
        {
          test: (k) => k.includes("conditionalcheckfailed"),
          map: () =>
            DynamoDbError.conditionalCheckFailed(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
        {
          test: (k) =>
            k.includes("transactionconflict") ||
            k.includes("transactioncanceled") ||
            k.includes("resourceinuse"),
          map: () =>
            DynamoDbError.transactionConflict(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) =>
            k.includes("provisionedthroughputexceeded") ||
            k.includes("requestlimitexceeded") ||
            k.includes("limitexceededexception"),
          map: () =>
            DynamoDbError.throughputExceeded(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("resourcenotfound") || k.includes("itemnotfound"),
          map: () => DynamoDbError.itemNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("itemcollectionsizelimitexceeded"),
          map: () => DynamoDbError.validation(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "SQS",
      [
        {
          test: (k) => k.includes("nonexistentqueue"),
          map: () => SqsError.queueNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("messagetoolong"),
          map: () => SqsError.messageTooLarge(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("receipthandleisinvalid") || k.includes("invalidreceipt"),
          map: () => SqsError.validation(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "APIGATEWAY",
      [
        {
          test: (k) => k.includes("notfound"),
          map: () => ApiGatewayError.notFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("toomanyrequests"),
          map: () => ApiGatewayError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("badrequest"),
          map: () => ApiGatewayError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () =>
            ApiGatewayError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "LAMBDA",
      [
        {
          test: (k) => k.includes("resourcenotfound"),
          map: () =>
            LambdaError.functionNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("toomanyrequests"),
          map: () => LambdaError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("invalidrequest") || k.includes("invalidparameter"),
          map: () => LambdaError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("serviceexception"),
          map: () => LambdaError.internal(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "SNS",
      [
        {
          test: (k) => k.includes("notfound") || k.includes("resourcenotfound"),
          map: () => SnsError.topicNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("authorizationerror") || k.includes("accessdenied"),
          map: () => SnsError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("invalidparameter"),
          map: () => SnsError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("throttled"),
          map: () => SnsError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "EVENTBRIDGE",
      [
        {
          // Event bus not found
          test: (k) =>
            k.includes("busnotfound") || (k.includes("eventbus") && k.includes("notfound")),
          map: () =>
            EventBridgeError.busNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          // Rule not found
          test: (k) => k.includes("rulenotfound") || (k.includes("rule") && k.includes("notfound")),
          map: () =>
            EventBridgeError.ruleNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          // Throttling
          test: (k) => k.includes("throttl"),
          map: () =>
            EventBridgeError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          // Access denied
          test: (k) => k.includes("accessdenied"),
          map: () =>
            EventBridgeError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          // Validation issues
          test: (k) =>
            k.includes("validation") ||
            k.includes("invalidparameter") ||
            k.includes("invalidrequest"),
          map: () =>
            EventBridgeError.validation(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "MSK",
      [
        {
          test: (k) => k.includes("notfound"),
          map: () => MskError.clusterNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("throttl"),
          map: () => MskError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () => MskError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "CLOUDWATCH_LOGS",
      [
        {
          test: (k) => k.includes("loggroupnotfound"),
          map: () =>
            CloudWatchLogsError.logGroupNotFound(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
        {
          test: (k) => k.includes("logstreamnotfound"),
          map: () =>
            CloudWatchLogsError.logStreamNotFound(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
        {
          test: (k) => k.includes("toomanyrequests") || k.includes("throttl"),
          map: () =>
            CloudWatchLogsError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () =>
            CloudWatchLogsError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("validation"),
          map: () =>
            CloudWatchLogsError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("serviceunavailable"),
          map: () =>
            CloudWatchLogsError.serviceUnavailable(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
      ],
    ],
    [
      "CLOUDWATCH",
      [
        {
          test: (k) => k.includes("limitexceeded"),
          map: () =>
            CloudWatchMetricsError.limitExceeded(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
        {
          test: (k) => k.includes("toomanyrequests") || k.includes("throttl"),
          map: () =>
            CloudWatchMetricsError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () =>
            CloudWatchMetricsError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("validation"),
          map: () =>
            CloudWatchMetricsError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("internal"),
          map: () =>
            CloudWatchMetricsError.internal(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "SECRETSMANAGER",
      [
        {
          test: (k) => k.includes("resourcenotfound"),
          map: () =>
            SecretsManagerError.secretNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("decryptionfailure"),
          map: () =>
            SecretsManagerError.decryptionFailure(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
        {
          test: (k) => k.includes("invalidrequest") || k.includes("invalidparameter"),
          map: () =>
            SecretsManagerError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("throttl"),
          map: () =>
            SecretsManagerError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () =>
            SecretsManagerError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "KMS",
      [
        {
          test: (k) => k.includes("notfound"),
          map: () => KmsError.keyNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("invalidciphertext"),
          map: () => KmsError.invalidCiphertext(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () => KmsError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("throttl"),
          map: () => KmsError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "STS",
      [
        {
          test: (k) =>
            k.includes("expiredtoken") ||
            k.includes("invalidclienttokenid") ||
            k.includes("signaturedoesnotmatch") ||
            k.includes("unrecognizedclient"),
          map: () => StsError.authentication(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () => StsError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("throttl"),
          map: () => StsError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("validation"),
          map: () => StsError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("timeout"),
          map: () => StsError.timeout(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "STEPFUNCTIONS",
      [
        {
          test: (k) => k.includes("executiondoesnotexist"),
          map: () =>
            StepFunctionsError.executionNotFound(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
        {
          test: (k) => k.includes("statemachinedoesnotexist"),
          map: () =>
            StepFunctionsError.stateMachineNotFound(finalMessage, {
              context: baseContext,
              cause: err,
            }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () =>
            StepFunctionsError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("throttl"),
          map: () =>
            StepFunctionsError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("validation"),
          map: () =>
            StepFunctionsError.validation(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("internal"),
          map: () =>
            StepFunctionsError.internal(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
    [
      "SSM",
      [
        {
          test: (k) => k.includes("parameternotfound"),
          map: () => SsmError.parameterNotFound(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("throttl"),
          map: () => SsmError.throttling(finalMessage, { context: baseContext, cause: err }),
        },
        {
          test: (k) => k.includes("accessdenied"),
          map: () => SsmError.accessDenied(finalMessage, { context: baseContext, cause: err }),
        },
      ],
    ],
  ];

  if (svc) {
    const entry = serviceMatchers.find(([name]) => name === svc);
    if (entry) {
      const [, matchers] = entry;
      for (const m of matchers) {
        if (m.test(key)) return m.map();
      }
    }
  }

  // Cross-cutting mappings
  // Throttling variants
  if (
    key.includes("throttling") ||
    key.includes("toomanyrequests") ||
    key.includes("provisionedthroughputexceeded")
  ) {
    return AwsError.throttling(finalMessage, { context: baseContext, cause: err });
  }

  // Timeouts
  if (key.includes("timeout") || key.includes("requesttimeout")) {
    return AwsError.timeout(finalMessage, { context: baseContext, cause: err });
  }

  // Access/Authentication
  if (key.includes("accessdenied") || key.includes("forbidden") || key.includes("unauthorized")) {
    return AwsError.accessDenied(finalMessage, { context: baseContext, cause: err });
  }
  if (
    key.includes("expiredtoken") ||
    key.includes("invalidsignature") ||
    key.includes("unrecognizedclient") ||
    key.includes("notauthorizedexception")
  ) {
    return AwsError.authentication(finalMessage, { context: baseContext, cause: err });
  }

  // Not found variants
  if (
    key.includes("resourcenotfound") ||
    key.includes("nosuchkey") ||
    key.endsWith("notfound") ||
    key.includes("404")
  ) {
    return AwsError.notFound(finalMessage, { context: baseContext, cause: err });
  }

  // Conflicts
  if (key.includes("conditionalcheckfailed") || key.includes("conflict")) {
    return AwsError.conflict(finalMessage, { context: baseContext, cause: err });
  }

  // Validation / Bad request
  if (key.includes("validation") || key.includes("badrequest")) {
    return AwsError.validation(finalMessage, { context: baseContext, cause: err });
  }

  // Service unavailable / internal
  if (key.includes("serviceunavailable")) {
    return AwsError.serviceUnavailable(finalMessage, { context: baseContext, cause: err });
  }
  if (
    key.includes("internalfailure") ||
    key.includes("internalservererror") ||
    key.includes("internal")
  ) {
    return AwsError.internal(finalMessage, { context: baseContext, cause: err });
  }

  // Fallback using HTTP status if present
  if (httpStatus) {
    if (httpStatus === 404)
      return AwsError.notFound(finalMessage, { context: baseContext, cause: err });
    if (httpStatus === 401)
      return AwsError.authentication(finalMessage, { context: baseContext, cause: err });
    if (httpStatus === 403)
      return AwsError.accessDenied(finalMessage, { context: baseContext, cause: err });
    if (httpStatus === 409)
      return AwsError.conflict(finalMessage, { context: baseContext, cause: err });
    if (httpStatus === 429)
      return AwsError.throttling(finalMessage, { context: baseContext, cause: err });
    if (httpStatus === 400)
      return AwsError.validation(finalMessage, { context: baseContext, cause: err });
    if (httpStatus === 503)
      return AwsError.serviceUnavailable(finalMessage, { context: baseContext, cause: err });
    if (httpStatus >= 500)
      return AwsError.internal(finalMessage, { context: baseContext, cause: err });
  }

  // Last resort generic AWS error
  return new AwsError(finalMessage, { context: baseContext, cause: err });
}
