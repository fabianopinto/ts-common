/**
 * @fileoverview Tests for ResolutionEngine.
 *
 * Covers batch processing, caching, statistics, recursive resolution,
 * and optimization features of the resolution engine.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import { ResolutionEngine } from "../../src/resolvers/resolution-engine.js";
import type { ConfigResolver, ResolverRegistry } from "../../src/resolvers/base.js";
import { createTestLogger } from "../__fixtures__/test-helpers.js";

describe("ResolutionEngine", () => {
  let engine: ResolutionEngine;
  let registry: ResolverRegistry;
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(() => {
    logger = createTestLogger();
    registry = createMockRegistry();
    engine = new ResolutionEngine(registry, logger);
  });

  describe("initialization", () => {
    it("should initialize with empty statistics", () => {
      const stats = engine.getStats();

      expect(stats.totalReferences).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.batchOperations).toBe(0);
      expect(stats.individualResolutions).toBe(0);
      expect(stats.totalTimeMs).toBe(0);
      expect(stats.byProtocol).toEqual({});
    });

    it("should reset statistics", () => {
      // Simulate some activity by resolving something
      engine.resolve("test-value", { external: false });

      engine.resetStats();
      const stats = engine.getStats();

      expect(stats.totalReferences).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.batchOperations).toBe(0);
      expect(stats.individualResolutions).toBe(0);
      expect(stats.totalTimeMs).toBe(0);
      expect(stats.byProtocol).toEqual({});
    });
  });

  describe("basic resolution", () => {
    it("should return non-external values unchanged", async () => {
      const value = "plain-string";
      const result = await engine.resolve(value, { external: true });

      expect(result).toBe(value);
    });

    it("should return values unchanged when external resolution disabled", async () => {
      const value = "ssm://parameter";
      const result = await engine.resolve(value, { external: false });

      expect(result).toBe(value);
    });

    it("should resolve simple external reference", async () => {
      const result = await engine.resolve("ssm://test-param", {
        external: true,
        resolvers: { ssm: true },
      });

      expect(result).toBe("resolved-ssm-value");

      const stats = engine.getStats();
      expect(stats.totalReferences).toBe(1);
      expect(stats.individualResolutions).toBe(1);
    });

    it("should skip disabled resolvers", async () => {
      const result = await engine.resolve("ssm://test-param", {
        external: true,
        resolvers: { ssm: false },
      });

      expect(result).toBe("ssm://test-param"); // Unchanged
    });

    it("should handle unknown protocols", async () => {
      const result = await engine.resolve("unknown://reference", {
        external: true,
      });

      expect(result).toBe("unknown://reference"); // Unchanged
    });

    it("should default external to true when undefined", async () => {
      const result = await engine.resolve("ssm://test-param", {
        resolvers: { ssm: true },
        // external is undefined, should default to true
      });

      expect(result).toBe("resolved-ssm-value");

      const stats = engine.getStats();
      expect(stats.totalReferences).toBe(1);
      expect(stats.individualResolutions).toBe(1);
    });
  });

  describe("batch resolution", () => {
    it("should use batch resolution for supported resolvers", async () => {
      const config = {
        param1: "batch://param1",
        param2: "batch://param2",
        param3: "batch://param3",
      };

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { batch: true },
      });

      expect(result).toEqual({
        param1: "batch-resolved-param1",
        param2: "batch-resolved-param2",
        param3: "batch-resolved-param3",
      });

      const stats = engine.getStats();
      expect(stats.totalReferences).toBe(3);
      expect(stats.batchOperations).toBe(1);
      expect(stats.individualResolutions).toBe(0);
      expect(stats.cacheHits).toBe(3); // All resolved from batch cache
    });

    it("should handle mixed batch and individual resolvers", async () => {
      const config = {
        batchParam: "batch://param1",
        ssmParam: "ssm://param2",
      };

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { batch: true, ssm: true },
      });

      expect(result).toEqual({
        batchParam: "batch-resolved-param1",
        ssmParam: "resolved-ssm-value",
      });

      const stats = engine.getStats();
      expect(stats.totalReferences).toBe(2);
      expect(stats.batchOperations).toBe(1);
      expect(stats.individualResolutions).toBe(1);
    });

    it("should handle batch resolution errors", async () => {
      const mockResolver = createMockResolver("batch-error", true);

      // Use async implementation to avoid unhandled rejection
      mockResolver.resolveBatch.mockImplementation(async () => {
        throw new Error("Batch resolution failed");
      });
      registry.getResolver = vi.fn().mockReturnValue(mockResolver);

      const config = {
        param1: "batch-error://param1",
        param2: "batch-error://param2",
      };

      await expect(
        engine.resolve(config, {
          external: true,
          resolvers: { "batch-error": true },
        }),
      ).rejects.toThrow("Batch resolution failed");

      const stats = engine.getStats();
      // Failed batch operations are not counted in batchOperations stat
      expect(stats.batchOperations).toBe(0);
      expect(stats.totalReferences).toBe(2);
    });
  });

  describe("recursive resolution", () => {
    it("should resolve nested objects", async () => {
      const config = {
        database: {
          host: "ssm://db-host",
          port: 5432,
          credentials: {
            username: "ssm://db-user",
            password: "ssm://db-pass",
          },
        },
        app: {
          name: "test-app",
        },
      };

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true },
      });

      expect(result).toEqual({
        database: {
          host: "resolved-ssm-value",
          port: 5432,
          credentials: {
            username: "resolved-ssm-value",
            password: "resolved-ssm-value",
          },
        },
        app: {
          name: "test-app",
        },
      });

      const stats = engine.getStats();
      expect(stats.totalReferences).toBe(3);
      expect(stats.individualResolutions).toBe(3);
    });

    it("should resolve arrays", async () => {
      const config = [
        "ssm://param1",
        "plain-value",
        "ssm://param2",
        {
          nested: "ssm://param3",
        },
      ];

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true },
      });

      expect(result).toEqual([
        "resolved-ssm-value",
        "plain-value",
        "resolved-ssm-value",
        {
          nested: "resolved-ssm-value",
        },
      ]);

      const stats = engine.getStats();
      expect(stats.totalReferences).toBe(3);
    });

    it("should handle deeply nested structures", async () => {
      const config = {
        level1: {
          level2: {
            level3: {
              level4: ["ssm://deep-param"],
            },
          },
        },
      };

      const result = (await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true },
      })) as any;

      expect(result.level1.level2.level3.level4[0]).toBe("resolved-ssm-value");
    });
  });

  describe("caching", () => {
    it("should cache identical references within same resolution", async () => {
      const config = {
        param1: "batch://same-param",
        param2: "batch://same-param",
        param3: "batch://same-param",
      };

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { batch: true },
      });

      expect(result).toEqual({
        param1: "batch-resolved-same-param",
        param2: "batch-resolved-same-param",
        param3: "batch-resolved-same-param",
      });

      // Batch resolver should group identical references and cache results
      const stats = engine.getStats();
      expect(stats.totalReferences).toBe(3);
      expect(stats.batchOperations).toBe(1);
      expect(stats.cacheHits).toBe(3); // All resolved from batch cache
    });

    it("should not cache across different resolution calls", async () => {
      await engine.resolve("ssm://param", { external: true, resolvers: { ssm: true } });
      await engine.resolve("ssm://param", { external: true, resolvers: { ssm: true } });

      const stats = engine.getStats();
      expect(stats.individualResolutions).toBe(2);
      expect(stats.cacheHits).toBe(0); // No cross-call caching
    });
  });

  describe("resolver options", () => {
    it("should pass resolver-specific options", async () => {
      const mockResolver = createMockResolver("custom", false);
      registry.getResolver = vi.fn().mockReturnValue(mockResolver);

      await engine.resolve("custom://param", {
        external: true,
        resolvers: {
          custom: {
            option1: "value1",
            option2: true,
          },
        },
      });

      expect(mockResolver.resolve).toHaveBeenCalledWith(
        "custom://param",
        { option1: "value1", option2: true },
        logger,
      );
    });

    it("should handle boolean resolver options", async () => {
      const mockResolver = createMockResolver("custom", false);
      registry.getResolver = vi.fn().mockReturnValue(mockResolver);

      await engine.resolve("custom://param", {
        external: true,
        resolvers: { custom: true },
      });

      expect(mockResolver.resolve).toHaveBeenCalledWith("custom://param", {}, logger);
    });
  });

  describe("error handling", () => {
    it("should handle individual resolution errors", async () => {
      const mockResolver = createMockResolver("error", false);
      mockResolver.resolve.mockRejectedValue(new Error("Resolution failed"));
      registry.getResolver = vi.fn().mockReturnValue(mockResolver);

      await expect(
        engine.resolve("error://param", {
          external: true,
          resolvers: { error: true },
        }),
      ).rejects.toThrow("Resolution failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          reference: "error://param",
          protocol: "error",
        }),
        "Individual resolution failed",
      );
    });

    it("should handle batch resolution errors gracefully", async () => {
      const mockResolver = createMockResolver("batch-error", true);
      mockResolver.resolveBatch.mockRejectedValue(new Error("Batch resolution failed"));
      registry.getResolver = vi.fn().mockReturnValue(mockResolver);

      const config = {
        param1: "batch-error://param1",
        param2: "batch-error://param2",
      };

      await expect(
        engine.resolve(config, {
          external: true,
          resolvers: { "batch-error": true },
        }),
      ).rejects.toThrow("Batch resolution failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          protocol: "batch-error",
          count: 2,
        }),
        "Batch resolution failed",
      );
    });

    it("should handle individual errors in batch results", async () => {
      const mockResolver = createMockResolver("batch-mixed", true);

      // Mock batch resolver to return mixed success/error results
      mockResolver.resolveBatch.mockImplementation(async (requests) => {
        return requests.map((req, index) => {
          if (index === 0) {
            return {
              reference: req.reference,
              value: "batch-mixed-resolved-param1",
            };
          } else {
            return {
              reference: req.reference,
              error: new Error(`Failed to resolve ${req.reference}`),
            };
          }
        });
      });

      registry.getResolver = vi.fn().mockReturnValue(mockResolver);

      const config = {
        param1: "batch-mixed://param1", // This will succeed
        param2: "batch-mixed://param2", // This will have an error
      };

      // The resolution should fail when trying to access the cached error
      await expect(
        engine.resolve(config, {
          external: true,
          resolvers: { "batch-mixed": true },
        }),
      ).rejects.toThrow("Failed to resolve batch-mixed://param2");

      const stats = engine.getStats();
      expect(stats.batchOperations).toBe(1); // Batch operation succeeded
      expect(stats.totalReferences).toBe(2); // Both references were processed
    });

    it("should skip batch protocols with zero requests", async () => {
      const mockResolver = createMockResolver("empty-batch", true);

      // Track if resolveBatch was called
      const resolveBatchSpy = vi.spyOn(mockResolver, "resolveBatch");

      registry.getResolver = vi.fn().mockImplementation((protocol) => {
        if (protocol === "empty-batch") return mockResolver;
        return null; // No resolver for other protocols
      });

      // Mock the executeBatchOperations method to simulate empty requests
      const originalExecuteBatchOperations = (engine as any).executeBatchOperations;
      (engine as any).executeBatchOperations = vi.fn().mockImplementation(async (context) => {
        // Add a protocol with empty requests array to simulate the scenario
        context.batchRequests.set("empty-batch", []);

        // Call the original method which should skip the empty protocol
        return originalExecuteBatchOperations.call(engine, context);
      });

      const result = await engine.resolve("plain-value", {
        external: true,
        resolvers: { "empty-batch": true },
      });

      // Should return unchanged since it's not an external reference
      expect(result).toBe("plain-value");

      // resolveBatch should not have been called due to zero requests
      expect(resolveBatchSpy).not.toHaveBeenCalled();

      const stats = engine.getStats();
      expect(stats.batchOperations).toBe(0); // No batch operations executed

      // Restore original method
      (engine as any).executeBatchOperations = originalExecuteBatchOperations;
    });

    it("should skip resolvers that don't support batch operations", async () => {
      // Create a resolver that doesn't support batch operations
      const nonBatchResolver = createMockResolver("non-batch", false);

      // Track if resolveBatch was called (it shouldn't exist)
      expect(nonBatchResolver.resolveBatch).toBeUndefined();

      registry.getResolver = vi.fn().mockImplementation((protocol) => {
        if (protocol === "non-batch") return nonBatchResolver;
        return null;
      });

      // Mock executeBatchOperations to add requests for non-batch protocol
      const originalExecuteBatchOperations = (engine as any).executeBatchOperations;
      (engine as any).executeBatchOperations = vi.fn().mockImplementation(async (context) => {
        // Add requests for a protocol that doesn't support batching
        context.batchRequests.set("non-batch", [
          { reference: "non-batch://param1", options: {} },
          { reference: "non-batch://param2", options: {} },
        ]);

        // Call the original method which should skip the non-batch protocol
        return originalExecuteBatchOperations.call(engine, context);
      });

      const result = await engine.resolve("plain-value", {
        external: true,
        resolvers: { "non-batch": true },
      });

      expect(result).toBe("plain-value");

      const stats = engine.getStats();
      expect(stats.batchOperations).toBe(0); // No batch operations executed

      // Restore original method
      (engine as any).executeBatchOperations = originalExecuteBatchOperations;
    });

    it("should skip protocols with no resolver", async () => {
      registry.getResolver = vi.fn().mockReturnValue(null); // No resolver found

      // Mock executeBatchOperations to add requests for unknown protocol
      const originalExecuteBatchOperations = (engine as any).executeBatchOperations;
      (engine as any).executeBatchOperations = vi.fn().mockImplementation(async (context) => {
        // Add requests for a protocol with no resolver
        context.batchRequests.set("unknown", [
          { reference: "unknown://param1", options: {} },
          { reference: "unknown://param2", options: {} },
        ]);

        // Call the original method which should skip the unknown protocol
        return originalExecuteBatchOperations.call(engine, context);
      });

      const result = await engine.resolve("plain-value", {
        external: true,
        resolvers: { unknown: true },
      });

      expect(result).toBe("plain-value");

      const stats = engine.getStats();
      expect(stats.batchOperations).toBe(0); // No batch operations executed

      // Restore original method
      (engine as any).executeBatchOperations = originalExecuteBatchOperations;
    });

    it("should handle general resolution engine errors", async () => {
      // Force an error by making registry throw
      registry.getResolver = vi.fn().mockImplementation(() => {
        throw new Error("Registry error");
      });

      await expect(
        engine.resolve("ssm://param", {
          external: true,
          resolvers: { ssm: true },
        }),
      ).rejects.toThrow("Registry error");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        }),
        "Resolution engine failed",
      );
    });
  });

  describe("statistics", () => {
    it("should track protocol-specific statistics", async () => {
      const config = {
        ssmParam: "ssm://param1",
        batchParam1: "batch://param1",
        batchParam2: "batch://param2",
      };

      await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true, batch: true },
      });

      const stats = engine.getStats();

      expect(stats.byProtocol.ssm).toEqual({
        count: 1,
        timeMs: expect.any(Number),
      });

      expect(stats.byProtocol.batch).toEqual({
        count: 2,
        timeMs: expect.any(Number),
      });
    });

    it("should track timing information", async () => {
      await engine.resolve("ssm://param", {
        external: true,
        resolvers: { ssm: true },
      });

      const stats = engine.getStats();
      expect(stats.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should provide immutable statistics", () => {
      const stats1 = engine.getStats();
      const stats2 = engine.getStats();

      expect(stats1).not.toBe(stats2); // Different objects
      expect(stats1).toEqual(stats2); // Same content
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined values", async () => {
      const config = {
        nullValue: null,
        undefinedValue: undefined,
        param: "ssm://param",
      };

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true },
      });

      expect(result).toEqual({
        nullValue: null,
        undefinedValue: undefined,
        param: "resolved-ssm-value",
      });
    });

    it("should handle empty objects and arrays", async () => {
      const config = {
        emptyObject: {},
        emptyArray: [],
        param: "ssm://param",
      };

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true },
      });

      expect(result).toEqual({
        emptyObject: {},
        emptyArray: [],
        param: "resolved-ssm-value",
      });
    });

    it("should handle malformed external references", async () => {
      const config = {
        malformed1: "://no-protocol",
        malformed2: "protocol-only:",
        valid: "ssm://param",
      };

      const result = await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true },
      });

      expect(result).toEqual({
        malformed1: "://no-protocol", // Unchanged
        malformed2: "protocol-only:", // Unchanged
        valid: "resolved-ssm-value",
      });
    });

    it("should handle protocol extraction edge case", async () => {
      // Create a custom resolver that bypasses isExternalReference check
      const mockResolver = createMockResolver("test", false);
      registry.getResolver = vi.fn().mockReturnValue(mockResolver);

      // Directly test the collectReferences method by mocking isExternalReference
      const baseModule = await import("../../src/resolvers/base.js");
      const originalIsExternalReference = baseModule.isExternalReference;

      // Mock isExternalReference to return true for our test case
      vi.spyOn(baseModule, "isExternalReference").mockReturnValue(true);

      // Mock extractProtocol to return null when called from collectReferences
      vi.spyOn(baseModule, "extractProtocol").mockReturnValue(null);

      const result = await engine.resolve("edge-case-reference", {
        external: true,
        resolvers: { test: true },
      });

      // Should return unchanged since protocol extraction returned null
      expect(result).toBe("edge-case-reference");

      // Restore original functions
      vi.restoreAllMocks();
    });

    it("should handle large nested structures", async () => {
      const config = {
        items: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          param: `ssm://param-${i}`,
        })),
      };

      const result = (await engine.resolve(config, {
        external: true,
        resolvers: { ssm: true },
      })) as any;

      expect(result.items).toHaveLength(10);
      expect(result.items[0].param).toBe("resolved-ssm-value");
      expect(result.items[9].param).toBe("resolved-ssm-value");
    });
  });
});

/**
 * Create a mock resolver registry for testing.
 *
 * @returns A mock resolver registry with predefined resolvers.
 */
function createMockRegistry(): ResolverRegistry {
  const resolvers = new Map<string, ConfigResolver>();

  // SSM resolver (individual only)
  resolvers.set("ssm", createMockResolver("ssm", false));

  // Batch resolver (supports batching)
  resolvers.set("batch", createMockResolver("batch", true));

  // Batch error resolver (supports batching but fails)
  const batchErrorResolver = createMockResolver("batch-error", true);
  // Don't set up rejection here - will be set up in individual tests
  resolvers.set("batch-error", batchErrorResolver);

  return {
    register: vi.fn(),
    unregister: vi.fn(),
    getResolver: vi.fn().mockImplementation((protocol: string) => resolvers.get(protocol)),
    getProtocols: vi.fn().mockReturnValue(Array.from(resolvers.keys())),
    canResolve: vi.fn().mockReturnValue(true),
    cleanup: vi.fn(),
  };
}

/**
 * Create a mock resolver for testing.
 *
 * @param protocol - The protocol for the mock resolver.
 * @param supportsBatch - Whether the resolver supports batch operations.
 * @returns A mock resolver with all required methods and properties.
 */
function createMockResolver(
  protocol: string,
  supportsBatch: boolean,
): ConfigResolver & {
  initialize: ReturnType<typeof vi.fn>;
  validateReference: ReturnType<typeof vi.fn>;
  resolve: ReturnType<typeof vi.fn>;
  cleanup: ReturnType<typeof vi.fn>;
  resolveBatch?: ReturnType<typeof vi.fn>;
} {
  const resolver = {
    protocol,
    defaultOptions: {},
    supportsBatch,
    initialize: vi.fn().mockResolvedValue(undefined),
    validateReference: vi.fn().mockReturnValue(true),
    resolve: vi.fn().mockImplementation((reference: string) => {
      if (protocol === "ssm") return Promise.resolve("resolved-ssm-value");
      return Promise.resolve(`resolved-${protocol}-value`);
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };

  if (supportsBatch) {
    (resolver as any).resolveBatch = vi.fn().mockImplementation((requests) => {
      return Promise.resolve(
        requests.map((req) => ({
          reference: req.reference,
          value: `${protocol}-resolved-${req.reference.split("://")[1]}`,
        })),
      );
    });
  }

  return resolver as ConfigResolver & {
    initialize: ReturnType<typeof vi.fn>;
    validateReference: ReturnType<typeof vi.fn>;
    resolve: ReturnType<typeof vi.fn>;
    cleanup: ReturnType<typeof vi.fn>;
    resolveBatch?: ReturnType<typeof vi.fn>;
  };
}
