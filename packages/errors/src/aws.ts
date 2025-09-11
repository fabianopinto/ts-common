/**
 * @fileoverview AWS-related error classes for applications interacting with AWS services.
 *
 * Exports `AwsError` as a base and service-specific errors like `S3Error`.
 *
 * @remarks
 * These errors are operational by default, as service disruptions are often transient.
 */

import { AppError, AppErrorOptions } from "./base.js";

/**
 * A base error for AWS service-related issues.
 *
 * @example
 * throw new AwsError("STS token retrieval failed", { code: "AWS_STS_ERROR" });
 */
export class AwsError extends AppError {
  /**
   * Creates an instance of AwsError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: true });
    this.name = "AwsError";
  }
}

/**
 * An error for AWS S3 service-related issues.
 *
 * @example
 * throw new S3Error("S3 putObject failed", { code: "S3_PUT_ERROR" });
 */
export class S3Error extends AwsError {
  /**
   * Creates an instance of S3Error.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "S3Error";
  }
}

/**
 * An error for AWS DynamoDB service-related issues.
 */
export class DynamoDbError extends AwsError {
  /**
   * Creates an instance of DynamoDbError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "DynamoDbError";
  }
}

/**
 * An error for AWS Lambda service-related issues.
 *
 * @example
 * throw new LambdaError("Lambda invocation failed", { code: "LAMBDA_INVOKE_ERROR" });
 */
export class LambdaError extends AwsError {
  /**
   * Creates an instance of LambdaError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "LambdaError";
  }
}

/**
 * An error for AWS SQS service-related issues.
 *
 * @example
 * throw new SqsError("SQS sendMessage failed", { code: "SQS_SEND_ERROR" });
 */
export class SqsError extends AwsError {
  /**
   * Creates an instance of SqsError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SqsError";
  }
}

/**
 * An error for AWS SNS service-related issues.
 *
 * @example
 * throw new SnsError("SNS publish failed", { code: "SNS_PUBLISH_ERROR" });
 */
export class SnsError extends AwsError {
  /**
   * Creates an instance of SnsError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SnsError";
  }
}
