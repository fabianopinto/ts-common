/**
 * @fileoverview This file contains common error classes for widespread use across systems.
 *
 * These errors represent failures in configuration, database interactions, and third-party services.
 */

import { AppError, AppErrorOptions } from "./base.js";

/**
 * An error for missing or invalid application configuration.
 * This is a non-operational error, as it typically requires a code or configuration change to fix.
 */
export class ConfigurationError extends AppError {
  /**
   * Creates an instance of ConfigurationError.
   *
   * @param message - The error message.
   * @param options - The error options.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: false });
    this.name = "ConfigurationError";
  }
}

/**
 * A base error for database-related issues.
 * This is an operational error, as it may be transient or recoverable.
 */
export class DatabaseError extends AppError {
  /**
   * Creates an instance of DatabaseError.
   *
   * @param message - The error message.
   * @param options - The error options.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: true });
    this.name = "DatabaseError";
  }
}

/**
 * An error for failures in external service integrations.
 * This is an operational error, as the external service may recover.
 */
export class ThirdPartyServiceError extends AppError {
  /**
   * Creates an instance of ThirdPartyServiceError.
   *
   * @param message - The error message.
   * @param options - The error options.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { ...options, isOperational: true });
    this.name = "ThirdPartyServiceError";
  }
}
