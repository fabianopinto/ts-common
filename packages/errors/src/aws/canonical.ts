/**
 * @fileoverview AWS service name canonicalization utilities.
 *
 * Provides `CanonicalService` and `canonicalService()` to normalize user-provided
 * service identifiers to stable enum-like values for error mapping.
 */

export type CanonicalService =
  | "SSM"
  | "S3"
  | "DYNAMODB"
  | "LAMBDA"
  | "SNS"
  | "SQS"
  | "KINESIS"
  | "MSK"
  | "CLOUDWATCH_LOGS"
  | "CLOUDWATCH"
  | "EVENTBRIDGE"
  | "SECRETSMANAGER"
  | "KMS"
  | "STS"
  | "APIGATEWAY"
  | "STEPFUNCTIONS";

/**
 * Normalizes service names to canonical values.
 *
 * @param input - The service name to normalize
 * @returns The canonical service name, or undefined if the input is invalid
 */
export function canonicalService(input?: string): CanonicalService | undefined {
  if (!input) return undefined;
  // Normalize by lowercasing and removing non-alphanumeric characters so
  // variants like "CLOUDWATCH_LOGS" and "cloudwatch-logs" both map to the same key.
  const s = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  const map: Record<string, CanonicalService> = {
    ssm: "SSM",
    s3: "S3",
    dynamodb: "DYNAMODB",
    ddb: "DYNAMODB",
    lambda: "LAMBDA",
    sns: "SNS",
    sqs: "SQS",
    kinesis: "KINESIS",
    msk: "MSK",
    kafka: "MSK",
    cloudwatchlogs: "CLOUDWATCH_LOGS",
    logs: "CLOUDWATCH_LOGS",
    cloudwatch: "CLOUDWATCH",
    eventbridge: "EVENTBRIDGE",
    secretesmanager: "SECRETSMANAGER",
    secretsmanager: "SECRETSMANAGER",
    secrets: "SECRETSMANAGER",
    kms: "KMS",
    sts: "STS",
    apigateway: "APIGATEWAY",
    apigw: "APIGATEWAY",
    apigatewayv2: "APIGATEWAY",
    stepfunctions: "STEPFUNCTIONS",
    sfn: "STEPFUNCTIONS",
  };
  return map[s];
}
