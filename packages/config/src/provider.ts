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
   * Check whether a dot-notation path exists in the configuration.
   *
   * @param path - Dot-notation path, e.g. `"feature.flags.beta"`
   * @returns `true` when the path resolves to a value in the configuration
   */
  public has(path: string): boolean {
    return Configuration.getInstance().has(path);
  }

  /**
   * Get a configuration value by dot-notation path.
   *
   * @template T - Expected value type
   * @param path - Dot-notation path, e.g. `"service.endpoint"`
   * @param options - Optional options for value retrieval
   * @returns The resolved value or `undefined` when not present
   *
   * @example
   * ```typescript
   * const value = await DefaultConfigurationProvider
   *   .getInstance()
   *   .getValue("service.endpoint");
   * ```
   */
  public async getValue<T = unknown>(
    path: string,
    options?: GetValueOptions,
  ): Promise<T | undefined> {
    return Configuration.getInstance().getValue<T>(path, options);
  }
}
