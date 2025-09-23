/**
 * @fileoverview ConfigurationFactory: composable builder for immutable `Configuration` instances.
 *
 * Aggregates configuration from JSON files, S3 JSON objects, and in-memory objects.
 * Applies a predictable deep-merge strategy (objects merged recursively, arrays replaced) and
 * initializes the global configuration singleton.
 *
 * Notes:
 * - Loading and parsing S3 JSON via {@link addS3} is configuration composition and always allowed.
 *   Resolution options (e.g., disabling s3 external resolution) apply when reading final values
 *   via {@link Configuration.getValue}, not during factory composition.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { ConfigurationError } from "@t68/errors";
import { type Logger, logger as baseLogger } from "@t68/logger";
import { ObjectUtils } from "@t68/utils";

import { Configuration } from "./configuration.js";
import { resolveS3 } from "./resolvers.js";
import type { ConfigObject, ConfigurationOptions } from "./types.js";

/**
 * Options for the ConfigurationFactory.
 */
export interface ConfigurationFactoryOptions extends ConfigurationOptions {
  /** Optional logger used during factory operations. */
  logger?: Logger;
}

/**
 * ConfigurationFactory accumulates configuration from multiple sources and builds an
 * immutable Configuration.
 *
 * Typical usage:
 * - Add one or more JSON files with {@link addFile}
 * - Add in-memory objects with {@link addObject}
 * - Call {@link build} to initialize the global {@link Configuration}
 *
 * Static helpers {@link buildFromFiles} and {@link buildFromObject} provide convenient
 * single-call flows.
 */
export class ConfigurationFactory {
  private data: ConfigObject = {};
  private readonly options?: ConfigurationFactoryOptions;
  private readonly logger: Logger;

  /**
   * Create a new ConfigurationFactory.
   *
   * @param {ConfigurationFactoryOptions} [options] - Optional factory behavior options (logger, resolution toggle)
   */
  constructor(options?: ConfigurationFactoryOptions) {
    this.options = options;
    this.logger = (options?.logger ?? baseLogger).child({ module: "config-factory" });
  }

  /**
   * Build and initialize Configuration from one or more JSON files.
   *
   * @param {string[]} filePaths - Array of JSON file paths to read and merge (later files override earlier)
   * @param {ConfigurationFactoryOptions} [options] - Factory behavior options (logger, resolution toggle)
   * @returns {Promise<Configuration>} The initialized global {@link Configuration}
   */
  public static async buildFromFiles(
    filePaths: string[],
    options?: ConfigurationFactoryOptions,
  ): Promise<Configuration> {
    const factory = new ConfigurationFactory(options);
    for (const file of filePaths) {
      await factory.addFile(file);
    }
    return factory.build();
  }

  /**
   * Build and initialize Configuration directly from an object.
   *
   * @param {ConfigObject} obj - Plain configuration object to merge
   * @param {ConfigurationFactoryOptions} [options] - Factory behavior options (logger, resolution toggle)
   * @returns {Configuration} The initialized global {@link Configuration}
   */
  public static buildFromObject(
    obj: ConfigObject,
    options?: ConfigurationFactoryOptions,
  ): Configuration {
    const factory = new ConfigurationFactory(options);
    factory.addObject(obj);
    return factory.build();
  }

  /** Add a configuration object (deep-merged). */
  public addObject(obj: ConfigObject): this {
    this.logger.debug({ keys: Object.keys(obj) }, "Adding configuration object");
    this.data = ObjectUtils.deepMerge(
      this.data as Record<string, unknown>,
      obj as Record<string, unknown>,
    ) as ConfigObject;
    return this;
  }

  /**
   * Add a JSON file path. The file is read, parsed, and merged into the current data.
   *
   * Later merges override earlier keys. Throws {@link ConfigurationError} on read/parse failures.
   *
   * @param {string} filePath - Path to a JSON file
   * @returns {Promise<this>} This factory for chaining
   * @throws {ConfigurationError} When the file is not found or has no string value
   */
  public async addFile(filePath: string): Promise<this> {
    try {
      const full = path.resolve(filePath);
      const raw = await readFile(full, "utf8");
      const obj = JSON.parse(raw) as ConfigObject;
      return this.addObject(obj);
    } catch (error) {
      this.logger.error({ error, filePath }, "Failed to add configuration file");
      throw new ConfigurationError("Failed to read configuration file", {
        code: "CONFIG_READ_FILE_ERROR",
        cause: error as Error,
        context: { filePath },
        isOperational: false,
      });
    }
  }

  /**
   * Add configuration from an S3 JSON object (s3://bucket/key). The content is parsed and merged.
   *
   * This composition step is independent from runtime resolution toggles. Disabling s3 resolution
   * in {@link ConfigurationOptions.resolve} only affects how final values are resolved in
   * {@link Configuration.getValue}, not whether this method can fetch JSON from S3.
   *
   * @param {string} s3Path - S3 object URL (s3://bucket/key)
   * @returns {Promise<this>} This factory for chaining
   * @throws {ConfigurationError} When the S3 path is invalid or the body is empty
   */
  public async addS3(s3Path: string): Promise<this> {
    try {
      const text = await resolveS3(s3Path, this.logger);
      const obj = JSON.parse(text) as ConfigObject;
      return this.addObject(obj);
    } catch (error) {
      this.logger.error({ error, s3Path }, "Failed to add configuration from S3");
      throw new ConfigurationError("Failed to read configuration from S3", {
        code: "CONFIG_READ_S3_ERROR",
        cause: error as Error,
        context: { s3Path },
        isOperational: false,
      });
    }
  }

  /**
   * Build and initialize the global Configuration instance.
   *
   * @returns {Configuration} The created global {@link Configuration}
   */
  public build(): Configuration {
    this.logger.info("Building configuration instance");
    return Configuration.initialize(this.data, this.options);
  }
}

// Static helper to build directly from S3 paths
export namespace ConfigurationFactory {
  export async function buildFromS3(
    s3Paths: string[],
    options?: ConfigurationFactoryOptions,
  ): Promise<Configuration> {
    const factory = new ConfigurationFactory(options);
    for (const s3 of s3Paths) await factory.addS3(s3);
    return factory.build();
  }
}
