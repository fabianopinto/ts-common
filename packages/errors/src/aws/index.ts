/**
 * @packageDocumentation
 * Barrel exports for AWS error modules.
 *
 * Re-exports base types, service-specific error classes, and the `toAwsError`
 * mapper to provide a single import surface for AWS-related errors.
 */

export * from "./apigateway.js";
export * from "./base.js";
export * from "./canonical.js";
export * from "./cloudwatch-logs.js";
export * from "./cloudwatch-metrics.js";
export * from "./codes.js";
export * from "./dynamodb.js";
export * from "./eventbridge.js";
export * from "./kinesis.js";
export * from "./kms.js";
export * from "./lambda.js";
export * from "./msk.js";
export * from "./s3.js";
export * from "./secrets-manager.js";
export * from "./sns.js";
export * from "./sqs.js";
export * from "./ssm.js";
export * from "./stepfunctions.js";
export * from "./sts.js";
export * from "./to-aws-error.js";
