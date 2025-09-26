/**
 * @fileoverview Configuration core: immutable global configuration with type-safe,
 * dot-notation access and dynamic resolution of external references.
 *
 * Exposes the `Configuration` class that implements the `ConfigurationProvider`
 * contract with a pluggable resolver registry. Instances are immutable and can
 * only be created via the accompanying factory.
 *
 * Resolution behavior is controlled via `ConfigurationOptions.resolve` at instance
 * level and can be overridden per call with `GetValueOptions` in
 * `Configuration.getValue`.
 */

import { ConfigurationError } from "@t68/errors";
import { type Logger, logger as baseLogger } from "@t68/logger";
import { ObjectUtils } from "@t68/utils";

import {
  DefaultResolverRegistry,
  ResolutionEngine,
  type ResolverRegistry,
  S3Resolver,
  SSMResolver,
} from "./resolvers/index.js";
import type {
  ConfigObject,
  ConfigurationOptions,
  ConfigurationProvider,
  ConfigValue,
  GetValueOptions,
} from "./types.js";

/**
 * The global configuration store. Immutable after creation.
 * Provides dot-notation access and dynamic resolution of external references
 * via a pluggable resolver registry.
 *
 * Use `Configuration.initialize` to create the singleton and
 * `Configuration.getInstance` to retrieve it.
 */
export class Configuration implements ConfigurationProvider {
  private static instance: Configuration | undefined;
  private readonly data: Readonly<ConfigObject>;
  private readonly logger: Logger;
  private readonly resolveOptions: Required<NonNullable<ConfigurationOptions["resolve"]>>;
  private readonly resolverRegistry: ResolverRegistry;
  private readonly resolutionEngine: ResolutionEngine;

  /**
   * Creates a new `Configuration` instance.
   *
   * @param data - Plain configuration object (hierarchical)
   * @param options - Behavior customization (logger, external resolution toggle)
   */
  private constructor(data: ConfigObject, options?: ConfigurationOptions) {
    this.logger = (options?.logger ?? baseLogger).child({ module: "config" });
    const ropts = options?.resolve ?? {};
    this.resolveOptions = {
      external: ropts.external ?? true,
      resolvers: ropts.resolvers ?? {
        ssm: { withDecryption: false },
        "ssm-secure": { withDecryption: true },
        s3: true,
      },
    };

    // Initialize resolver registry with default resolvers
    this.resolverRegistry = new DefaultResolverRegistry();

    // Initialize resolution engine
    this.resolutionEngine = new ResolutionEngine(this.resolverRegistry, this.logger);

    this.data = ObjectUtils.deepFreeze(structuredClone(data)) as Readonly<ConfigObject>;
  }

  /**
   * Initialize default resolvers in the registry.
   */
  private async initializeResolvers(): Promise<void> {
    try {
      await this.resolverRegistry.register(new SSMResolver(), this.logger);
      await this.resolverRegistry.register(new S3Resolver(), this.logger);
    } catch (error) {
      this.logger.error({ error }, "Failed to initialize resolvers");
      throw new ConfigurationError("Failed to initialize configuration resolvers", {
        code: "CONFIG_RESOLVER_INIT_ERROR",
        cause: error as Error,
        isOperational: false,
      });
    }
  }

  /**
   * Initialize and set the global configuration instance. Overrides any existing
   * instance.
   *
   * @param data - Plain configuration object (hierarchical)
   * @param options - Behavior customization (logger, external resolution toggle)
   * @returns The created global configuration instance
   */
  public static async initialize(
    data: ConfigObject,
    options?: ConfigurationOptions,
  ): Promise<Configuration> {
    const cfg = new Configuration(data, options);
    await cfg.initializeResolvers();
    Configuration.instance = cfg;
    cfg.logger.info("Configuration initialized");
    return cfg;
  }

  /**
   * Retrieve the global configuration instance. Throws if not initialized.
   *
   * @returns The global configuration instance
   * @throws `ConfigurationError` when the configuration has not been initialized
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
   * Check whether a path exists in the configuration (without
   * resolving external refs).
   *
   * @param path - Path as dot-notation string or array of path segments,
   *   e.g. `"database.primary.host"` or `["database", "primary", "host"]`
   * @returns `true` when the path resolves to a value in the configuration
   */
  public has(path: string | string[]): boolean {
    const pathStr = Array.isArray(path) ? path.join(".") : path;
    return ObjectUtils.deepGet(this.data, pathStr) !== undefined;
  }

  /**
   * Get a configuration value by path.
   * This will automatically resolve external references (`ssm://`, `s3://`) when
   * enabled.
   *
   * Per-call options can override the instance-level resolution behavior
   * configured in `ConfigurationOptions.resolve`.
   *
   * @template T - Expected return type for the value
   * @param path - Path as dot-notation string or array of path segments,
   *   e.g. `"service.endpoint"` or `["service", "endpoint"]`
   * @param options - Optional options for value retrieval
   * @returns The resolved value or `undefined` when not present
   *
   * @example
   * ```typescript
   * // Default behavior (external resolution on)
   * const v1 = await Configuration.getInstance().getValue<string>("service.endpoint");
   *
   * // Using array path
   * const v2 = await Configuration.getInstance().getValue<string>(["service", "endpoint"]);
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
   * ```
   */
  public async getValue<T = unknown>(
    path: string | string[],
    options?: GetValueOptions,
  ): Promise<T | undefined> {
    const pathStr = Array.isArray(path) ? path.join(".") : path;
    const value = ObjectUtils.deepGet<ConfigValue | undefined>(this.data, pathStr);
    if (value === undefined) return undefined;

    // Compute effective resolution options for this call
    const eff = { ...this.resolveOptions };
    if (typeof options?.resolve === "boolean") {
      eff.external = options.resolve;
    } else if (typeof options?.resolve === "object" && options.resolve) {
      if (options.resolve.external !== undefined) eff.external = options.resolve.external;
      if (options.resolve.resolvers !== undefined) {
        eff.resolvers = { ...eff.resolvers, ...options.resolve.resolvers };
      }
    }

    // Use the resolution engine to resolve external references
    return (await this.resolutionEngine.resolve(value, {
      external: eff.external,
      resolvers: eff.resolvers,
    })) as T;
  }

  /**
   * Retrieve a configuration value without resolving external references.
   * This is a shorthand for `Configuration.getValue` with `{ resolve: false }`.
   *
   * @template T - Expected return type for the value
   * @param path - Path as dot-notation string or array of path segments,
   *   e.g. `"service.endpoint"` or `["service", "endpoint"]`
   * @returns The raw value or `undefined` when not present
   *
   * @example
   * ```typescript
   * // Using dot-notation string
   * const value1 = await Configuration.getInstance().getRaw<string>("service.endpoint");
   *
   * // Using array of path segments
   * const value2 = await Configuration.getInstance().getRaw<string>(["service", "endpoint"]);
   * ```
   */
  public async getRaw<T = unknown>(path: string | string[]): Promise<T | undefined> {
    return this.getValue<T>(path, { resolve: false });
  }

  /**
   * Preload and validate all external references by walking the entire
   * configuration tree. Uses the current instance-level resolution options.
   * Intended to help apps fail fast at startup when credentials are missing or
   * references are invalid.
   *
   * Note: The configuration remains immutable; this method only triggers
   * resolution side-effects and discards the result.
   */
  public async preload(): Promise<void> {
    // Use the resolution engine to preload all external references
    await this.resolutionEngine.resolve(this.data as unknown as ConfigValue, {
      external: this.resolveOptions.external,
      resolvers: this.resolveOptions.resolvers,
    });
  }
}
