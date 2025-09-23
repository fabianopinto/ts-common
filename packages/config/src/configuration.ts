/**
 * @fileoverview Configuration core: immutable global configuration with type-safe,
 * dot-notation access and automatic resolution of external references (AWS SSM and S3).
 *
 * Exposes the `Configuration` class that implements the `ConfigurationProvider` contract.
 * Instances are immutable and can only be created via the accompanying factory.
 *
 * Resolution behavior is controlled via {@link ConfigurationOptions.resolve} at instance level and
 * can be overridden per call with {@link GetValueOptions} in {@link Configuration.getValue}.
 */

import { ConfigurationError } from "@t68/errors";
import { type Logger, logger as baseLogger } from "@t68/logger";
import { ObjectUtils } from "@t68/utils";

import { isExternalRef, resolveS3, resolveSSM } from "./resolvers.js";
import type {
  ConfigObject,
  ConfigurationOptions,
  ConfigurationProvider,
  ConfigValue,
  GetValueOptions,
} from "./types.js";

/**
 * The global configuration store. Immutable after creation.
 * Provides dot-notation access and automatic resolution of SSM/S3 references.
 *
 * Use {@link Configuration.initialize} to create the singleton and
 * {@link Configuration.getInstance} to retrieve it.
 */
export class Configuration implements ConfigurationProvider {
  private static instance: Configuration | undefined;
  private readonly data: Readonly<ConfigObject>;
  private readonly logger: Logger;
  private readonly resolveOptions: Required<NonNullable<ConfigurationOptions["resolve"]>>;

  /**
   * @param {ConfigObject} data - Plain configuration object (hierarchical)
   * @param {ConfigurationOptions} [options] - Behavior customization (logger, external resolution toggle)
   */
  private constructor(data: ConfigObject, options?: ConfigurationOptions) {
    this.logger = (options?.logger ?? baseLogger).child({ module: "config" });
    const ropts = options?.resolve ?? {};
    this.resolveOptions = {
      external: ropts.external ?? true,
      s3: ropts.s3 ?? true,
      ssm: ropts.ssm ?? true,
      ssmDecryption: ropts.ssmDecryption ?? true,
    };
    this.data = ObjectUtils.deepFreeze(structuredClone(data)) as Readonly<ConfigObject>;
  }

  /**
   * Initialize and set the global configuration instance. Overrides any existing instance.
   *
   * @param {ConfigObject} data - Plain configuration object (hierarchical)
   * @param {ConfigurationOptions} [options] - Behavior customization (logger, external resolution toggle)
   * @returns {Configuration} The created global configuration instance
   */
  public static initialize(data: ConfigObject, options?: ConfigurationOptions): Configuration {
    const cfg = new Configuration(data, options);
    Configuration.instance = cfg;
    cfg.logger.info("Configuration initialized");
    return cfg;
  }

  /**
   * Retrieve the global configuration instance. Throws if not initialized.
   *
   * @returns {Configuration} The global configuration instance
   * @throws {ConfigurationError} When the configuration has not been initialized
   */
  public static getInstance(): Configuration {
    if (!Configuration.instance) {
      throw new ConfigurationError("Configuration has not been initialized", {
        code: "CONFIG_NOT_INITIALIZED",
        status: 500,
      });
    }
    return Configuration.instance;
  }

  /**
   * Check whether a dot-notation path exists in the configuration (without resolving
   * external refs).
   *
   * @param {string} path - Dot-notation path, e.g. "database.primary.host"
   * @returns {boolean} True when the path resolves to a value in the configuration
   */
  public has(path: string): boolean {
    return ObjectUtils.deepGet(this.data, path) !== undefined;
  }

  /**
   * Get a configuration value by dot-notation path.
   * This will automatically resolve external references (ssm://, s3://) when enabled.
   *
   * Per-call options can override the instance-level resolution behavior configured in
   * {@link ConfigurationOptions.resolve}.
   *
   * @template T - Expected return type for the value
   * @param {string} path - Dot-notation path, e.g. "service.endpoint"
   * @param {GetValueOptions} [options] - Optional options for value retrieval
   * @returns {Promise<T | undefined>} The resolved value or undefined when not present
   *
   * @example
   * // Default behavior (external resolution on)
   * const v1 = await Configuration.getInstance().getValue<string>("service.endpoint");
   *
   * // Disable resolution for this call only
   * const raw = await Configuration.getInstance().getValue<string>(
   *   "secrets.dbPassword",
   *   { resolve: false },
   * );
   *
   * // Selectively override which protocols resolve
   * const onlyS3 = await Configuration.getInstance().getValue(
   *   "templates.welcome",
   *   { resolve: { s3: true, ssm: false } },
   * );
   *
   * // Disable SSM decryption for this call
   * const plain = await Configuration.getInstance().getValue(
   *   "secrets.dbPassword",
   *   { resolve: true, ssmDecryption: false },
   * );
   */
  public async getValue<T = unknown>(
    path: string,
    options?: GetValueOptions,
  ): Promise<T | undefined> {
    const value = ObjectUtils.deepGet<ConfigValue | undefined>(this.data, path);
    if (value === undefined) return undefined;

    // Compute effective resolution options for this call
    const eff = { ...this.resolveOptions };
    if (typeof options?.resolve === "boolean") {
      eff.external = options.resolve;
    } else if (typeof options?.resolve === "object" && options.resolve) {
      if (options.resolve.external !== undefined) eff.external = options.resolve.external;
      if (options.resolve.s3 !== undefined) eff.s3 = options.resolve.s3;
      if (options.resolve.ssm !== undefined) eff.ssm = options.resolve.ssm;
    }
    if (options?.ssmDecryption !== undefined) eff.ssmDecryption = options.ssmDecryption;

    // Per-call memoization cache to avoid duplicate fetches of the same external ref
    const cache = new Map<string, Promise<ConfigValue>>();

    return (await this.maybeResolve(value, eff, cache)) as T;
  }

  /**
   * Retrieve a configuration value without resolving external references.
   * This is a shorthand for {@link Configuration.getValue} with `{ resolve: false }`.
   *
   * @template T - Expected return type for the value
   * @param {string} path - Dot-notation path, e.g. "service.endpoint"
   * @returns {Promise<T | undefined>} The raw value or undefined when not present
   */
  public async getRaw<T = unknown>(path: string): Promise<T | undefined> {
    return this.getValue<T>(path, { resolve: false });
  }

  /**
   * Preload and validate all external references by walking the entire configuration tree.
   * Uses the current instance-level resolution options. Intended to help apps fail fast
   * at startup when credentials are missing or references are invalid.
   *
   * Note: The configuration remains immutable; this method only triggers resolution
   * side-effects and discards the result.
   */
  public async preload(): Promise<void> {
    // Use a per-call cache to deduplicate identical references during the walk
    const cache = new Map<string, Promise<ConfigValue>>();
    await this.maybeResolve(this.data as unknown as ConfigValue, this.resolveOptions, cache);
  }

  /**
   * Resolve external references if enabled. For arrays and objects, resolve recursively.
   *
   * The resolution options are defined by {@link ResolutionOptions}.
   *
   * @param {ConfigValue} value - Value to resolve (may be an external reference)
   * @param {typeof this.resolveOptions} [eff] - Effective resolution options
   * @param {Map<string, Promise<ConfigValue>>} [cache] - Per-call memoization cache
   * @returns {Promise<ConfigValue>} The resolved value
   */
  private async maybeResolve(
    value: ConfigValue,
    eff: typeof this.resolveOptions = this.resolveOptions,
    cache?: Map<string, Promise<ConfigValue>>,
  ): Promise<ConfigValue> {
    if (!eff.external) return value;

    if (isExternalRef(value)) {
      // Use per-call cache to deduplicate identical reference fetches
      if (cache) {
        const existing = cache.get(value);
        if (existing) return await existing;
      }

      if (value.startsWith("ssm://") && eff.ssm) {
        const p = resolveSSM(value, this.logger, {
          withDecryption: eff.ssmDecryption,
        }) as Promise<ConfigValue>;
        cache?.set(value, p);
        return await p;
      }
      if (value.startsWith("s3://") && eff.s3) {
        const p = resolveS3(value, this.logger) as Promise<ConfigValue>;
        cache?.set(value, p);
        return await p;
      }
    }

    if (Array.isArray(value)) {
      const out = [] as ConfigValue[];
      for (const item of value) out.push(await this.maybeResolve(item, eff, cache));
      return out;
    }

    if (value && typeof value === "object") {
      const result: Record<string, ConfigValue> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = await this.maybeResolve(v as ConfigValue, eff, cache);
      }
      return result as ConfigObject;
    }

    return value;
  }
}
