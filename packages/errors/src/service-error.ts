/**
 * @fileoverview Shared service error utilities.
 *
 * Provides a generic factory and constructor type used by service-oriented error classes
 * (e.g., database and third-party service errors) to ensure consistent defaults and options.
 */

import { AppError, AppErrorOptions } from "./base.js";

/** Constructor type for service-specific AppError subclasses. */
export type AppErrorCtor<E extends AppError> = new (
  message: string,
  options?: AppErrorOptions,
) => E;

/**
 * Factory to create service errors with consistent defaults and overrides.
 *
 * @template E - The type of the error to be created
 * @param Ctor - The constructor function for the error type
 * @param message - Error message
 * @param defaults - The default options for the error
 * @param options - The additional options for the error
 * @returns The newly created error
 */
export function makeServiceError<E extends AppError>(
  Ctor: AppErrorCtor<E>,
  message: string,
  defaults: AppErrorOptions,
  options: AppErrorOptions = {},
): E {
  const { isOperational, ...rest } = options;
  return new Ctor(message, {
    ...defaults,
    ...rest,
    isOperational: isOperational ?? true,
  });
}
