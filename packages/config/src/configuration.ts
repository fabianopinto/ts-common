/**
 * @fileoverview Configuration core: immutable global configuration with type-safe, dot-notation access
 * and automatic resolution of external references (AWS SSM and S3).
 *
 * Exposes the `Configuration` class that implements the `ConfigurationProvider` contract.
 * Instances are immutable and can only be created via the accompanying factory.
 */

import { ConfigurationError } from "@fabianopinto/errors";
import { type Logger, logger as baseLogger } from "@fabianopinto/logger";
import { ObjectUtils } from "@fabianopinto/utils";

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
 */
export class Configuration implements ConfigurationProvider {
  private static instance: Configuration | undefined;
  private readonly data: Readonly<ConfigObject>;
  private readonly logger: Logger;
  private readonly resolveOptions: Required<NonNullable<ConfigurationOptions["resolve"]>>;

  /**
   * @param data - Plain configuration object (hierarchical)
   * @param options - Behavior customization (logger, external resolution toggle)
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
   * @param data - Plain configuration object (hierarchical)
   * @param options - Behavior customization (logger, external resolution toggle)
   * @returns The created global configuration instance
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
   * @throws {ConfigurationError} When the configuration has not been initialized
   * @returns The global configuration instance
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
   * Check whether a dot-notation path exists in the configuration (without resolving external refs).
   *
   * @param path - Dot-notation path, e.g. "database.primary.host"
   * @returns True when the path resolves to a value in the configuration
   */
  public has(path: string): boolean {
    return ObjectUtils.deepGet(this.data, path) !== undefined;
  }

  /**
   * Get a configuration value by dot-notation path.
   * This will automatically resolve external references (ssm://, s3://) when enabled.
   *
   * @typeParam T - Expected return type for the value
   * @param path - Dot-notation path, e.g. "service.endpoint"
   * @returns The resolved value or undefined when not present
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

    return (await this.maybeResolve(value, eff)) as T;
  }

  /**
   * Resolve external references if enabled. For arrays and objects, resolve recursively.
   *
   * @param value - Value to resolve (may be an external reference)
   * @returns The resolved value
   */
  /** Resolve external references if enabled. For arrays and objects, resolve recursively. */
  private async maybeResolve(
    value: ConfigValue,
    eff: typeof this.resolveOptions = this.resolveOptions,
  ): Promise<ConfigValue> {
    if (!eff.external) return value;

    if (isExternalRef(value)) {
      if (value.startsWith("ssm://") && eff.ssm)
        return await resolveSSM(value, this.logger, {
          withDecryption: eff.ssmDecryption,
        });
      if (value.startsWith("s3://") && eff.s3) return await resolveS3(value, this.logger);
    }

    if (Array.isArray(value)) {
      const out = [] as ConfigValue[];
      for (const item of value) out.push(await this.maybeResolve(item, eff));
      return out;
    }

    if (value && typeof value === "object") {
      const result: Record<string, ConfigValue> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = await this.maybeResolve(v as ConfigValue, eff);
      }
      return result as ConfigObject;
    }

    return value;
  }
}
