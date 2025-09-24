/**
 * @fileoverview Tests for DefaultResolverRegistry.
 *
 * Covers registration, unregistration, lookup, lifecycle management,
 * and edge cases for the resolver registry implementation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigurationError } from "@t68/errors";

import { DefaultResolverRegistry } from "../../src/resolvers/registry.js";
import type { ConfigResolver } from "../../src/resolvers/base.js";
import { createTestLogger } from "../__fixtures__/test-helpers.js";

describe("DefaultResolverRegistry", () => {
  let registry: DefaultResolverRegistry;
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(() => {
    registry = new DefaultResolverRegistry();
    logger = createTestLogger();
  });

  describe("registration", () => {
    it("should register a resolver successfully", async () => {
      const mockResolver = createMockResolver("test");

      await registry.register(mockResolver, logger);

      expect(mockResolver.initialize).toHaveBeenCalledWith(logger);
      expect(registry.getResolver("test")).toBe(mockResolver);
      expect(logger.debug).toHaveBeenCalledWith({ protocol: "test" }, "Resolver registered");
    });

    it("should handle protocol case insensitivity", async () => {
      const mockResolver = createMockResolver("TEST");

      await registry.register(mockResolver, logger);

      expect(registry.getResolver("test")).toBe(mockResolver);
      expect(registry.getResolver("TEST")).toBe(mockResolver);
      expect(registry.getResolver("Test")).toBe(mockResolver);
    });

    it("should replace existing resolver for same protocol", async () => {
      const oldResolver = createMockResolver("test");
      const newResolver = createMockResolver("test");

      await registry.register(oldResolver, logger);
      await registry.register(newResolver, logger);

      expect(oldResolver.cleanup).toHaveBeenCalled();
      expect(registry.getResolver("test")).toBe(newResolver);
      expect(registry.getProtocols()).toEqual(["test"]);
    });

    it("should handle resolver initialization failure", async () => {
      const mockResolver = createMockResolver("test");
      const initError = new Error("Init failed");
      mockResolver.initialize.mockRejectedValueOnce(initError);

      await expect(registry.register(mockResolver, logger)).rejects.toBe(initError);
      expect(registry.getResolver("test")).toBeUndefined();
    });
  });

  describe("unregistration", () => {
    it("should unregister resolver and call cleanup", async () => {
      const mockResolver = createMockResolver("test");
      await registry.register(mockResolver, logger);

      await registry.unregister("test");

      expect(mockResolver.cleanup).toHaveBeenCalled();
      expect(registry.getResolver("test")).toBeUndefined();
      expect(registry.getProtocols()).toEqual([]);
    });

    it("should handle unregistering non-existent protocol", async () => {
      await expect(registry.unregister("nonexistent")).resolves.not.toThrow();
    });

    it("should handle resolver without cleanup method", async () => {
      const mockResolver = createMockResolver("test");
      delete mockResolver.cleanup;
      await registry.register(mockResolver, logger);

      await expect(registry.unregister("test")).resolves.not.toThrow();
      expect(registry.getResolver("test")).toBeUndefined();
    });

    it("should handle cleanup failure gracefully", async () => {
      const mockResolver = createMockResolver("test");
      mockResolver.cleanup.mockRejectedValueOnce(new Error("Cleanup failed"));
      await registry.register(mockResolver, logger);

      await expect(registry.unregister("test")).rejects.toThrow("Cleanup failed");
    });
  });

  describe("lookup", () => {
    it("should return undefined for unknown protocol", () => {
      expect(registry.getResolver("unknown")).toBeUndefined();
    });

    it("should return registered resolver", async () => {
      const mockResolver = createMockResolver("test");
      await registry.register(mockResolver, logger);

      expect(registry.getResolver("test")).toBe(mockResolver);
    });

    it("should handle case insensitive lookup", async () => {
      const mockResolver = createMockResolver("test");
      await registry.register(mockResolver, logger);

      expect(registry.getResolver("TEST")).toBe(mockResolver);
      expect(registry.getResolver("Test")).toBe(mockResolver);
    });
  });

  describe("protocol listing", () => {
    it("should return empty array when no resolvers registered", () => {
      expect(registry.getProtocols()).toEqual([]);
    });

    it("should return all registered protocols", async () => {
      const resolver1 = createMockResolver("ssm");
      const resolver2 = createMockResolver("s3");

      await registry.register(resolver1, logger);
      await registry.register(resolver2, logger);

      const protocols = registry.getProtocols();
      expect(protocols).toHaveLength(2);
      expect(protocols).toContain("ssm");
      expect(protocols).toContain("s3");
    });

    it("should return protocols in lowercase", async () => {
      const resolver = createMockResolver("TEST");
      await registry.register(resolver, logger);

      expect(registry.getProtocols()).toEqual(["test"]);
    });
  });

  describe("canResolve", () => {
    beforeEach(async () => {
      const ssmResolver = createMockResolver("ssm");
      ssmResolver.validateReference.mockImplementation((ref: string) => ref.startsWith("ssm:/"));

      const s3Resolver = createMockResolver("s3");
      s3Resolver.validateReference.mockImplementation(
        (ref: string) => ref.startsWith("s3://") && ref.split("/").length > 3,
      );

      await registry.register(ssmResolver, logger);
      await registry.register(s3Resolver, logger);
    });

    it("should return true for valid references", () => {
      expect(registry.canResolve("ssm:/param")).toBe(true);
      expect(registry.canResolve("s3://bucket/key")).toBe(true);
    });

    it("should return false for invalid references", () => {
      expect(registry.canResolve("ssm:invalid")).toBe(false);
      expect(registry.canResolve("s3://bucket-only")).toBe(false);
    });

    it("should return false for unknown protocols", () => {
      expect(registry.canResolve("unknown://test")).toBe(false);
    });

    it("should return false for malformed references", () => {
      expect(registry.canResolve("")).toBe(false);
      expect(registry.canResolve("no-protocol")).toBe(false);
      expect(registry.canResolve("://no-protocol")).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should cleanup all resolvers and clear registry", async () => {
      const resolver1 = createMockResolver("ssm");
      const resolver2 = createMockResolver("s3");

      await registry.register(resolver1, logger);
      await registry.register(resolver2, logger);

      await registry.cleanup();

      expect(resolver1.cleanup).toHaveBeenCalled();
      expect(resolver2.cleanup).toHaveBeenCalled();
      expect(registry.getProtocols()).toEqual([]);
      expect(registry.getResolver("ssm")).toBeUndefined();
      expect(registry.getResolver("s3")).toBeUndefined();
    });

    it("should handle resolvers without cleanup method", async () => {
      const resolver1 = createMockResolver("test1");
      const resolver2 = createMockResolver("test2");
      delete resolver2.cleanup;

      await registry.register(resolver1, logger);
      await registry.register(resolver2, logger);

      await expect(registry.cleanup()).resolves.not.toThrow();
      expect(resolver1.cleanup).toHaveBeenCalled();
      expect(registry.getProtocols()).toEqual([]);
    });

    it("should handle cleanup failures", async () => {
      const resolver1 = createMockResolver("test1");
      const resolver2 = createMockResolver("test2");

      resolver1.cleanup.mockRejectedValueOnce(new Error("Cleanup 1 failed"));
      resolver2.cleanup.mockRejectedValueOnce(new Error("Cleanup 2 failed"));

      await registry.register(resolver1, logger);
      await registry.register(resolver2, logger);

      await expect(registry.cleanup()).rejects.toThrow();
      // Registry is NOT cleared if cleanup fails
      expect(registry.getProtocols()).toEqual(["test1", "test2"]);
    });

    it("should work with empty registry", async () => {
      await expect(registry.cleanup()).resolves.not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle multiple registrations of same resolver instance", async () => {
      const mockResolver = createMockResolver("test");

      await registry.register(mockResolver, logger);
      await registry.register(mockResolver, logger);

      expect(mockResolver.initialize).toHaveBeenCalledTimes(2);
      expect(mockResolver.cleanup).toHaveBeenCalledTimes(1);
      expect(registry.getProtocols()).toEqual(["test"]);
    });

    it("should handle concurrent registrations", async () => {
      const resolver1 = createMockResolver("test");
      const resolver2 = createMockResolver("test");

      const promises = [registry.register(resolver1, logger), registry.register(resolver2, logger)];

      await Promise.all(promises);

      // One of them should be registered
      const registered = registry.getResolver("test");
      expect(registered === resolver1 || registered === resolver2).toBe(true);
      expect(registry.getProtocols()).toEqual(["test"]);
    });

    it("should handle special characters in protocol names", async () => {
      const mockResolver = createMockResolver("test-protocol.v1");

      await registry.register(mockResolver, logger);

      expect(registry.getResolver("test-protocol.v1")).toBe(mockResolver);
      expect(registry.getProtocols()).toEqual(["test-protocol.v1"]);
    });
  });
});

/**
 * Create a mock resolver for testing.
 *
 * @param protocol - The protocol for the mock resolver.
 * @returns A mock resolver with all required methods and properties.
 */
function createMockResolver(protocol: string): ConfigResolver & {
  initialize: ReturnType<typeof vi.fn>;
  validateReference: ReturnType<typeof vi.fn>;
  resolve: ReturnType<typeof vi.fn>;
  cleanup: ReturnType<typeof vi.fn>;
} {
  return {
    protocol,
    defaultOptions: {},
    supportsBatch: false,
    initialize: vi.fn().mockResolvedValue(undefined),
    validateReference: vi.fn().mockReturnValue(true),
    resolve: vi.fn().mockResolvedValue("mock-value"),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}
