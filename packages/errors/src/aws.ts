/**
 * @fileoverview This file contains error classes for AWS-specific services.
 * These errors are useful for handling failures in applications that interact with AWS.
 */

import { AppError, AppErrorOptions } from "./base";

/**
 * A base error for AWS service-related issues.
 * This is an operational error, as AWS service issues can often be transient.
 * @public
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
 * @public
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
 * @public
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
 * @public
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
 * @public
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
 * @public
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
