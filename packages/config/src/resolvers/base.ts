/**
 * @fileoverview Base interfaces and utilities for configuration resolvers.
 *
 * Defines the core `ConfigResolver` interface with lifecycle management,
 * protocol validation, and type-safe options. Provides utilities for
 * protocol extraction and reference validation.
 */

import type { Logger } from "@t68/logger";

/**
 * Batch resolution request for multiple references.
 *
 * @template TOptions - Type for resolver-specific options
 */
export interface BatchResolutionRequest<
  TOptions extends Record<string, unknown> = Record<string, unknown>,
> {
  /** External reference string (e.g., `"ssm://my-param"`) */
  reference: string;
  /** Resolver-specific options merged with defaults */
  options: TOptions;
}

/**
 * Batch resolution result with value or error.
 */
export interface BatchResolutionResult {
  /** External reference string (e.g., `"ssm://my-param"`) */
  reference: string;
  /** Resolved value as a string */
  value?: string;
  /** Error if resolution failed */
  error?: Error;
}

/**
 * Base interface for configuration resolvers with lifecycle management.
 *
 * Resolvers handle external references (e.g., `ssm://`, `s3://`) by fetching
 * values from external systems. Each resolver is responsible for a specific
 * protocol and manages its own client lifecycle and validation.
 *
 * @template TOptions - Type for resolver-specific options
 */
export interface ConfigResolver<
  TOptions extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Protocol identifier (e.g., `"ssm"`, `"s3"`) */
  readonly protocol: string;

  /** Default options for this resolver */
  readonly defaultOptions: TOptions;

  /**
   * Initialize the resolver and prepare any required clients or resources.
   * Called once when the resolver is registered with the registry.
   *
   * @param logger - Logger instance for diagnostics
   * @throws May throw errors if initialization fails
   */
  initialize(logger: Logger): Promise<void> | void;

  /**
   * Validate that a reference string matches this resolver's expected format.
   *
   * @param reference - External reference string to validate
   * @returns `true` if the reference is valid for this resolver
   */
  validateReference(reference: string): boolean;

  /**
   * Resolve an external reference to its actual value.
   *
   * @param reference - External reference string (e.g., `"ssm://my-param"`)
   * @param options - Resolver-specific options merged with defaults
   * @param logger - Logger instance for diagnostics
   * @returns The resolved value as a string
   */
  resolve(reference: string, options: TOptions, logger: Logger): Promise<string>;

  /**
   * Clean up any resources used by this resolver.
   * Called when the resolver is unregistered or the system shuts down.
   * Should release clients, connections, and other resources.
   */
  cleanup?(): Promise<void> | void;

  // Optional batch capabilities

  /**
   * Indicates whether this resolver supports batch operations.
   * When `true`, the resolution engine will attempt to use `resolveBatch()` for optimization.
   */
  readonly supportsBatch?: boolean;

  /**
   * Resolve multiple references in a single batch operation.
   * This is more efficient than individual `resolve()` calls for services
   * that support batch operations (e.g., SSM `GetParameters`, S3 batch operations).
   *
   * @param requests - Array of resolution requests
   * @param logger - Logger instance for diagnostics
   * @returns Array of resolution results in the same order as requests
   */
  resolveBatch?(
    requests: BatchResolutionRequest<TOptions>[],
    logger: Logger,
  ): Promise<BatchResolutionResult[]>;

  // Optional caching capabilities

  /**
   * Indicates whether this resolver supports local caching.
   * When `true`, the resolver manages its own cache alongside the global cache.
   */
  readonly supportsCache?: boolean;

  /**
   * Get cached value if available and not expired.
   *
   * @param reference - Reference string to check cache for
   * @returns Cached value or `undefined` if not cached or expired
   */
  getCached?(reference: string): string | undefined;

  /**
   * Set cached value with time-to-live (TTL).
   *
   * @param reference - Reference string to cache
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (default: resolver-specific)
   */
  setCached?(reference: string, value: string, ttlMs?: number): void;

  /**
   * Clear all cached entries for this resolver.
   * Useful for testing or when cache invalidation is needed.
   */
  clearCache?(): void;
}

/**
 * Registry for managing configuration resolvers.
 *
 * Provides registration, lookup, and lifecycle management for resolvers.
 * Supports dynamic resolver registration and protocol-based resolution.
 */
export interface ResolverRegistry {
  /**
   * Register a resolver for a specific protocol.
   *
   * @template T - Type for resolver-specific options
   * @param resolver - Resolver instance to register
   * @param logger - Logger for initialization
   */
  register<T extends Record<string, unknown>>(
    resolver: ConfigResolver<T>,
    logger: Logger,
  ): Promise<void>;

  /**
   * Unregister a resolver by protocol.
   *
   * @param protocol - Protocol identifier to unregister
   */
  unregister(protocol: string): Promise<void>;

  /**
   * Get a resolver by protocol.
   *
   * @param protocol - Protocol identifier
   * @returns Resolver instance or `undefined` if not found
   */
  getResolver(protocol: string): ConfigResolver | undefined;

  /**
   * Get all registered protocol identifiers.
   *
   * @returns Array of protocol strings
   */
  getProtocols(): string[];

  /**
   * Check if a reference can be resolved by any registered resolver.
   *
   * @param reference - External reference string to test
   * @returns `true` if any resolver can handle this reference
   */
  canResolve(reference: string): boolean;

  /**
   * Clean up all registered resolvers.
   * @returns Promise that resolves when all resolvers have been cleaned up
   */
  cleanup(): Promise<void>;
}

/**
 * Extract protocol from an external reference string.
 *
 * Supports both single-slash (`ssm:/param`) and double-slash (`s3://bucket/key`) formats.
 *
 * @param reference - External reference (e.g., `"ssm:/param"`, `"s3://bucket/key"`, `"ssm-secure:/secret"`)
 * @returns Protocol string or `null` if no valid protocol found
 *
 * @example
 * ```typescript
 * extractProtocol("ssm:/my-param"); // "ssm"
 * extractProtocol("ssm-secure:/my-secret"); // "ssm-secure"
 * extractProtocol("s3://bucket/key"); // "s3"
 * extractProtocol("invalid"); // null
 * ```
 */
export function extractProtocol(reference: string): string | null {
  if (typeof reference !== "string") return null;
  // Match protocols with single or double slashes
  const match = reference.match(/^([a-z][a-z0-9+.-]*):\/?/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Check if a value is an external reference string.
 *
 * @param value - Value to test
 * @returns `true` if the value is a string with a valid protocol prefix
 *
 * @example
 * ```typescript
 * isExternalReference("ssm:/param"); // true
 * isExternalReference("ssm-secure:/secret"); // true
 * isExternalReference("s3://bucket/key"); // true
 * isExternalReference("plain-string"); // false
 * isExternalReference(123); // false
 * ```
 */
export function isExternalReference(value: unknown): value is string {
  return typeof value === "string" && extractProtocol(value) !== null;
}
