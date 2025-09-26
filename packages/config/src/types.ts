/**
 * @fileoverview Public types and interfaces for the configuration system.
 *
 * Includes `ConfigValue`, `ConfigObject`, provider and options interfaces
 * with dynamic resolver support.
 */

import type { Logger } from "@t68/logger";

/**
 * Represents any configuration value supported by this system.
 * - Primitive values: string, number, boolean
 * - Nested objects via `ConfigObject`
 * - Arrays of any `ConfigValue`
 * - `null` is supported to explicitly indicate absence of a value
 */
export type ConfigValue = string | number | boolean | null | ConfigObject | ConfigValue[];

/**
 * Represents a nested configuration object with string keys and `ConfigValue`
 * values.
 *
 * Prefer this type to generic records when modeling hierarchical configuration
 * data.
 */
export interface ConfigObject {
  [key: string]: ConfigValue;
}

/**
 * Dynamic resolution options for external references.
 *
 * Provides fine-grained control over which resolvers are enabled and their
 * specific configuration. Supports both simple boolean toggles and detailed
 * resolver-specific options.
 */
export interface ResolutionOptions {
  /** Master switch for resolving any external references. Default: `true` */
  external?: boolean;
  /**
   * Per-resolver configuration. Key is the protocol name, value can be:
   * - `boolean`: Enable/disable the resolver with default options
   * - `object`: Enable resolver with specific options
   *
   * @example
   * ```typescript
   * {
   *   ssm: { withDecryption: false },  // SSM with custom options
   *   s3: true,                        // S3 with default options
   *   vault: false                     // Disable vault resolver
   * }
   * ```
   */
  resolvers?: Record<string, boolean | Record<string, unknown>>;
}

/**
 * Options for the `Configuration` instance.
 */
export interface ConfigurationOptions {
  /** Optional base logger (defaults to a child of the package logger). */
  logger?: Logger;
  /**
   * Resolution options controlling how external references are handled
   * when retrieving values. If omitted, sensible defaults are used.
   */
  resolve?: ResolutionOptions;
}

/**
 * Per-call options for retrieving a configuration value.
 * These options override the instance-level resolution behavior.
 */
export interface GetValueOptions {
  /**
   * Resolution override for this specific call.
   * - If `boolean`: Toggles all external resolution on/off
   * - If `ResolutionOptions`: Selectively override resolution behavior
   *
   * Instance-level defaults are used for any unset fields.
   */
  resolve?: boolean | ResolutionOptions;
}

/**
 * `ConfigurationProvider` defines the contract for accessing configuration
 * values by key path. Implementations may store configuration in memory or
 * retrieve from external sources.
 *
 * It supports asynchronous retrieval to accommodate automatic resolution of
 * external references (e.g., SSM parameters and S3 objects).
 */
export interface ConfigurationProvider {
  /**
   * Returns `true` if the given path exists (without resolving
   * external references).
   *
   * @param path - Path as dot-notation string or array of path segments,
   *   e.g. `"service.endpoint"` or `["service", "endpoint"]`
   * @returns `true` when the path resolves to a value in the configuration
   */
  has(path: string | string[]): boolean;
  /**
   * Retrieve a value by path. Returns `undefined` if not found.
   * External references may be resolved depending on implementation.
   *
   * @template T - Expected value type at the provided path
   * @param path - Path as dot-notation string or array of path segments,
   *   e.g. `"service.endpoint"` or `["service", "endpoint"]`
   * @param options - Optional options for value retrieval
   * @returns The resolved value or `undefined` when not present
   */
  getValue<T = unknown>(path: string | string[], options?: GetValueOptions): Promise<T | undefined>;
}
