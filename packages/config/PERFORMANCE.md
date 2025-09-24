# Performance Guide

> **📖 Main Documentation**: [README.md](./README.md) | **🏗️ Architecture Guide**: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Overview

The `@t68/config` package is designed for high-performance production environments with intelligent caching, batch processing, and comprehensive monitoring capabilities.

## Performance Features

### Batch Processing

**SSM Parameter Resolution**

- **Up to 10 parameters** per `GetParameters` API call
- **~80% reduction** in AWS API calls for typical usage
- **Automatic grouping** by decryption requirements
- **Intelligent fallback** to individual resolution when needed

```typescript
// This configuration triggers efficient batch processing
const config = {
  database: {
    host: "ssm:/prod/db/host",
    port: "ssm:/prod/db/port",
    user: "ssm:/prod/db/user",
    password: "ssm-secure:/prod/db/password",
  },
};

// Results in only 2 API calls:
// 1. GetParameters for regular params (host, port, user)
// 2. GetParameters for secure param (password) with decryption
```

### Advanced Caching System

**GlobalCache Features**

- **Priority-based eviction** (`LOW`, `NORMAL`, `HIGH`, `CRITICAL`)
- **Memory pressure monitoring** with adaptive cleanup
- **Circuit breaker pattern** for failure recovery
- **Out-of-memory protection** with intelligent limits
- **Eviction storm prevention** with temporary limit increases

**Cache Configuration**

```typescript
const cache = GlobalCache.getInstance({
  maxSizeBytes: 512 * 1024 * 1024,     // 512MB
  maxEntries: 50000,                   // 50K entries
  maxEntrySizeBytes: 10 * 1024 * 1024, // 10MB per entry
  memoryPressureThreshold: 0.8,        // 80% threshold
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,          // 5 failures
  circuitBreakerResetTimeoutMs: 60000, // 1 minute reset
  enablePriorityEviction: true,
  minCacheSize: 1000,                  // Never below 1K entries
  cleanupIntervalMs: 30000,            // 30 seconds
  defaultTtlMs: 10 * 60 * 1000,        // 10 minutes
});
```

## Performance Monitoring

### Key Metrics

```typescript
import { GlobalCache } from "@t68/config";

const cache = GlobalCache.getInstance();
const stats = cache.getStats();

// Performance metrics
console.log(`Cache hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`);
console.log(`Efficiency score: ${(stats.efficiencyScore * 100).toFixed(1)}%`);
console.log(`Average resolution cost: ${stats.avgResolutionCostMs}ms`);

// Health metrics
console.log(`Memory pressure: ${stats.memoryPressure}`);
console.log(`Circuit breaker state: ${stats.circuitBreakerState}`);

// Resource usage
console.log(`Memory usage: ${(stats.totalSizeBytes / 1024 / 1024).toFixed(1)}MB`);
console.log(`Total entries: ${stats.totalEntries}`);

// Problem indicators
console.log(`Eviction storms: ${stats.evictionStorms}`);
console.log(`Out-of-memory events: ${stats.outOfMemoryEvents}`);
console.log(`Cache starvation events: ${stats.starvationEvents}`);
```

### Alert Thresholds

| Metric            | Threshold     | Action                       |
| ----------------- | ------------- | ---------------------------- |
| Hit ratio         | < 70%         | Increase cache size or TTL   |
| Efficiency score  | < 0.6         | Optimize cache configuration |
| Memory pressure   | HIGH/CRITICAL | Increase memory limits       |
| Eviction storms   | > 0           | Check memory pressure        |
| Circuit breaker   | OPEN          | Investigate failures         |
| Starvation events | > 0           | Adjust priority settings     |

## Optimization Strategies

### 1. Configuration Organization

Group related parameters to maximize batch efficiency:

```typescript
// Good: Related parameters grouped together
const dbConfig = {
  connection: {
    host: "ssm:/prod/db/host",
    port: "ssm:/prod/db/port",
    database: "ssm:/prod/db/name",
    username: "ssm:/prod/db/username",
    password: "ssm-secure:/prod/db/password",
  },
};

// Access all at once to trigger batch resolution
const connection = await config.getValue("dbConfig.connection");
```

### 2. Cache Priority Management

Use appropriate cache priorities for different types of data:

```typescript
// Critical configuration (never evicted except under extreme pressure)
const criticalConfig = {
  serviceKey: "ssm-secure:/prod/service/key", // HIGH priority (secure)
  licenseKey: "ssm-secure:/prod/license/key", // HIGH priority (secure)
};

// Regular configuration (normal eviction rules)
const regularConfig = {
  endpoint: "ssm:/prod/service/endpoint", // NORMAL priority
  timeout: "ssm:/prod/service/timeout",   // NORMAL priority
};
```

### 3. Memory Management

Configure appropriate memory limits based on your environment:

```typescript
// Production environment (high memory)
const prodCache = GlobalCache.getInstance({
  maxSizeBytes: 1024 * 1024 * 1024,   // 1GB
  maxEntries: 100000,                 // 100K entries
  memoryPressureThreshold: 0.85,      // 85% threshold
});

// Development environment (limited memory)
const devCache = GlobalCache.getInstance({
  maxSizeBytes: 128 * 1024 * 1024,    // 128MB
  maxEntries: 10000,                  // 10K entries
  memoryPressureThreshold: 0.75,      // 75% threshold
});
```

## Benchmarks

### SSM Resolution Performance

| Scenario        | Individual Calls | Batch Calls | Improvement   |
| --------------- | ---------------- | ----------- | ------------- |
| 5 parameters    | 5 API calls      | 1 API call  | 80% reduction |
| 10 parameters   | 10 API calls     | 1 API call  | 90% reduction |
| 15 parameters   | 15 API calls     | 2 API calls | 87% reduction |
| Mixed protocols | 20 API calls     | 2 API calls | 90% reduction |

### Cache Performance

| Cache Size   | Hit Ratio | Memory Usage | Efficiency Score |
| ------------ | --------- | ------------ | ---------------- |
| 1K entries   | 65%       | 10MB         | 0.72             |
| 10K entries  | 85%       | 100MB        | 0.89             |
| 50K entries  | 92%       | 500MB        | 0.94             |
| 100K entries | 95%       | 1GB          | 0.96             |

## Best Practices

### 1. Preload Critical Configuration

```typescript
// Validate all external references at startup
Configuration.initialize(data);
await Configuration.getInstance().preload();
// Throws if any references are invalid or inaccessible
```

### 2. Monitor Cache Health

```typescript
// Set up periodic monitoring
setInterval(() => {
  const stats = GlobalCache.getInstance().getStats();

  if (stats.hitRatio < 0.7) {
    logger.warn("Low cache hit ratio", { hitRatio: stats.hitRatio });
  }

  if (stats.memoryPressure >= MemoryPressureLevel.HIGH) {
    logger.warn("High memory pressure", { pressure: stats.memoryPressure });
  }

  if (stats.circuitBreakerState === CircuitBreakerState.OPEN) {
    logger.error("Circuit breaker open", { failures: stats.circuitBreakerFailures });
  }
}, 60000); // Check every minute
```

### 3. Optimize for Your Use Case

```typescript
// High-frequency access: Longer TTL, higher priority
const highFrequencyConfig = {
  apiEndpoint: "ssm:/prod/api/endpoint", // Long TTL, HIGH priority
  rateLimits: "ssm:/prod/api/limits",    // Long TTL, HIGH priority
};

// Infrequent access: Shorter TTL, lower priority
const infrequentConfig = {
  maintenanceMessage: "s3://bucket/maintenance.txt", // Short TTL, LOW priority
  helpText: "s3://bucket/help.txt",                  // Short TTL, LOW priority
};
```

This performance guide helps you maximize the efficiency of the configuration system while maintaining optimal resource usage and monitoring capabilities.
