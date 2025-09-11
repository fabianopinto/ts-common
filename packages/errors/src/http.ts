/**
 * @fileoverview This file contains error classes and types for handling HTTP-specific errors.
 * It provides a standardized way to represent common HTTP error conditions.
 */

import { AppError, AppErrorOptions, ErrorContext } from "./base.js";

/**
 * A collection of standard HTTP error codes.
 */
export enum ErrorCode {
  /** 400 Bad Request */
  BAD_REQUEST = "BAD_REQUEST",
  /** 401 Unauthorized */
  UNAUTHORIZED = "UNAUTHORIZED",
  /** 403 Forbidden */
  FORBIDDEN = "FORBIDDEN",
  /** 404 Not Found */
  NOT_FOUND = "NOT_FOUND",
  /** 405 Method Not Allowed */
  METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
  /** 409 Conflict */
  CONFLICT = "CONFLICT",
  /** 422 Unprocessable Entity */
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
  /** 429 Too Many Requests */
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  /** 500 Internal Server Error */
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

/**
 * Maps `ErrorCode` enum members to HTTP status codes.
 */
const errorCodeToHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNPROCESSABLE_ENTITY]: 422,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
};

/**
 * Options for creating an `HttpError`.
 */
export interface HttpErrorOptions extends AppErrorOptions {
  /** The specific HTTP error code. */
  code: ErrorCode;
}

/**
 * An error class for representing HTTP-specific errors.
 * It automatically maps an `ErrorCode` to an HTTP status code.
 */
export class HttpError extends AppError {
  /**
   * Creates an instance of HttpError.
   * @param message - The error message.
   * @param options - The error options, including a mandatory `code`.
   */
  constructor(message: string, options: HttpErrorOptions) {
    super(message, {
      ...options,
      status: options.status ?? errorCodeToHttpStatus[options.code],
    });
    this.name = "HttpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Creates a `BAD_REQUEST` error.
   * @param message - The error message.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static badRequest(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.BAD_REQUEST, context });
  }

  /**
   * Creates a `NOT_FOUND` error.
   * @param message - The error message.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static notFound(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.NOT_FOUND, context });
  }

  /**
   * Creates an `UNAUTHORIZED` error.
   * @param message - The error message.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static unauthorized(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.UNAUTHORIZED, context });
  }

  /**
   * Creates a `FORBIDDEN` error.
   * @param message - The error message.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static forbidden(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.FORBIDDEN, context });
  }

  /**
   * Creates a `CONFLICT` error.
   * @param message - The error message.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static conflict(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.CONFLICT, context });
  }

  /**
   * Creates an `UNPROCESSABLE_ENTITY` error.
   * @param message - The error message.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static unprocessableEntity(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.UNPROCESSABLE_ENTITY, context });
  }

  /**
   * Creates a `TOO_MANY_REQUESTS` error.
   * @param message - The error message.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static tooManyRequests(message: string, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.TOO_MANY_REQUESTS, context });
  }

  /**
   * Creates an `INTERNAL_SERVER_ERROR`.
   * @param message - The error message.
   * @param cause - The original error or cause.
   * @param context - Optional context for the error.
   * @returns A new `HttpError` instance.
   */
  static internalServerError(message: string, cause?: unknown, context?: ErrorContext) {
    return new HttpError(message, { code: ErrorCode.INTERNAL_SERVER_ERROR, cause, context });
  }
}
