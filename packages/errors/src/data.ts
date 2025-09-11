/**
 * @fileoverview This file contains error classes related to data processing, validation, and transformation.
 *
 * These errors are useful for building robust data pipelines and services.
 */

import { AppError, AppErrorOptions } from "./base.js";

/**
 * A base error for data processing or transformation issues.
 * This is an operational error, as it often relates to malformed or unexpected input data.
 */
export class DataError extends AppError {
  /**
   * Creates an instance of DataError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: true });
    this.name = "DataError";
  }
}

/**
 * An error for when input data fails validation checks.
 */
export class ValidationError extends DataError {
  /**
   * Creates an instance of ValidationError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "ValidationError";
  }
}

/**
 * An error for when data processing or transformation logic fails.
 */
export class TransformationError extends DataError {
  /**
   * Creates an instance of TransformationError.
   * @param message - The error message.
   * @param options - The error options.
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "TransformationError";
  }
}
