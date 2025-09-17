/**
 * @fileoverview AWS SSM error types and helpers.
 *
 * Defines `SsmError`, a service-specific error class with factory-backed
 * helpers that standardize `code` and HTTP `status` using `AwsErrorCodes.SSM.*`.
 */

import { type AppErrorOptions, AwsError, makeAwsServiceError } from "./base.js";
import { AwsErrorCodes } from "./codes.js";

/** An error for AWS SSM service-related issues. */
export class SsmError extends AwsError {
  /**
   * Creates an instance of SsmError.
   *
   * @param message - The error message.
   * @param options - Additional error options and context.
   */
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "SsmError";
  }

  /** Parameter not found error (e.g., SSM ParameterNotFound). */
  public static parameterNotFound(
    message = "SSM parameter not found",
    options: AppErrorOptions = {},
  ) {
    return makeAwsServiceError(
      SsmError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SSM.PARAMETER_NOT_FOUND,
        status: options.status ?? 404,
      },
      options,
    );
  }

  /** Throttling error for SSM operations. */
  public static throttling(message = "SSM throttling error", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SsmError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SSM.THROTTLING,
        status: options.status ?? 429,
      },
      options,
    );
  }

  /** Access denied for SSM operations. */
  public static accessDenied(message = "SSM access denied", options: AppErrorOptions = {}) {
    return makeAwsServiceError(
      SsmError,
      message,
      {
        code: options.code ?? AwsErrorCodes.SSM.ACCESS_DENIED,
        status: options.status ?? 403,
      },
      options,
    );
  }
}
