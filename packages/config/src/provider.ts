/**
 * @fileoverview Default configuration provider implementation bridging consumers
 * to the global `Configuration` singleton.
 */

import { Configuration } from "./configuration.js";
import type { ConfigurationProvider, GetValueOptions } from "./types.js";

/**
 * Default ConfigurationProvider implementation that bridges to the global
 * Configuration instance.
 *
 * Useful for dependency injection and testing as it implements the provider
 * contract while delegating to the global `Configuration` for actual data access.
 */
export class DefaultConfigurationProvider implements ConfigurationProvider {
  /**
   * Check whether a path exists in the configuration.
   *
   * @param path - Path as dot-notation string or array of path segments,
   *   e.g. `"feature.flags.beta"` or `["feature", "flags", "beta"]`
   * @returns `true` when the path resolves to a value in the configuration
   */
  public has(path: string | string[]): boolean {
    const pathStr = Array.isArray(path) ? path.join(".") : path;
    return Configuration.getInstance().has(pathStr);
  }

  /**
   * Get a configuration value by path.
   *
   * @template T - Expected value type
   * @param path - Path as dot-notation string or array of path segments,
   *   e.g. `"service.endpoint"` or `["service", "endpoint"]`
   * @param options - Optional options for value retrieval
   * @returns The resolved value or `undefined` when not present
   *
   * @example
   * ```typescript
   * // Using dot-notation string
   * const value1 = await DefaultConfigurationProvider
   *   .getInstance()
   *   .getValue("service.endpoint");
   *
   * // Using array of path segments
   * const value2 = await DefaultConfigurationProvider
   *   .getInstance()
   *   .getValue(["service", "endpoint"]);
   * ```
   */
  public async getValue<T = unknown>(
    path: string | string[],
    options?: GetValueOptions,
  ): Promise<T | undefined> {
    const pathStr = Array.isArray(path) ? path.join(".") : path;
    return Configuration.getInstance().getValue<T>(pathStr, options);
  }
}
