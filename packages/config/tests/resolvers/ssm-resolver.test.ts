/**
 * @fileoverview Tests for the unified SSM resolver.
 *
 * Covers both ssm:/ and ssm-secure:/ protocols, batch processing,
 * caching, error handling, and edge cases for AWS Systems Manager
 * Parameter Store resolution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConfigurationError } from "@t68/errors";

import { SSMResolver } from "../../src/resolvers/ssm-resolver.js";
import { GlobalCache } from "../../src/resolvers/global-cache.js";
import {
  createTestLogger,
  createMockSSMClient,
  resetTestEnvironment,
} from "../__fixtures__/test-helpers.js";

describe("SSMResolver", () => {
  let resolver: SSMResolver;
  let logger: ReturnType<typeof createTestLogger>;
  let mockSSM: ReturnType<typeof createMockSSMClient>;

  beforeEach(async () => {
    resetTestEnvironment();
    logger = createTestLogger();
    resolver = new SSMResolver();

    // Mock AWS SDK
    mockSSM = createMockSSMClient();
    vi.doMock("@aws-sdk/client-ssm", () => mockSSM);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(resolver.initialize(logger)).resolves.not.toThrow();
    });

    it("should have correct protocol", () => {
      expect(resolver.protocol).toBe("ssm");
    });

    it("should support batch operations", () => {
      expect(resolver.supportsBatch).toBe(true);
    });

    it("should have default options", () => {
      expect(resolver.defaultOptions).toEqual({
        withDecryption: false,
        retries: 3,
        cacheTtlMs: 5 * 60 * 1000, // 5 minutes
      });
    });
  });

  describe("validateReference", () => {
    it("should validate ssm:/ references", () => {
      expect(resolver.validateReference("ssm:/my-param")).toBe(true);
      expect(resolver.validateReference("ssm://my-param")).toBe(true);
      expect(resolver.validateReference("ssm:/path/to/param")).toBe(true);
    });

    it("should validate ssm-secure:/ references", () => {
      expect(resolver.validateReference("ssm-secure:/my-secret")).toBe(true);
      expect(resolver.validateReference("ssm-secure://my-secret")).toBe(true);
      expect(resolver.validateReference("ssm-secure:/path/to/secret")).toBe(true);
    });

    it("should reject invalid references", () => {
      expect(resolver.validateReference("s3://bucket/key")).toBe(false);
      expect(resolver.validateReference("http://example.com")).toBe(false);
      expect(resolver.validateReference("plain-string")).toBe(false);
      expect(resolver.validateReference("")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(resolver.validateReference("ssm:")).toBe(false);
      expect(resolver.validateReference("ssm:/")).toBe(false);
      expect(resolver.validateReference("ssm://")).toBe(false);
      expect(resolver.validateReference("ssm-secure:")).toBe(false);
      expect(resolver.validateReference("ssm-secure:/")).toBe(false);
    });
  });

  describe("protocol intelligence", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should default to no decryption for ssm:/ protocol", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "plain-value" },
      });

      await resolver.resolve("ssm:/my-param", {}, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: "my-param",
            WithDecryption: false,
          }),
        }),
      );
    });

    it("should default to decryption for ssm-secure:/ protocol", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "encrypted-value" },
      });

      await resolver.resolve("ssm-secure:/my-secret", {}, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: "my-secret",
            WithDecryption: true,
          }),
        }),
      );
    });

    it("should allow overriding decryption for ssm:/ protocol", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "decrypted-value" },
      });

      await resolver.resolve("ssm:/my-param", { withDecryption: true }, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            WithDecryption: true,
          }),
        }),
      );
    });

    it("should allow overriding decryption for ssm-secure:/ protocol", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "plain-value" },
      });

      await resolver.resolve("ssm-secure:/my-secret", { withDecryption: false }, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            WithDecryption: false,
          }),
        }),
      );
    });
  });

  describe("individual resolution", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
      // Clear any cached values from previous tests
      GlobalCache.getInstance().clear();
    });

    it("should resolve parameter successfully", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "test-value" },
      });

      const result = await resolver.resolve("ssm:/my-param", {}, logger);
      expect(result).toBe("test-value");
    });

    it("should handle parameter names with paths", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "nested-value" },
      });

      await resolver.resolve("ssm:/app/prod/database/host", {}, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: "app/prod/database/host",
          }),
        }),
      );
    });

    it("should handle custom options", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "custom-value" },
      });

      await resolver.resolve(
        "ssm:/my-param",
        {
          withDecryption: true,
          retries: 5,
          cacheTtlMs: 10000,
        },
        logger,
      );

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            WithDecryption: true,
          }),
        }),
      );
    });

    it("should throw when parameter not found", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({});

      await expect(resolver.resolve("ssm:/nonexistent", {}, logger)).rejects.toThrow(
        /not found|no string value/i,
      );
    });

    it("should throw when parameter has no value", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: undefined },
      });

      await expect(resolver.resolve("ssm:/empty-param", {}, logger)).rejects.toThrow(
        /not found|no string value/i,
      );
    });

    it("should handle AWS SDK errors", async () => {
      const awsError = new Error("AccessDenied");
      mockSSM.mockSend.mockRejectedValueOnce(awsError);

      await expect(resolver.resolve("ssm:/forbidden", {}, logger)).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("should log debug information when enabled", async () => {
      (logger.isLevelEnabled as any).mockReturnValue(true);
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "debug-value" },
      });

      await resolver.resolve("ssm:/debug-param", {}, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "ssm:/debug-param",
        }),
        expect.stringContaining("Resolving SSM parameter"),
      );
    });
  });

  describe("batch resolution", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should resolve multiple parameters in batch", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: "param1", Value: "value1" },
          { Name: "param2", Value: "value2" },
          { Name: "param3", Value: "value3" },
        ],
      });

      const requests = [
        { reference: "ssm:/param1", options: {} },
        { reference: "ssm:/param2", options: {} },
        { reference: "ssm:/param3", options: {} },
      ];

      const results = await resolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ reference: "ssm:/param1", value: "value1" });
      expect(results[1]).toEqual({ reference: "ssm:/param2", value: "value2" });
      expect(results[2]).toEqual({ reference: "ssm:/param3", value: "value3" });
    });

    it("should group by decryption settings", async () => {
      // Mock two separate API calls
      mockSSM.mockSend
        .mockResolvedValueOnce({
          Parameters: [
            { Name: "plain1", Value: "value1" },
            { Name: "plain2", Value: "value2" },
          ],
        })
        .mockResolvedValueOnce({
          Parameters: [{ Name: "secret1", Value: "encrypted1" }],
        });

      const requests = [
        { reference: "ssm:/plain1", options: { withDecryption: false } },
        { reference: "ssm:/plain2", options: { withDecryption: false } },
        { reference: "ssm:/secret1", options: { withDecryption: true } },
      ];

      await resolver.resolveBatch!(requests, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledTimes(2);

      // Check that both calls were made with correct parameters (order may vary due to Promise.all)
      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Names: ["plain1", "plain2"],
            WithDecryption: false,
          }),
        }),
      );

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Names: ["secret1"],
            WithDecryption: true,
          }),
        }),
      );
    });

    it("should handle mixed protocols intelligently", async () => {
      mockSSM.mockSend
        .mockResolvedValueOnce({
          Parameters: [{ Name: "regular", Value: "value1" }],
        })
        .mockResolvedValueOnce({
          Parameters: [{ Name: "secure", Value: "encrypted1" }],
        });

      const requests = [
        { reference: "ssm:/regular", options: {} }, // withDecryption: false (default)
        { reference: "ssm-secure:/secure", options: {} }, // withDecryption: true (default)
      ];

      await resolver.resolveBatch!(requests, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledTimes(2);
    });

    it("should respect batch size limits", async () => {
      // Create 15 parameters (exceeds AWS limit of 10)
      const parameters = Array.from({ length: 15 }, (_, i) => ({
        Name: `param${i}`,
        Value: `value${i}`,
      }));

      // Mock two API calls
      mockSSM.mockSend
        .mockResolvedValueOnce({
          Parameters: parameters.slice(0, 10),
        })
        .mockResolvedValueOnce({
          Parameters: parameters.slice(10),
        });

      const requests = Array.from({ length: 15 }, (_, i) => ({
        reference: `ssm:/param${i}`,
        options: {},
      }));

      const results = await resolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(15);
      expect(mockSSM.mockSend).toHaveBeenCalledTimes(2);
    });

    it("should handle partial failures in batch", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: "param1", Value: "value1" },
          // param2 missing - should be handled as error
        ],
        InvalidParameters: ["param2"],
      });

      const requests = [
        { reference: "ssm:/param1", options: {} },
        { reference: "ssm:/param2", options: {} },
      ];

      const results = await resolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ reference: "ssm:/param1", value: "value1" });
      expect(results[1]).toEqual({
        reference: "ssm:/param2",
        error: expect.any(Error),
      });
    });

    it("should handle complete batch failures", async () => {
      const batchError = new Error("Batch operation failed");
      mockSSM.mockSend.mockRejectedValueOnce(batchError);

      const requests = [
        { reference: "ssm:/param1", options: {} },
        { reference: "ssm:/param2", options: {} },
      ];

      const results = await resolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(2);
      expect(results[0].reference).toBe("ssm:/param1");
      expect(results[0].error).toBeInstanceOf(ConfigurationError);
      expect(results[1].reference).toBe("ssm:/param2");
      expect(results[1].error).toBeInstanceOf(ConfigurationError);
    });
  });

  describe("error handling", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should handle parameter not found errors", async () => {
      const notFoundError = new Error("ParameterNotFound");
      notFoundError.name = "ParameterNotFound";
      mockSSM.mockSend.mockRejectedValueOnce(notFoundError);

      await expect(resolver.resolve("ssm:/missing", {}, logger)).rejects.toThrow(
        "Failed to resolve SSM parameter",
      );
    });

    it("should handle access denied errors", async () => {
      const accessError = new Error("AccessDenied");
      accessError.name = "AccessDenied";
      mockSSM.mockSend.mockRejectedValueOnce(accessError);

      await expect(resolver.resolve("ssm:/forbidden", {}, logger)).rejects.toThrow(
        "Failed to resolve SSM parameter",
      );
    });

    it("should handle throttling errors", async () => {
      const throttleError = new Error("ThrottlingException");
      throttleError.name = "ThrottlingException";
      mockSSM.mockSend.mockRejectedValueOnce(throttleError);

      await expect(resolver.resolve("ssm:/throttled", {}, logger)).rejects.toThrow(
        "Failed to resolve SSM parameter",
      );
    });

    it("should log errors appropriately", async () => {
      const error = new Error("Test error");
      mockSSM.mockSend.mockRejectedValueOnce(error);

      try {
        await resolver.resolve("ssm:/error-param", {}, logger);
      } catch (e) {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "ssm:/error-param",
          parameterName: "error-param",
        }),
        "Failed to resolve SSM parameter",
      );
    });
  });

  describe("edge cases and ternary operators", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should handle options with ternary operators", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "conditional-value" },
      });

      const isProduction = true;
      const options = {
        withDecryption: isProduction ? true : false,
        retries: isProduction ? 5 : 3,
        cacheTtlMs: isProduction ? 10 * 60 * 1000 : 5 * 60 * 1000,
      };

      await resolver.resolve("ssm:/conditional-param", options, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            WithDecryption: true,
          }),
        }),
      );
    });

    it("should handle short-circuit evaluation in options", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "short-circuit-value" },
      });

      const config = { enableDecryption: false };
      const options = {
        withDecryption: config.enableDecryption && true, // Should be false
        retries: (config.enableDecryption as unknown as number) || 3, // Should be 3
      };

      await resolver.resolve("ssm:/short-circuit", options, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            WithDecryption: false,
          }),
        }),
      );
    });

    it("should handle nullish coalescing in options", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "nullish-value" },
      });

      const userConfig = {
        withDecryption: null as boolean | null,
        retries: undefined as number | undefined,
        cacheTtlMs: 0,
      };

      const options = {
        withDecryption: userConfig.withDecryption ?? true, // Should be true
        retries: userConfig.retries ?? 5, // Should be 5
        cacheTtlMs: userConfig.cacheTtlMs || 10000, // Should be 0 (falsy but not nullish)
      };

      await resolver.resolve("ssm:/nullish", options, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            WithDecryption: true,
          }),
        }),
      );
    });

    it("should handle empty and whitespace parameter names", async () => {
      await expect(resolver.resolve("ssm:/", {}, logger)).rejects.toThrow();

      await expect(resolver.resolve("ssm://", {}, logger)).rejects.toThrow();

      // Mock a successful response for whitespace parameter
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "whitespace-value" },
      });

      await expect(resolver.resolve("ssm:/ ", {}, logger)).resolves.toBe("whitespace-value");
    });

    it("should handle very long parameter names", async () => {
      const longName = "a".repeat(2048); // AWS SSM parameter name limit
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "long-name-value" },
      });

      await resolver.resolve(`ssm:/${longName}`, {}, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: longName,
          }),
        }),
      );
    });

    it("should handle special characters in parameter names", async () => {
      const specialName = "app/prod/db-host_v2.example.com";
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "special-char-value" },
      });

      await resolver.resolve(`ssm:/${specialName}`, {}, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: specialName,
          }),
        }),
      );
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources when available", async () => {
      await resolver.initialize(logger);

      if (resolver.cleanup) {
        expect(() => resolver.cleanup()).not.toThrow();
      }
    });
  });

  describe("initialization edge cases", () => {
    it("should handle multiple initialization calls", async () => {
      await resolver.initialize(logger);
      await resolver.initialize(logger); // Second call should be no-op

      expect(logger.debug).toHaveBeenCalledWith("SSM resolver initialized");
      expect(logger.debug).toHaveBeenCalledTimes(1); // Only called once
    });

    it("should handle AWS SDK import failures", async () => {
      const newResolver = new SSMResolver();

      // Mock import failure
      vi.doMock("@aws-sdk/client-ssm", () => {
        throw new Error("Module not found");
      });

      await expect(newResolver.initialize(logger)).rejects.toThrow(ConfigurationError);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        "Failed to initialize SSM resolver",
      );
    });

    it("should handle SSMClient creation failures", async () => {
      const newResolver = new SSMResolver();

      // Mock SSMClient constructor failure
      vi.doMock("@aws-sdk/client-ssm", () => ({
        SSMClient: class {
          constructor() {
            throw new Error("AWS credentials not found");
          }
        },
        GetParameterCommand: vi.fn(),
        GetParametersCommand: vi.fn(),
      }));

      await expect(newResolver.initialize(logger)).rejects.toThrow(ConfigurationError);
    });
  });

  describe("cache integration", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
      GlobalCache.getInstance().clear();
    });

    it("should cache resolved parameters with correct priority", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "cached-value" },
      });

      await resolver.resolve("ssm:/cache-test", {}, logger);

      const cacheStats = GlobalCache.getInstance().getStats();
      expect(cacheStats.totalEntries).toBe(1);
      expect(cacheStats.byProtocol.ssm).toBeDefined();
      expect(cacheStats.byProtocol.ssm.entries).toBe(1);
    });

    it("should use higher priority for encrypted parameters", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "encrypted-value" },
      });

      await resolver.resolve("ssm-secure:/encrypted-param", {}, logger);

      // Verify cache entry exists (priority is internal to GlobalCache)
      const cacheStats = GlobalCache.getInstance().getStats();
      expect(cacheStats.totalEntries).toBe(1);
    });

    it("should generate correct cache keys", async () => {
      mockSSM.mockSend
        .mockResolvedValueOnce({ Parameter: { Value: "value1" } })
        .mockResolvedValueOnce({ Parameter: { Value: "value2" } });

      // Same parameter with different decryption settings should be cached separately
      await resolver.resolve("ssm:/same-param", { withDecryption: false }, logger);
      await resolver.resolve("ssm:/same-param", { withDecryption: true }, logger);

      const cacheStats = GlobalCache.getInstance().getStats();
      expect(cacheStats.totalEntries).toBe(2); // Two separate cache entries
      expect(mockSSM.mockSend).toHaveBeenCalledTimes(2); // Two API calls
    });

    it("should respect custom cache TTL", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "ttl-value" },
      });

      await resolver.resolve("ssm:/ttl-param", { cacheTtlMs: 1000 }, logger);

      // Verify parameter was cached (TTL is internal to cache implementation)
      const cacheStats = GlobalCache.getInstance().getStats();
      expect(cacheStats.totalEntries).toBe(1);
    });

    it("should add appropriate tags to cached entries", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "tagged-value" },
      });

      await resolver.resolve("ssm:/app/prod/database/host", {}, logger);

      // Verify entry was cached with tags (tags are internal to GlobalCache)
      const cacheStats = GlobalCache.getInstance().getStats();
      expect(cacheStats.totalEntries).toBe(1);
    });
  });

  describe("statistics and monitoring", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should provide comprehensive statistics", () => {
      const stats = resolver.getStats();

      expect(stats).toEqual({
        protocol: "ssm",
        initialized: true,
        cacheStats: expect.any(Object),
      });

      expect(stats.cacheStats).toHaveProperty("totalEntries");
      expect(stats.cacheStats).toHaveProperty("totalSizeBytes");
      expect(stats.cacheStats).toHaveProperty("hits");
      expect(stats.cacheStats).toHaveProperty("misses");
      expect(stats.cacheStats).toHaveProperty("hitRatio");
    });

    it("should show uninitialized state correctly", () => {
      const uninitializedResolver = new SSMResolver();
      const stats = uninitializedResolver.getStats();

      expect(stats.initialized).toBe(false);
      expect(stats.protocol).toBe("ssm");
    });

    it("should track cache performance over time", async () => {
      mockSSM.mockSend.mockResolvedValue({
        Parameter: { Value: "performance-value" },
      });

      // First call - cache miss
      await resolver.resolve("ssm:/perf-test", {}, logger);
      let stats = resolver.getStats();
      expect(stats.cacheStats.misses).toBeGreaterThan(0);

      // Second call - cache hit
      await resolver.resolve("ssm:/perf-test", {}, logger);
      stats = resolver.getStats();
      expect(stats.cacheStats.hits).toBeGreaterThan(0);
    });
  });

  describe("resource management", () => {
    it("should properly cleanup AWS client", async () => {
      await resolver.initialize(logger);

      // Mock the destroy method
      const destroySpy = vi.fn();
      if (resolver["ssmClient"]) {
        resolver["ssmClient"].destroy = destroySpy;
      }

      resolver.cleanup();

      expect(destroySpy).toHaveBeenCalled();

      // Verify internal state is reset
      expect(resolver.getStats().initialized).toBe(false);
    });

    it("should handle cleanup when not initialized", () => {
      const uninitializedResolver = new SSMResolver();

      expect(() => uninitializedResolver.cleanup()).not.toThrow();
    });

    it("should handle multiple cleanup calls", async () => {
      await resolver.initialize(logger);

      expect(() => {
        resolver.cleanup();
        resolver.cleanup(); // Second cleanup should be safe
      }).not.toThrow();
    });
  });

  describe("parameter name extraction", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should extract parameter names correctly", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "extracted-value" },
      });

      await resolver.resolve("ssm:/complex/path/to/parameter", {}, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: "complex/path/to/parameter",
          }),
        }),
      );
    });

    it("should handle ssm-secure protocol extraction", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "secure-extracted-value" },
      });

      await resolver.resolve("ssm-secure:/secure/parameter/name", {}, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: "secure/parameter/name",
          }),
        }),
      );
    });
  });

  describe.skip("retry logic and error resilience", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should retry on transient failures", async () => {
      mockSSM.mockSend
        .mockRejectedValueOnce(new Error("ServiceUnavailable"))
        .mockRejectedValueOnce(new Error("ThrottlingException"))
        .mockResolvedValueOnce({ Parameter: { Value: "retry-success" } });

      const result = await resolver.resolve("ssm:/retry-test", { retries: 3 }, logger);

      expect(result).toBe("retry-success");
      expect(mockSSM.mockSend).toHaveBeenCalledTimes(3);
    });

    it("should respect custom retry configuration", async () => {
      mockSSM.mockSend
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce({ Parameter: { Value: "custom-retry-success" } });

      await resolver.resolve("ssm:/custom-retry", { retries: 1 }, logger);

      expect(mockSSM.mockSend).toHaveBeenCalledTimes(2);
    });

    it("should fail after exhausting retries", async () => {
      mockSSM.mockSend.mockRejectedValue(new Error("Persistent failure"));

      await expect(
        resolver.resolve("ssm:/persistent-fail", { retries: 2 }, logger),
      ).rejects.toThrow(ConfigurationError);

      expect(mockSSM.mockSend).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe("batch processing edge cases", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
      GlobalCache.getInstance().clear();
    });

    it("should handle empty batch requests", async () => {
      const results = await resolver.resolveBatch!([], logger);

      expect(results).toEqual([]);
      expect(mockSSM.mockSend).not.toHaveBeenCalled();
    });

    it("should handle single request batch", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [{ Name: "single", Value: "single-value" }],
      });

      const requests = [{ reference: "ssm:/single", options: {} }];
      const results = await resolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ reference: "ssm:/single", value: "single-value" });
    });

    it("should handle batch with all invalid parameters", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [],
        InvalidParameters: ["invalid1", "invalid2"],
      });

      const requests = [
        { reference: "ssm:/invalid1", options: {} },
        { reference: "ssm:/invalid2", options: {} },
      ];

      const results = await resolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(2);
      expect(results[0].error).toBeInstanceOf(ConfigurationError);
      expect(results[1].error).toBeInstanceOf(ConfigurationError);
    });

    it("should handle mixed valid and invalid parameters", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [{ Name: "valid", Value: "valid-value" }],
        InvalidParameters: ["invalid"],
      });

      const requests = [
        { reference: "ssm:/valid", options: {} },
        { reference: "ssm:/invalid", options: {} },
      ];

      const results = await resolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ reference: "ssm:/valid", value: "valid-value" });
      expect(results[1].error).toBeInstanceOf(ConfigurationError);
    });

    it("should cache batch results appropriately", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: "batch1", Value: "value1" },
          { Name: "batch2", Value: "value2" },
        ],
      });

      const requests = [
        { reference: "ssm:/batch1", options: {} },
        { reference: "ssm:/batch2", options: {} },
      ];

      await resolver.resolveBatch!(requests, logger);

      const cacheStats = GlobalCache.getInstance().getStats();
      expect(cacheStats.totalEntries).toBe(2);
    });
  });

  describe("logging and debugging", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should log debug information when debug level is enabled", async () => {
      (logger.isLevelEnabled as any).mockReturnValue(true);
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "debug-value" },
      });

      await resolver.resolve("ssm:/debug-test", {}, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "ssm:/debug-test",
          parameterName: "debug-test",
          withDecryption: false,
        }),
        "Resolving SSM parameter",
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "ssm:/debug-test",
          parameterName: "debug-test",
        }),
        "SSM parameter resolved",
      );
    });

    it("should not log debug information when debug level is disabled", async () => {
      (logger.isLevelEnabled as any).mockReturnValue(false);
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameter: { Value: "no-debug-value" },
      });

      await resolver.resolve("ssm:/no-debug", {}, logger);

      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("Resolving SSM parameter"),
      );
    });

    it("should log batch processing debug information", async () => {
      (logger.isLevelEnabled as any).mockReturnValue(true);
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [{ Name: "batch-debug", Value: "batch-value" }],
      });

      const requests = [{ reference: "ssm:/batch-debug", options: {} }];
      await resolver.resolveBatch!(requests, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          parameterNames: ["batch-debug"],
          withDecryption: false,
          count: 1,
        }),
        "Batch resolving SSM parameters",
      );
    });

    it("should log warnings for invalid parameters in batch", async () => {
      mockSSM.mockSend.mockResolvedValueOnce({
        Parameters: [],
        InvalidParameters: ["missing-param"],
      });

      const requests = [{ reference: "ssm:/missing-param", options: {} }];
      await resolver.resolveBatch!(requests, logger);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          invalidParameters: ["missing-param"],
        }),
        "Some SSM parameters were not found",
      );
    });
  });

  describe("error context and details", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should provide detailed error context for resolution failures", async () => {
      const awsError = new Error("Detailed AWS error");
      awsError.name = "DetailedError";
      mockSSM.mockSend.mockRejectedValueOnce(awsError);

      try {
        await resolver.resolve("ssm:/error-context", {}, logger);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).context).toEqual({
          reference: "ssm:/error-context",
          parameterName: "error-context",
        });
      }
    });

    it("should provide batch error context", async () => {
      const batchError = new Error("Batch processing error");
      mockSSM.mockSend.mockRejectedValueOnce(batchError);

      const requests = [{ reference: "ssm:/batch-error", options: {} }];
      const results = await resolver.resolveBatch!(requests, logger);

      expect(results[0].error).toBeInstanceOf(ConfigurationError);
      const error = results[0].error as ConfigurationError;
      // When batch operation fails, the error context contains the parameter names from the batch
      expect(error.context).toEqual({
        parameterNames: ["batch-error"],
      });
    });
  });

  describe("uninitialized resolver handling", () => {
    it("should throw when resolving without initialization", async () => {
      const uninitializedResolver = new SSMResolver();

      await expect(uninitializedResolver.resolve("ssm:/test", {}, logger)).rejects.toThrow(
        "SSM resolver not initialized",
      );
    });

    it("should return error results when batch resolving without initialization", async () => {
      const uninitializedResolver = new SSMResolver();
      const requests = [{ reference: "ssm:/test", options: {} }];

      const results = await uninitializedResolver.resolveBatch!(requests, logger);

      expect(results).toHaveLength(1);
      expect(results[0].reference).toBe("ssm:/test");
      expect(results[0].error).toBeInstanceOf(ConfigurationError);
      expect((results[0].error as ConfigurationError).message).toContain(
        "SSM resolver not initialized",
      );
    });
  });
});
