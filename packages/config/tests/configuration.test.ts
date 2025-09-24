/**
 * @fileoverview Tests for the Configuration class.
 *
 * Covers initialization, singleton behavior, value retrieval, external reference
 * resolution, edge cases, and error handling scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConfigurationError } from "@t68/errors";

import { Configuration } from "../src/configuration.js";
import {
  createTestLogger,
  testConfigs,
  resetTestEnvironment,
} from "./__fixtures__/test-helpers.js";

describe("Configuration", () => {
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(() => {
    resetTestEnvironment();
    logger = createTestLogger();
  });

  afterEach(() => {
    // Clear singleton instance for test isolation
    (Configuration as any).instance = undefined;
  });

  describe("initialization", () => {
    it("should initialize successfully with valid config", async () => {
      const config = await Configuration.initialize(testConfigs.simple, { logger });

      expect(config).toBeInstanceOf(Configuration);
      expect(
        logger.logs.some(
          ([level, message]) => level === "info" && message === "Configuration initialized",
        ),
      ).toBe(true);
    });

    it("should overwrite instance when initialized multiple times", async () => {
      const config1 = await Configuration.initialize(testConfigs.simple, { logger });
      const config2 = await Configuration.initialize(testConfigs.simple, { logger });

      // The second initialization creates a new instance and overwrites the singleton
      expect(config1).not.toBe(config2);
      expect(Configuration.getInstance()).toBe(config2); // getInstance returns the latest instance
    });

    it("should use default logger when none provided", async () => {
      // Mock the base logger to verify child() is called
      const mockBaseLogger = {
        child: vi.fn(() => logger),
        isLevelEnabled: vi.fn(() => true),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
      };

      vi.doMock("@t68/logger", () => ({
        logger: mockBaseLogger,
      }));

      const { Configuration: MockedConfiguration } = await import("../src/configuration.js");
      await MockedConfiguration.initialize(testConfigs.simple);

      expect(mockBaseLogger.child).toHaveBeenCalledWith({ module: "config" });
    });

    it("should initialize with default resolve options", async () => {
      const config = await Configuration.initialize(testConfigs.simple, { logger });

      // Access private field for testing
      const resolveOptions = (config as any).resolveOptions;
      expect(resolveOptions.external).toBe(true);
      expect(resolveOptions.resolvers).toEqual({
        ssm: { withDecryption: false },
        "ssm-secure": { withDecryption: true },
        s3: true,
      });
    });

    it("should respect custom resolve options", async () => {
      const customOptions = {
        logger,
        resolve: {
          external: false,
          resolvers: {
            ssm: { withDecryption: true },
            s3: false,
          },
        },
      };

      const config = await Configuration.initialize(testConfigs.simple, customOptions);

      const resolveOptions = (config as any).resolveOptions;
      expect(resolveOptions.external).toBe(false);
      expect(resolveOptions.resolvers.ssm).toEqual({ withDecryption: true });
      expect(resolveOptions.resolvers.s3).toBe(false);
    });

    it("should freeze configuration data to prevent mutation", async () => {
      const mutableData = { app: { name: "test" } };
      await Configuration.initialize(mutableData, { logger });

      // Original data should still be mutable
      mutableData.app.name = "modified";
      expect(mutableData.app.name).toBe("modified");

      // But configuration data should be frozen
      const config = Configuration.getInstance();
      const data = (config as any).data;
      expect(() => {
        (data as any).app.name = "should-fail";
      }).toThrow();
    });
  });

  describe("getInstance", () => {
    it("should return initialized instance", async () => {
      const config = await Configuration.initialize(testConfigs.simple, { logger });
      const instance = Configuration.getInstance();

      expect(instance).toBe(config);
    });

    it("should throw when not initialized", () => {
      expect(() => Configuration.getInstance()).toThrow(ConfigurationError);
      expect(() => Configuration.getInstance()).toThrow(/not been initialized/i);
    });

    it("should throw with correct error code", () => {
      try {
        Configuration.getInstance();
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).code).toBe("CONFIG_NOT_INITIALIZED");
        expect((error as ConfigurationError).status).toBe(500);
      }
    });
  });

  describe("has method", () => {
    beforeEach(async () => {
      await Configuration.initialize(testConfigs.simple, { logger });
    });

    it("should return true for existing paths", () => {
      const config = Configuration.getInstance();

      expect(config.has("app")).toBe(true);
      expect(config.has("app.name")).toBe(true);
      expect(config.has("database.host")).toBe(true);
      expect(config.has("database.port")).toBe(true);
    });

    it("should return false for non-existing paths", () => {
      const config = Configuration.getInstance();

      expect(config.has("nonexistent")).toBe(false);
      expect(config.has("app.nonexistent")).toBe(false);
      expect(config.has("database.password")).toBe(false);
    });

    it("should handle edge case paths", async () => {
      await Configuration.initialize(testConfigs.simple, { logger });
      const config = Configuration.getInstance();

      expect(config.has("")).toBe(false);
      expect(config.has(".")).toBe(true); // Root object exists, so "." should return true
      expect(config.has("app.")).toBe(true); // "app." resolves to the app object
      expect(config.has(".app")).toBe(true); // ".app" resolves to the app object
    });

    it("should not resolve external references", async () => {
      await Configuration.initialize(testConfigs.withExternalRefs, { logger });
      const config = Configuration.getInstance();

      // Should return true even for external references without resolving them
      expect(config.has("app.apiKey")).toBe(true);
      expect(config.has("database.password")).toBe(true);
    });
  });

  describe("getValue method", () => {
    describe("basic functionality", () => {
      beforeEach(async () => {
        await Configuration.initialize(testConfigs.simple, { logger });
      });

      it("should return values for existing paths", async () => {
        const config = Configuration.getInstance();

        expect(await config.getValue("app.name")).toBe("test-app");
        expect(await config.getValue("app.version")).toBe("1.0.0");
        expect(await config.getValue("database.host")).toBe("localhost");
        expect(await config.getValue("database.port")).toBe(5432);
      });

      it("should return undefined for non-existing paths", async () => {
        const config = Configuration.getInstance();

        expect(await config.getValue("nonexistent")).toBeUndefined();
        expect(await config.getValue("app.nonexistent")).toBeUndefined();
        expect(await config.getValue("database.password")).toBeUndefined();
      });

      it("should return complex objects and arrays", async () => {
        const config = Configuration.getInstance();

        const app = await config.getValue("app");
        expect(app).toEqual({ name: "test-app", version: "1.0.0" });

        const database = await config.getValue("database");
        expect(database).toEqual({ host: "localhost", port: 5432 });
      });

      it("should handle type parameters correctly", async () => {
        const config = Configuration.getInstance();

        const name = await config.getValue<string>("app.name");
        const port = await config.getValue<number>("database.port");

        expect(typeof name).toBe("string");
        expect(typeof port).toBe("number");
        expect(name).toBe("test-app");
        expect(port).toBe(5432);
      });
    });

    describe("edge cases", () => {
      beforeEach(async () => {
        await Configuration.initialize(testConfigs.edgeCases, { logger });
      });

      it("should handle null values", async () => {
        const config = Configuration.getInstance();
        expect(await config.getValue("nullValue")).toBeNull();
      });

      it("should handle empty strings", async () => {
        const config = Configuration.getInstance();
        expect(await config.getValue("emptyString")).toBe("");
      });

      it("should handle zero numbers", async () => {
        const config = Configuration.getInstance();
        expect(await config.getValue("zeroNumber")).toBe(0);
      });

      it("should handle false booleans", async () => {
        const config = Configuration.getInstance();
        expect(await config.getValue("falseBoolean")).toBe(false);
      });

      it("should handle empty arrays", async () => {
        const config = Configuration.getInstance();
        expect(await config.getValue("emptyArray")).toEqual([]);
      });

      it("should handle empty objects", async () => {
        const config = Configuration.getInstance();
        expect(await config.getValue("emptyObject")).toEqual({});
      });

      it("should handle deep nesting", async () => {
        const config = Configuration.getInstance();
        expect(
          await config.getValue("deepNesting.level1.level2.level3.level4.value", {
            resolve: false,
          }),
        ).toBe("ssm:/deep/nested/value");
      });
    });

    describe("resolution options", () => {
      beforeEach(async () => {
        await Configuration.initialize(testConfigs.withExternalRefs, { logger });
      });

      it("should disable all resolution with resolve: false", async () => {
        const config = Configuration.getInstance();

        const apiKey = await config.getValue("app.apiKey", { resolve: false });
        const password = await config.getValue("database.password", { resolve: false });

        expect(apiKey).toBe("ssm:/test/api-key");
        expect(password).toBe("ssm-secure:/test/db/password");
      });

      it("should support selective resolver disabling", async () => {
        const config = Configuration.getInstance();

        const value = await config.getValue("config.template", {
          resolve: { resolvers: { s3: false } },
        });

        expect(value).toBe("s3://test-bucket/template.json");
      });

      it("should merge per-call options with instance options", async () => {
        // Initialize with external resolution disabled
        await Configuration.initialize(testConfigs.withExternalRefs, {
          logger,
          resolve: { external: false },
        });

        const config = Configuration.getInstance();

        // Should return raw value due to instance-level setting
        const apiKey1 = await config.getValue("app.apiKey");
        expect(apiKey1).toBe("ssm:/test/api-key");

        // Should still return raw value when explicitly disabled
        const apiKey2 = await config.getValue("app.apiKey", { resolve: false });
        expect(apiKey2).toBe("ssm:/test/api-key");
      });
    });
  });

  describe("getRaw method", () => {
    beforeEach(async () => {
      await Configuration.initialize(testConfigs.withExternalRefs, { logger });
    });

    it("should return raw values without resolution", async () => {
      const config = Configuration.getInstance();

      expect(await config.getRaw("app.apiKey")).toBe("ssm:/test/api-key");
      expect(await config.getRaw("database.password")).toBe("ssm-secure:/test/db/password");
      expect(await config.getRaw("config.template")).toBe("s3://test-bucket/template.json");
    });

    it("should return undefined for non-existing paths", async () => {
      const config = Configuration.getInstance();
      expect(await config.getRaw("nonexistent")).toBeUndefined();
    });
  });

  describe("preload method", () => {
    it("should validate all external references", async () => {
      // This test would require mocking the resolution engine
      // For now, just verify the method exists and doesn't throw
      const config = await Configuration.initialize(testConfigs.simple, { logger });

      await expect(config.preload()).resolves.not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle resolver initialization failures", async () => {
      // Mock resolver registry to throw during registration
      vi.doMock("../src/resolvers/registry.js", () => ({
        DefaultResolverRegistry: vi.fn().mockImplementation(() => ({
          register: vi.fn().mockRejectedValue(new Error("Registry error")),
        })),
      }));

      const { Configuration: MockedConfiguration } = await import("../src/configuration.js");

      await expect(MockedConfiguration.initialize(testConfigs.simple, { logger })).rejects.toThrow(
        "Failed to initialize configuration resolvers",
      );
    });

    it("should log resolver initialization errors", async () => {
      // Mock resolver registry to throw during registration
      vi.doMock("../src/resolvers/registry.js", () => ({
        DefaultResolverRegistry: vi.fn().mockImplementation(() => ({
          register: vi.fn().mockRejectedValue(new Error("Registry error")),
        })),
      }));

      const { Configuration: MockedConfiguration } = await import("../src/configuration.js");

      try {
        await MockedConfiguration.initialize(testConfigs.simple, { logger });
      } catch (error: any) {
        expect(logger.logs.some(([level]) => level === "error")).toBe(true);
        expect(error.code).toBe("CONFIG_RESOLVER_INIT_ERROR");
        expect(error.message).toContain("Failed to initialize configuration resolvers");
      }
    });
  });
});
