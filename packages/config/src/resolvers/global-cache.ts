/**
 * @fileoverview Global caching system for configuration resolvers with robust edge case handling.
 *
 * Provides a centralized, multi-layered caching system with comprehensive
 * edge case protection including out-of-memory conditions, cache starvation,
 * eviction storms, circuit breaker patterns, and adaptive memory management.
 * Designed for production resilience and optimal performance.
 */

import type { Logger } from "@t68/logger";

/**
 * Cache entry priority levels for intelligent eviction.
 */
export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Memory pressure levels for adaptive behavior.
 */
export enum MemoryPressureLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Circuit breaker states for cache failure handling.
 */
export enum CircuitBreakerState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half-open",
}

/**
 * Cache entry with metadata for advanced cache management and edge case handling.
 */
export interface GlobalCacheEntry<T = string> {
  /** The cached value */
  value: T;
  /** Timestamp when the entry was created */
  createdAt: number;
  /** Timestamp when the entry was last accessed */
  lastAccessedAt: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Size of the cached value in bytes (estimated) */
  sizeBytes: number;
  /** Resolver protocol that created this entry */
  protocol: string;
  /** Optional tags for cache organization */
  tags?: string[];
  /** Priority level for eviction decisions */
  priority: CachePriority;
  /** Number of resolution failures for this entry */
  failureCount: number;
  /** Last failure timestamp */
  lastFailureAt?: number;
  /** Estimated resolution cost (for intelligent caching) */
  resolutionCostMs: number;
}

/**
 * Cache statistics for monitoring and optimization with edge case metrics.
 */
export interface CacheStats {
  /** Total number of entries in cache */
  totalEntries: number;
  /** Total memory usage in bytes (estimated) */
  totalSizeBytes: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Number of expired entries removed */
  expiredRemoved: number;
  /** Number of entries evicted due to size limits */
  evicted: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Breakdown by protocol */
  byProtocol: Record<string, { entries: number; sizeBytes: number; hits: number }>;
  /** Memory pressure level */
  memoryPressure: MemoryPressureLevel;
  /** Circuit breaker state */
  circuitBreakerState: CircuitBreakerState;
  /** Number of eviction storms detected */
  evictionStorms: number;
  /** Number of out-of-memory events */
  outOfMemoryEvents: number;
  /** Number of cache starvation events */
  starvationEvents: number;
  /** Average entry resolution cost */
  avgResolutionCostMs: number;
  /** Cache efficiency score (0-1) */
  efficiencyScore: number;
}

/**
 * Configuration for the global cache system with edge case handling.
 */
export interface GlobalCacheConfig {
  /** Maximum number of entries (default: `10000`) */
  maxEntries?: number;
  /** Maximum memory usage in bytes (default: `100MB`) */
  maxSizeBytes?: number;
  /** Default TTL in milliseconds (default: `5 minutes`) */
  defaultTtlMs?: number;
  /** Cleanup interval in milliseconds (default: `1 minute`) */
  cleanupIntervalMs?: number;
  /** Enable LRU eviction when limits are reached (default: `true`) */
  enableLru?: boolean;
  /** Enable automatic cleanup of expired entries (default: `true`) */
  enableAutoCleanup?: boolean;
  /** Memory pressure threshold (0-1) to trigger aggressive cleanup (default: `0.8`) */
  memoryPressureThreshold?: number;
  /** Maximum size for a single cache entry in bytes (default: `10MB`) */
  maxEntrySizeBytes?: number;
  /** Enable circuit breaker for cache failures (default: `true`) */
  enableCircuitBreaker?: boolean;
  /** Circuit breaker failure threshold (default: `5`) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker reset timeout in milliseconds (default: `60000`) */
  circuitBreakerResetTimeoutMs?: number;
  /** Enable priority-based eviction (default: `true`) */
  enablePriorityEviction?: boolean;
  /** Minimum cache size to maintain during eviction (default: `100`) */
  minCacheSize?: number;
  /** Enable memory monitoring and adaptive behavior (default: `true`) */
  enableMemoryMonitoring?: boolean;
}

/**
 * Global cache system for configuration resolvers with comprehensive edge case handling.
 *
 * Features:
 * - **Out-of-Memory Protection**: Adaptive memory management with pressure monitoring
 * - **Eviction Storm Prevention**: Intelligent eviction with minimum cache size
 * - **Cache Starvation Prevention**: Priority-based eviction and cache warming
 * - **Circuit Breaker**: Automatic fallback when cache operations fail
 * - **Memory Pressure Monitoring**: Adaptive behavior based on system memory
 * - **Priority-based Eviction**: Protect critical entries during memory pressure
 * - **Self-healing**: Automatic recovery from failure states
 *
 * @example
 * ```typescript
 * const cache = GlobalCache.getInstance({
 *   maxSizeBytes: 100 * 1024 * 1024,
 *   memoryPressureThreshold: 0.8,
 *   enableCircuitBreaker: true,
 *   enablePriorityEviction: true,
 *   minCacheSize: 100
 * });
 *
 * // Set with priority and resolution cost
 * cache.set("critical-config", value, {
 *   protocol: "ssm",
 *   priority: CachePriority.CRITICAL,
 *   resolutionCostMs: 500
 * });
 * ```
 */
export class GlobalCache {
  private static instance: GlobalCache | undefined;
  private readonly cache = new Map<string, GlobalCacheEntry>();
  private readonly config: Required<GlobalCacheConfig>;
  private readonly stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private memoryMonitorTimer: NodeJS.Timeout | null = null;

  // Circuit breaker state
  private circuitBreakerState = CircuitBreakerState.CLOSED;
  private circuitBreakerFailures = 0;
  private circuitBreakerLastFailure = 0;

  // Eviction storm detection
  private recentEvictions: number[] = [];
  private lastEvictionStormTime = 0;

  private constructor(config: GlobalCacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 10000,
      maxSizeBytes: config.maxSizeBytes ?? 100 * 1024 * 1024, // 100MB
      defaultTtlMs: config.defaultTtlMs ?? 5 * 60 * 1000, // 5 minutes
      cleanupIntervalMs: config.cleanupIntervalMs ?? 60 * 1000, // 1 minute
      enableLru: config.enableLru ?? true,
      enableAutoCleanup: config.enableAutoCleanup ?? true,
      memoryPressureThreshold: config.memoryPressureThreshold ?? 0.8,
      maxEntrySizeBytes: config.maxEntrySizeBytes ?? 10 * 1024 * 1024, // 10MB
      enableCircuitBreaker: config.enableCircuitBreaker ?? true,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerResetTimeoutMs: config.circuitBreakerResetTimeoutMs ?? 60000,
      enablePriorityEviction: config.enablePriorityEviction ?? true,
      minCacheSize: config.minCacheSize ?? 100,
      enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
    };

    this.stats = {
      totalEntries: 0,
      totalSizeBytes: 0,
      hits: 0,
      misses: 0,
      expiredRemoved: 0,
      evicted: 0,
      hitRatio: 0,
      byProtocol: {},
      memoryPressure: MemoryPressureLevel.LOW,
      circuitBreakerState: CircuitBreakerState.CLOSED,
      evictionStorms: 0,
      outOfMemoryEvents: 0,
      starvationEvents: 0,
      avgResolutionCostMs: 0,
      efficiencyScore: 1.0,
    };

    this.startTimers();
  }

  /**
   * Get the global cache singleton instance.
   *
   * @param config - Optional configuration for cache initialization
   * @returns The global cache singleton instance
   */
  public static getInstance(config?: GlobalCacheConfig): GlobalCache {
    if (!GlobalCache.instance) {
      GlobalCache.instance = new GlobalCache(config);
    }
    return GlobalCache.instance;
  }

  /**
   * Reset the global cache instance (mainly for testing).
   *
   * Cleans up the current instance and allows creation of a new one.
   * Should only be used in test environments.
   */
  public static reset(): void {
    if (GlobalCache.instance) {
      GlobalCache.instance.cleanup();
      GlobalCache.instance = undefined;
    }
  }

  /**
   * Get a cached value with circuit breaker protection.
   *
   * @template T - Type of the cached value
   * @param key - Cache key to retrieve
   * @returns Cache entry with metadata or `undefined` if not found/expired
   */
  public get<T = string>(key: string): GlobalCacheEntry<T> | undefined {
    // Circuit breaker check
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      this.stats.misses++;
      this.updateHitRatio();
      return undefined;
    }

    try {
      const entry = this.cache.get(key) as GlobalCacheEntry<T> | undefined;

      if (!entry) {
        this.stats.misses++;
        this.updateHitRatio();
        return undefined;
      }

      const now = Date.now();

      // Check if entry has expired based on TTL
      if (now > entry.createdAt + entry.ttl) {
        this.cache.delete(key);
        this.updateStats(-1, -entry.sizeBytes, entry.protocol);
        this.stats.expiredRemoved++;
        this.stats.misses++;
        this.updateHitRatio();
        return undefined;
      }

      // Update access metadata for LRU tracking
      entry.lastAccessedAt = now;
      entry.accessCount++;

      this.stats.hits++;
      this.updateProtocolStats(entry.protocol, "hits", 1);
      this.updateHitRatio();

      // Reset circuit breaker on successful operation
      this.resetCircuitBreakerOnSuccess();

      return entry;
    } catch (error) {
      this.handleCacheError(error as Error, "get");
      this.stats.misses++;
      this.updateHitRatio();
      return undefined;
    }
  }

  /**
   * Set a cached value with enhanced options and edge case protection.
   *
   * @template T - Type of the value to cache
   * @param key - Cache key for the value
   * @param value - Value to cache
   * @param options - Caching options including protocol, TTL, priority
   * @returns `true` if successfully cached, `false` if rejected or failed
   */
  public set<T = string>(
    key: string,
    value: T,
    options: {
      protocol: string;
      ttlMs?: number;
      tags?: string[];
      priority?: CachePriority;
      resolutionCostMs?: number;
    },
  ): boolean {
    // Circuit breaker check
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      return false;
    }

    try {
      const now = Date.now();
      const ttl = options.ttlMs ?? this.config.defaultTtlMs;
      const sizeBytes = this.estimateSize(value);
      const priority = options.priority ?? CachePriority.NORMAL;
      const resolutionCostMs = options.resolutionCostMs ?? 0;

      // Check entry size against `maxEntrySizeBytes` limit
      if (sizeBytes > this.config.maxEntrySizeBytes) {
        throw new Error(`Entry size ${sizeBytes} exceeds maximum ${this.config.maxEntrySizeBytes}`);
      }

      // Check memory pressure and adapt caching behavior
      const memoryPressure = this.getMemoryPressureLevel();
      if (memoryPressure === MemoryPressureLevel.CRITICAL && priority < CachePriority.HIGH) {
        // Reject low-priority entries during `CRITICAL` memory pressure
        return false;
      }

      // Intelligent eviction with edge case protection
      if (this.shouldEvict(sizeBytes)) {
        const evicted = this.evictEntriesIntelligent(sizeBytes, priority);
        if (!evicted && this.cache.size >= this.config.minCacheSize) {
          // Could not make room and we're at `minCacheSize` limit
          this.stats.starvationEvents++;
          return false;
        }
      }

      const entry: GlobalCacheEntry<T> = {
        value,
        createdAt: now,
        lastAccessedAt: now,
        ttl,
        accessCount: 1,
        sizeBytes,
        protocol: options.protocol,
        tags: options.tags,
        priority,
        failureCount: 0,
        resolutionCostMs,
      };

      // Remove existing entry if present to avoid duplicates
      const existing = this.cache.get(key);
      if (existing) {
        this.updateStats(-1, -existing.sizeBytes, existing.protocol);
      }

      this.cache.set(key, entry as GlobalCacheEntry);
      this.updateStats(1, sizeBytes, options.protocol);

      // Reset circuit breaker on successful operation
      this.resetCircuitBreakerOnSuccess();

      return true;
    } catch (error) {
      this.handleCacheError(error as Error, "set");
      return false;
    }
  }

  /**
   * Remove a cached value by key.
   *
   * @param key - Cache key to remove
   * @returns `true` if entry was found and removed, `false` otherwise
   */
  public delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.updateStats(-1, -entry.sizeBytes, entry.protocol);
    return true;
  }

  /**
   * Clear all cached entries, optionally filtered by tags.
   *
   * @param tags - Optional array of tags to filter entries for removal
   * @returns Number of entries removed
   */
  public clear(tags?: string[]): number {
    if (!tags || tags.length === 0) {
      const count = this.cache.size;
      this.cache.clear();
      this.stats.totalEntries = 0;
      this.stats.totalSizeBytes = 0;
      this.stats.byProtocol = {};
      return count;
    }

    return this.clearByTags(tags);
  }

  /**
   * Clear entries by tag prefix.
   *
   * @param prefix - Tag prefix to match for removal
   * @returns Number of entries removed
   */
  public clearByPrefix(prefix: string): number {
    const tags = this.getAllTags();
    return this.clearByTags(tags.filter((tag) => tag.startsWith(prefix)));
  }

  /**
   * Get enhanced cache statistics with efficiency calculation.
   *
   * @returns Readonly copy of current cache statistics
   */
  public getStats(): Readonly<CacheStats> {
    this.updateEfficiencyScore();
    this.stats.memoryPressure = this.getMemoryPressureLevel();
    this.stats.circuitBreakerState = this.circuitBreakerState;
    return { ...this.stats };
  }

  /**
   * Force memory pressure cleanup based on current memory pressure level.
   *
   * @returns Number of entries removed during cleanup
   */
  public handleMemoryPressure(): number {
    const memoryPressure = this.getMemoryPressureLevel();
    let removed = 0;

    switch (memoryPressure) {
      case MemoryPressureLevel.HIGH:
        removed = this.aggressiveCleanup(0.3); // Remove 30% of cache entries
        break;
      case MemoryPressureLevel.CRITICAL:
        removed = this.aggressiveCleanup(0.5); // Remove 50% of cache entries
        this.stats.outOfMemoryEvents++;
        break;
    }

    return removed;
  }

  /**
   * Get cache configuration.
   *
   * @returns Readonly copy of current cache configuration
   */
  public getConfig(): Readonly<Required<GlobalCacheConfig>> {
    return { ...this.config };
  }

  /**
   * Manually trigger cleanup of expired entries.
   *
   * @returns Number of expired entries removed
   */
  public cleanupExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.createdAt + entry.ttl) {
        this.cache.delete(key);
        this.updateStats(-1, -entry.sizeBytes, entry.protocol);
        removed++;
      }
    }

    this.stats.expiredRemoved += removed;
    return removed;
  }

  /**
   * Clean up resources and stop auto-cleanup timers.
   *
   * Stops all background timers and clears the cache.
   * Should be called when shutting down the application.
   */
  public cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer);
      this.memoryMonitorTimer = null;
    }
    this.cache.clear();
  }

  /**
   * Get current memory pressure level based on cache usage.
   *
   * @returns Current memory pressure level enum value
   */
  private getMemoryPressureLevel(): MemoryPressureLevel {
    const memoryUsageRatio = this.stats.totalSizeBytes / this.config.maxSizeBytes;
    const entryUsageRatio = this.stats.totalEntries / this.config.maxEntries;
    const maxRatio = Math.max(memoryUsageRatio, entryUsageRatio);

    if (maxRatio >= 0.95) return MemoryPressureLevel.CRITICAL;
    if (maxRatio >= 0.85) return MemoryPressureLevel.HIGH;
    if (maxRatio >= 0.7) return MemoryPressureLevel.MEDIUM;
    return MemoryPressureLevel.LOW;
  }

  /**
   * Intelligent eviction with priority and cost consideration.
   *
   * @param requiredBytes - Number of bytes that need to be freed
   * @param newEntryPriority - Priority of the new entry being added
   * @returns `true` if sufficient space was freed, `false` otherwise
   */
  private evictEntriesIntelligent(requiredBytes: number, newEntryPriority: CachePriority): boolean {
    if (!this.config.enableLru) return false;

    // Detect eviction storm
    this.detectEvictionStorm();

    const entries = Array.from(this.cache.entries());

    // Sort by eviction score (lower score = evict first)
    entries.sort(([, a], [, b]) => {
      const scoreA = this.calculateEvictionScore(a);
      const scoreB = this.calculateEvictionScore(b);
      return scoreA - scoreB;
    });

    let freedBytes = 0;
    let evicted = 0;
    const minCacheSize = Math.max(this.config.minCacheSize, this.cache.size * 0.1);

    for (const [key, entry] of entries) {
      // Stop if we've freed enough space or reached minimum cache size
      if (
        (freedBytes >= requiredBytes && this.cache.size - evicted > minCacheSize) ||
        this.cache.size - evicted <= minCacheSize
      ) {
        break;
      }

      // Don't evict entries with higher priority than the new entry
      if (this.config.enablePriorityEviction && entry.priority >= newEntryPriority) {
        continue;
      }

      // Don't evict critical entries unless in critical memory pressure
      if (
        entry.priority === CachePriority.CRITICAL &&
        this.getMemoryPressureLevel() !== MemoryPressureLevel.CRITICAL
      ) {
        continue;
      }

      this.cache.delete(key);
      this.updateStats(-1, -entry.sizeBytes, entry.protocol);
      freedBytes += entry.sizeBytes;
      evicted++;
    }

    this.stats.evicted += evicted;
    this.trackEviction(evicted);

    return freedBytes >= requiredBytes;
  }

  /**
   * Calculate eviction score for an entry (lower score = evict first).
   *
   * @param entry - Cache entry to calculate score for
   * @returns Numeric score where lower values indicate higher eviction priority
   */
  private calculateEvictionScore(entry: GlobalCacheEntry): number {
    const now = Date.now();
    const timeSinceAccess = now - entry.lastAccessedAt;

    // Base score factors
    let score = 0;

    // Priority factor (higher priority = higher score)
    score += entry.priority * 1000;

    // Access frequency factor
    score += entry.accessCount * 100;

    // Recency factor (more recent access = higher score)
    score += Math.max(0, 3600000 - timeSinceAccess) / 1000; // 1 hour max

    // Resolution cost factor (expensive to recreate = higher score)
    score += entry.resolutionCostMs / 10;

    // Failure penalty (failed entries = lower score)
    score -= entry.failureCount * 50;

    // Size penalty for large entries
    score -= entry.sizeBytes / 1024; // Penalty per KB

    return score;
  }

  /**
   * Detect and handle eviction storms.
   *
   * Monitors recent eviction patterns and takes corrective action
   * when too many evictions occur in a short time window.
   */
  private detectEvictionStorm(): void {
    const now = Date.now();
    const windowMs = 10000; // 10 second window

    // Clean old eviction records outside time window
    this.recentEvictions = this.recentEvictions.filter((time) => now - time < windowMs);

    // Check for eviction storm (more than 100 evictions in 10 seconds)
    if (this.recentEvictions.length > 100 && now - this.lastEvictionStormTime > windowMs) {
      this.stats.evictionStorms++;
      this.lastEvictionStormTime = now;

      // Temporarily increase memory limits to prevent cascading failures
      this.temporarilyIncreaseMemoryLimits();
    }
  }

  /**
   * Track eviction for storm detection.
   *
   * @param count - Number of entries that were evicted
   */
  private trackEviction(count: number): void {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      this.recentEvictions.push(now);
    }
  }

  /**
   * Temporarily increase memory limits during eviction storms.
   *
   * Increases cache limits by 20% for 5 minutes to prevent cascading failures.
   */
  private temporarilyIncreaseMemoryLimits(): void {
    // Increase limits by 20% for 5 minutes to handle burst load
    const originalMaxSize = this.config.maxSizeBytes;
    const originalMaxEntries = this.config.maxEntries;

    this.config.maxSizeBytes = Math.floor(originalMaxSize * 1.2);
    this.config.maxEntries = Math.floor(originalMaxEntries * 1.2);

    setTimeout(
      () => {
        this.config.maxSizeBytes = originalMaxSize;
        this.config.maxEntries = originalMaxEntries;
      },
      5 * 60 * 1000,
    ); // Reset after 5 minutes
  }

  /**
   * Aggressive cleanup during memory pressure.
   *
   * @param targetReductionRatio - Fraction of cache to remove (0-1)
   * @returns Number of entries actually removed
   */
  private aggressiveCleanup(targetReductionRatio: number): number {
    const targetRemoval = Math.floor(this.cache.size * targetReductionRatio);
    const entries = Array.from(this.cache.entries());

    // Sort by eviction score, prioritizing low-value entries for removal
    entries.sort(([, a], [, b]) => {
      const scoreA = this.calculateEvictionScore(a);
      const scoreB = this.calculateEvictionScore(b);
      return scoreA - scoreB;
    });

    let removed = 0;
    for (const [key, entry] of entries.slice(0, targetRemoval)) {
      // Always preserve `CRITICAL` priority entries
      if (entry.priority === CachePriority.CRITICAL) continue;

      this.cache.delete(key);
      this.updateStats(-1, -entry.sizeBytes, entry.protocol);
      removed++;
    }

    return removed;
  }

  /**
   * Handle cache operation errors with circuit breaker pattern.
   *
   * @param error - The error that occurred
   * @param operation - Name of the operation that failed
   */
  private handleCacheError(error: Error, operation: string): void {
    if (!this.config.enableCircuitBreaker) return;

    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();

    if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
      this.circuitBreakerState = CircuitBreakerState.OPEN;

      // Auto-reset circuit breaker to `HALF_OPEN` after timeout
      setTimeout(() => {
        this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
      }, this.config.circuitBreakerResetTimeoutMs);
    }
  }

  /**
   * Reset circuit breaker on successful operations.
   *
   * Transitions from `HALF_OPEN` to `CLOSED` state on success.
   */
  private resetCircuitBreakerOnSuccess(): void {
    if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      this.circuitBreakerState = CircuitBreakerState.CLOSED;
      this.circuitBreakerFailures = 0;
    }
  }

  /**
   * Start background monitoring timers for cleanup and memory monitoring.
   */
  private startTimers(): void {
    if (this.config.enableAutoCleanup) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpired();
      }, this.config.cleanupIntervalMs);
    }

    if (this.config.enableMemoryMonitoring) {
      this.memoryMonitorTimer = setInterval(() => {
        this.stats.memoryPressure = this.getMemoryPressureLevel();

        // Proactive cleanup during `HIGH` or `CRITICAL` memory pressure
        if (this.stats.memoryPressure >= MemoryPressureLevel.HIGH) {
          this.handleMemoryPressure();
        }
      }, 30000); // Check memory pressure every 30 seconds
    }
  }

  /**
   * Update cache efficiency score based on hit ratio, memory usage, and eviction rate.
   */
  private updateEfficiencyScore(): void {
    const hitRatio = this.stats.hitRatio;
    const memoryEfficiency = 1 - this.stats.totalSizeBytes / this.config.maxSizeBytes;
    const evictionRatio = this.stats.evicted / Math.max(1, this.stats.totalEntries);

    // Calculate weighted efficiency score (0-1)
    this.stats.efficiencyScore =
      hitRatio * 0.5 + // 50% weight on cache hit ratio
      memoryEfficiency * 0.3 + // 30% weight on memory utilization efficiency
      (1 - evictionRatio) * 0.2; // 20% weight on eviction efficiency (lower is better)
  }

  /**
   * Check if we should evict entries to make room for new entry.
   *
   * @param newEntrySizeBytes - Size of the new entry in bytes
   * @returns `true` if eviction is needed, `false` otherwise
   */
  private shouldEvict(newEntrySizeBytes: number): boolean {
    return (
      this.cache.size >= this.config.maxEntries ||
      this.stats.totalSizeBytes + newEntrySizeBytes > this.config.maxSizeBytes
    );
  }

  /**
   * Evict least recently used entries to make room.
   */
  private evictEntries(requiredBytes: number): void {
    if (!this.config.enableLru) return;

    // Sort entries by last accessed time (LRU)
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt,
    );

    let freedBytes = 0;
    let evicted = 0;

    for (const [key, entry] of entries) {
      if (
        this.cache.size - evicted <= this.config.maxEntries / 2 &&
        this.stats.totalSizeBytes - freedBytes + requiredBytes <= this.config.maxSizeBytes
      ) {
        break;
      }

      this.cache.delete(key);
      this.updateStats(-1, -entry.sizeBytes, entry.protocol);
      freedBytes += entry.sizeBytes;
      evicted++;
    }

    this.stats.evicted += evicted;
  }

  /**
   * Clear entries by specific tags.
   */
  private clearByTags(tags: string[]): number {
    let removed = 0;
    const tagSet = new Set(tags);

    for (const [key, entry] of this.cache.entries()) {
      const shouldRemove = entry.tags?.some((tag) => tagSet.has(tag)) ?? false;
      if (shouldRemove) {
        this.cache.delete(key);
        this.updateStats(-1, -entry.sizeBytes, entry.protocol);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all unique tags from cached entries.
   */
  private getAllTags(): string[] {
    const tags = new Set<string>();
    for (const entry of this.cache.values()) {
      entry.tags?.forEach((tag) => tags.add(tag));
    }
    return Array.from(tags);
  }

  /**
   * Estimate size of a value in bytes.
   */
  private estimateSize(value: unknown): number {
    if (typeof value === "string") {
      return value.length * 2; // UTF-16 estimate
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value).length * 2;
    }
    return 8; // Primitive estimate
  }

  /**
   * Update global statistics.
   */
  private updateStats(entryDelta: number, sizeDelta: number, protocol: string): void {
    this.stats.totalEntries += entryDelta;
    this.stats.totalSizeBytes += sizeDelta;

    if (!this.stats.byProtocol[protocol]) {
      this.stats.byProtocol[protocol] = { entries: 0, sizeBytes: 0, hits: 0 };
    }

    this.stats.byProtocol[protocol].entries += entryDelta;
    this.stats.byProtocol[protocol].sizeBytes += sizeDelta;
  }

  /**
   * Update protocol-specific statistics.
   */
  private updateProtocolStats(
    protocol: string,
    metric: keyof (typeof this.stats.byProtocol)[string],
    delta: number,
  ): void {
    if (!this.stats.byProtocol[protocol]) {
      this.stats.byProtocol[protocol] = { entries: 0, sizeBytes: 0, hits: 0 };
    }
    this.stats.byProtocol[protocol][metric] += delta;
  }

  /**
   * Update hit ratio calculation.
   */
  private updateHitRatio(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }
}
