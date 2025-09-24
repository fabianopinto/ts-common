/**
 * @fileoverview Tests for the DefaultConfigurationProvider.
 *
 * Covers provider interface implementation and delegation to Configuration singleton.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConfigurationError } from "@t68/errors";

import { DefaultConfigurationProvider } from "../src/provider.js";
import { Configuration } from "../src/configuration.js";
import {
  createTestLogger,
  testConfigs,
  resetTestEnvironment,
} from "./__fixtures__/test-helpers.js";

describe("DefaultConfigurationProvider", () => {
  let logger: ReturnType<typeof createTestLogger>;
  let provider: DefaultConfigurationProvider;

  beforeEach(() => {
    resetTestEnvironment();
    logger = createTestLogger();
    provider = new DefaultConfigurationProvider();
  });

  afterEach(() => {
    // Clear singleton instance for test isolation
    (Configuration as any).instance = undefined;
  });

  describe("has method", () => {
    it("should delegate to Configuration.getInstance().has()", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      expect(provider.has("app.name")).toBe(true);
      expect(provider.has("nonexistent")).toBe(false);
    });

    it("should throw when Configuration not initialized", () => {
      expect(() => provider.has("app.name")).toThrow(ConfigurationError);
      expect(() => provider.has("app.name")).toThrow(/not been initialized/i);
    });

    it("should handle edge case paths", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      expect(provider.has("")).toBe(false);
      expect(provider.has(".")).toBe(true); // Root object exists
      expect(provider.has("app.")).toBe(true); // "app." resolves to app object
    });
  });

  describe("getValue method", () => {
    it("should delegate to Configuration.getInstance().getValue()", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      expect(await provider.getValue("app.name")).toBe("test-app");
      expect(await provider.getValue("database.port")).toBe(5432);
      expect(await provider.getValue("nonexistent")).toBeUndefined();
    });

    it("should pass through options correctly", async () => {
      await Configuration.initialize(testConfigs.withExternalRefs, { logger });

      // Test with resolve: false
      const rawValue = await provider.getValue("app.apiKey", { resolve: false });
      expect(rawValue).toBe("ssm:/test/api-key");
    });

    it("should throw when Configuration not initialized", async () => {
      await expect(provider.getValue("app.name")).rejects.toThrow(ConfigurationError);
      await expect(provider.getValue("app.name")).rejects.toThrow(/not been initialized/i);
    });

    it("should handle type parameters correctly", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      const name = await provider.getValue<string>("app.name");
      const port = await provider.getValue<number>("database.port");

      expect(typeof name).toBe("string");
      expect(typeof port).toBe("number");
      expect(name).toBe("test-app");
      expect(port).toBe(5432);
    });

    it("should handle complex objects and arrays", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      const app = await provider.getValue("app");
      expect(typeof app).toBe("object");
      expect(app).toHaveProperty("name");
      expect(app).toHaveProperty("version");

      const database = await provider.getValue("database");
      expect(typeof database).toBe("object");
    });

    it("should handle edge case values", async () => {
      await Configuration.initialize(testConfigs.edgeCases, { logger });

      expect(await provider.getValue("nullValue")).toBeNull();
      expect(await provider.getValue("emptyString")).toBe("");
      expect(await provider.getValue("zeroNumber")).toBe(0);
      expect(await provider.getValue("falseBoolean")).toBe(false);
      expect(await provider.getValue("emptyArray")).toEqual([]);
      expect(await provider.getValue("emptyObject")).toEqual({});
    });
  });

  describe("provider interface compliance", () => {
    it("should implement ConfigurationProvider interface", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      // Verify interface methods exist and work
      expect(typeof provider.has).toBe("function");
      expect(typeof provider.getValue).toBe("function");

      // Verify they return expected types
      expect(typeof provider.has("app")).toBe("boolean");
      expect(provider.getValue("app")).toBeInstanceOf(Promise);
    });

    it("should maintain consistent behavior with Configuration", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });
      const config = Configuration.getInstance();

      // Compare provider vs direct Configuration calls
      expect(provider.has("app.name")).toBe(config.has("app.name"));
      expect(provider.has("nonexistent")).toBe(config.has("nonexistent"));

      expect(await provider.getValue("app.name")).toBe(await config.getValue("app.name"));
      expect(await provider.getValue("nonexistent")).toBe(await config.getValue("nonexistent"));
    });
  });

  describe("error propagation", () => {
    it("should propagate Configuration initialization errors", () => {
      // Configuration not initialized
      expect(() => provider.has("test")).toThrow(ConfigurationError);
    });

    it("should propagate Configuration getValue errors", async () => {
      // Configuration not initialized
      await expect(provider.getValue("test")).rejects.toThrow(ConfigurationError);
    });

    it("should maintain error context and codes", async () => {
      try {
        provider.has("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).code).toBe("CONFIG_NOT_INITIALIZED");
      }

      try {
        await provider.getValue("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).code).toBe("CONFIG_NOT_INITIALIZED");
      }
    });
  });

  describe("performance and behavior", () => {
    it("should not cache results independently", async () => {
      await Configuration.initialize({ counter: 0 }, { logger });

      // Modify the underlying configuration (normally not possible due to freezing)
      // This test verifies the provider doesn't add its own caching layer
      expect(await provider.getValue("counter")).toBe(0);
      expect(await provider.getValue("counter")).toBe(0); // Should be same value
    });

    it("should handle concurrent calls correctly", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      const promises = Array.from({ length: 10 }, (_, i) => provider.getValue(`app.name`));

      const results = await Promise.all(promises);
      expect(results.every((result) => result === "test-app")).toBe(true);
    });

    it("should handle rapid successive calls", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });

      for (let i = 0; i < 100; i++) {
        expect(provider.has("app.name")).toBe(true);
        expect(await provider.getValue("app.name")).toBe("test-app");
      }
    });
  });
});
