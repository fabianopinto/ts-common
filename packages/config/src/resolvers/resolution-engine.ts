/**
 * @fileoverview Optimized resolution engine with batch processing and caching.
 *
 * Provides intelligent resolution optimization by analyzing references,
 * grouping batch-capable operations, and managing persistent caching
 * across multiple resolution calls.
 */

import type { Logger } from "@t68/logger";

import type { ConfigValue } from "../types.js";

/**
 * @internal
 * A wrapper to store errors in the cache without causing unhandled promise rejections.
 */
class ErrorWrapper {
  constructor(public readonly error: unknown) {}
}
import {
  type BatchResolutionRequest,
  type ConfigResolver,
  extractProtocol,
  isExternalReference,
  type ResolverRegistry,
} from "./base.js";

/**
 * Resolution context for tracking and optimizing resolution operations.
 */
export interface ResolutionContext {
  /** Per-call cache to avoid duplicate resolution of identical references */
  cache: Map<string, Promise<ConfigValue>>;
  /** Collected batch requests grouped by protocol */
  batchRequests: Map<string, BatchResolutionRequest[]>;
  /** Resolution options for this context */
  options: Record<string, boolean | Record<string, unknown>>;
  /** Whether external resolution is enabled */
  external: boolean;
}

/**
 * Resolution statistics for performance monitoring.
 */
export interface ResolutionStats {
  /** Total number of references processed */
  totalReferences: number;
  /** Number of references resolved from cache */
  cacheHits: number;
  /** Number of batch operations performed */
  batchOperations: number;
  /** Number of individual resolution calls */
  individualResolutions: number;
  /** Total resolution time in milliseconds */
  totalTimeMs: number;
  /** Breakdown by resolver protocol */
  byProtocol: Record<string, { count: number; timeMs: number }>;
}

/**
 * Optimized resolution engine with intelligent batching and caching.
 *
 * Features:
 * - Automatic detection of batch-capable resolvers
 * - Intelligent grouping of similar references for batch processing
 * - Persistent caching across resolution calls
 * - Performance monitoring and statistics
 * - Recursive resolution of nested objects and arrays
 *
 * @example
 * ```typescript
 * const engine = new ResolutionEngine(registry, logger);
 *
 * // Resolve with automatic optimization
 * const resolved = await engine.resolve(configValue, {
 *   external: true,
 *   resolvers: { ssm: true, faker: { locale: 'en' } }
 * });
 *
 * // Get performance statistics
 * const stats = engine.getStats();
 * console.log(`Resolved ${stats.totalReferences} references in ${stats.totalTimeMs}ms`);
 * ```
 */
export class ResolutionEngine {
  private stats: ResolutionStats = {
    totalReferences: 0,
    cacheHits: 0,
    batchOperations: 0,
    individualResolutions: 0,
    totalTimeMs: 0,
    byProtocol: {},
  };

  constructor(
    private readonly registry: ResolverRegistry,
    private readonly logger: Logger,
  ) {}

  /**
   * Resolve a configuration value with optimization.
   *
   * @param value - Value to resolve (may contain external references)
   * @param options - Resolution options
   * @returns Resolved value with all external references processed
   */
  public async resolve(
    value: ConfigValue,
    options: { external?: boolean; resolvers?: Record<string, boolean | Record<string, unknown>> },
  ): Promise<ConfigValue> {
    const startTime = Date.now();

    const context: ResolutionContext = {
      cache: new Map(),
      batchRequests: new Map(),
      options: options.resolvers ?? {},
      external: options.external ?? true,
    };

    try {
      // Phase 1: Collect all external references and group for batching
      await this.collectReferences(value, context);

      // Phase 2: Execute batch operations
      await this.executeBatchOperations(context);

      // Phase 3: Resolve the value using cached and batch results
      const result = await this.resolveValue(value, context);

      // Update statistics
      this.stats.totalTimeMs += Date.now() - startTime;

      return result;
    } catch (error) {
      this.logger.error({ error }, "Resolution engine failed");
      throw error;
    }
  }

  /**
   * Get resolution performance statistics.
   */
  public getStats(): Readonly<ResolutionStats> {
    return { ...this.stats };
  }

  /**
   * Reset performance statistics.
   */
  public resetStats(): void {
    this.stats = {
      totalReferences: 0,
      cacheHits: 0,
      batchOperations: 0,
      individualResolutions: 0,
      totalTimeMs: 0,
      byProtocol: {},
    };
  }

  /**
   * Phase 1: Recursively collect all external references for batch processing.
   */
  private async collectReferences(value: ConfigValue, context: ResolutionContext): Promise<void> {
    if (!context.external) return;

    if (isExternalReference(value)) {
      const protocol = extractProtocol(value);
      if (!protocol) return;

      const resolver = this.registry.getResolver(protocol);
      if (!resolver || !this.isResolverEnabled(protocol, context.options)) {
        return;
      }

      // Check if resolver supports batching
      if (resolver.supportsBatch && resolver.resolveBatch) {
        // Add to batch requests
        if (!context.batchRequests.has(protocol)) {
          context.batchRequests.set(protocol, []);
        }

        const requests = context.batchRequests.get(protocol)!;
        const resolverOptions = this.getResolverOptions(protocol, context.options);

        requests.push({
          reference: value,
          options: resolverOptions,
        });
      }

      this.stats.totalReferences++;
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        await this.collectReferences(item, context);
      }
      return;
    }

    if (value && typeof value === "object") {
      for (const v of Object.values(value)) {
        await this.collectReferences(v as ConfigValue, context);
      }
    }
  }

  /**
   * Phase 2: Execute all collected batch operations.
   */
  private async executeBatchOperations(context: ResolutionContext): Promise<void> {
    const batchPromises: Promise<void>[] = [];

    for (const [protocol, requests] of context.batchRequests.entries()) {
      if (requests.length === 0) continue;

      const resolver = this.registry.getResolver(protocol);
      if (!resolver?.supportsBatch || !resolver.resolveBatch) continue;

      const batchPromise = this.executeBatch(protocol, requests, resolver, context);
      batchPromises.push(batchPromise);
    }

    await Promise.all(batchPromises);
  }

  /**
   * Execute a single batch operation for a protocol.
   */
  private async executeBatch(
    protocol: string,
    requests: BatchResolutionRequest[],
    resolver: ConfigResolver,
    context: ResolutionContext,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug({ protocol, count: requests.length }, "Executing batch resolution");

      const results = await resolver.resolveBatch!(requests, this.logger);

      // Store results in cache
      for (const result of results) {
        if (result.value) {
          context.cache.set(result.reference, Promise.resolve(result.value));
        } else if (result.error) {
          context.cache.set(result.reference, Promise.reject(result.error));
        }
      }

      this.stats.batchOperations++;

      // Update protocol statistics
      const timeMs = Date.now() - startTime;
      if (!this.stats.byProtocol[protocol]) {
        this.stats.byProtocol[protocol] = { count: 0, timeMs: 0 };
      }
      this.stats.byProtocol[protocol].count += requests.length;
      this.stats.byProtocol[protocol].timeMs += timeMs;
    } catch (error) {
      this.logger.error({ error, protocol, count: requests.length }, "Batch resolution failed");

      // Store error for all requests in the batch, wrapped to avoid unhandled rejections
      const wrappedError = new ErrorWrapper(error);
      for (const request of requests) {
        context.cache.set(
          request.reference,
          Promise.resolve(wrappedError) as unknown as Promise<ConfigValue>,
        );
      }
    }
  }

  /**
   * Phase 3: Resolve the value using cached results and fallback resolution.
   */
  private async resolveValue(value: ConfigValue, context: ResolutionContext): Promise<ConfigValue> {
    if (!context.external) return value;

    if (isExternalReference(value)) {
      // Check cache first (from batch operations)
      const cached = context.cache.get(value);
      if (cached) {
        const result = await cached;

        // If the cached value is a wrapped error, throw it
        if (result instanceof ErrorWrapper) {
          throw result.error;
        }

        this.stats.cacheHits++;
        return result;
      }

      // Fallback to individual resolution
      return this.resolveIndividual(value, context);
    }

    if (Array.isArray(value)) {
      const resolved: ConfigValue[] = [];
      for (const item of value) {
        resolved.push(await this.resolveValue(item, context));
      }
      return resolved;
    }

    if (value && typeof value === "object") {
      const resolved: Record<string, ConfigValue> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = await this.resolveValue(val as ConfigValue, context);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Fallback individual resolution for references not handled by batch operations.
   */
  private async resolveIndividual(reference: string, context: ResolutionContext): Promise<string> {
    const protocol = extractProtocol(reference);
    if (!protocol) return reference;

    const resolver = this.registry.getResolver(protocol);
    if (!resolver || !this.isResolverEnabled(protocol, context.options)) {
      return reference;
    }

    const startTime = Date.now();

    try {
      const resolverOptions = this.getResolverOptions(protocol, context.options);
      const result = await resolver.resolve(reference, resolverOptions, this.logger);

      this.stats.individualResolutions++;

      // Update protocol statistics
      const timeMs = Date.now() - startTime;
      if (!this.stats.byProtocol[protocol]) {
        this.stats.byProtocol[protocol] = { count: 0, timeMs: 0 };
      }
      this.stats.byProtocol[protocol].count++;
      this.stats.byProtocol[protocol].timeMs += timeMs;

      return result;
    } catch (error) {
      this.logger.error({ error, reference, protocol }, "Individual resolution failed");
      throw error;
    }
  }

  /**
   * Check if a resolver is enabled in the current options.
   */
  private isResolverEnabled(
    protocol: string,
    options: Record<string, boolean | Record<string, unknown>>,
  ): boolean {
    const setting = options[protocol];
    return setting !== false;
  }

  /**
   * Get resolver-specific options from the resolution context.
   */
  private getResolverOptions(
    protocol: string,
    options: Record<string, boolean | Record<string, unknown>>,
  ): Record<string, unknown> {
    const setting = options[protocol];
    if (typeof setting === "object") {
      return setting;
    }
    return {};
  }
}
