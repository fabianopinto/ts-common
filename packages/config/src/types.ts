/**
 * @fileoverview Public types and interfaces for the configuration system.
 *
 * Includes `ConfigValue`, `ConfigObject`, provider and options interfaces.
 */

import type { Logger } from "@fabianopinto/logger";

/**
 * Represents any configuration value supported by this system.
 * - Primitive values: string, number, boolean
 * - Nested objects via ConfigObject
 * - Arrays of any ConfigValue
 * - null is supported to explicitly indicate absence of a value
 */
export type ConfigValue = string | number | boolean | null | ConfigObject | ConfigValue[];

/**
 * Represents a nested configuration object with string keys and ConfigValue values.
 *
 * Prefer this type to generic records when modeling hierarchical configuration data.
 */
export interface ConfigObject {
  [key: string]: ConfigValue;
}

/**
 * Options for the Configuration instance.
 */
export interface ConfigurationOptions {
  /** Optional base logger (defaults to a child of the package logger). */
  logger?: Logger;
  /**
   * If true, attempts to resolve external references (ssm://, s3://) when values are accessed.
   * Defaults to true.
   */
  resolveExternal?: boolean;
}

/**
 * ConfigurationProvider defines the contract for accessing configuration values by key path.
 * Implementations may store configuration in memory or retrieve from external sources.
 *
 * It supports asynchronous retrieval to accommodate automatic resolution of external references
 * (e.g., SSM parameters and S3 objects).
 */
export interface ConfigurationProvider {
  /** Returns true if the given dot-notation path exists (without resolving external references). */
  has(path: string): boolean;
  /**
   * Retrieve a value by dot-notation path. Returns undefined if not found.
   * External references may be resolved depending on implementation.
   *
   * @typeParam T - Expected value type at the provided path
   */
  getValue<T = unknown>(path: string): Promise<T | undefined>;
}
