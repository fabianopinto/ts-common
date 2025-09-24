/**
 * @fileoverview Basic integration tests to verify core functionality.
 *
 * These tests focus on the basic functionality without complex external
 * references to ensure the core system works before testing advanced features.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { Configuration } from "../src/configuration.js";
import { ConfigurationFactory } from "../src/factory.js";
import { createTestLogger, resetTestEnvironment } from "./__fixtures__/test-helpers.js";

describe("Basic Integration", () => {
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(() => {
    resetTestEnvironment();
    logger = createTestLogger();
  });

  afterEach(() => {
    // Clear singleton instance for test isolation
    (Configuration as any).instance = undefined;
  });

  describe("Configuration without external references", () => {
    it("should initialize and retrieve simple values", async () => {
      const config = await Configuration.initialize(
        {
          app: {
            name: "test-app",
            version: "1.0.0",
          },
          database: {
            host: "localhost",
            port: 5432,
          },
        },
        { logger },
      );

      expect(config).toBeInstanceOf(Configuration);
      expect(await config.getValue("app.name")).toBe("test-app");
      expect(await config.getValue("database.port")).toBe(5432);
    });

    it("should handle nested objects correctly", async () => {
      const config = await Configuration.initialize(
        {
          services: {
            auth: {
              endpoint: "https://auth.example.com",
              timeout: 5000,
            },
            database: {
              primary: {
                host: "db1.example.com",
                port: 5432,
              },
              replica: {
                host: "db2.example.com",
                port: 5433,
              },
            },
          },
        },
        { logger },
      );

      expect(await config.getValue("services.auth.endpoint")).toBe("https://auth.example.com");
      expect(await config.getValue("services.database.primary.port")).toBe(5432);
      expect(await config.getValue("services.database.replica.host")).toBe("db2.example.com");
    });

    it("should handle arrays correctly", async () => {
      const config = await Configuration.initialize(
        {
          items: ["item1", "item2", "item3"],
          mixed: ["string", 42, true, { nested: "object" }],
        },
        { logger },
      );

      const items = await config.getValue("items");
      expect(Array.isArray(items)).toBe(true);
      expect(items).toEqual(["item1", "item2", "item3"]);

      const mixed = await config.getValue("mixed");
      expect(Array.isArray(mixed)).toBe(true);
      expect(mixed).toHaveLength(4);
      expect(mixed[3]).toEqual({ nested: "object" });
    });

    it("should handle edge case values", async () => {
      const config = await Configuration.initialize(
        {
          nullValue: null,
          emptyString: "",
          zeroNumber: 0,
          falseBoolean: false,
          emptyArray: [],
          emptyObject: {},
        },
        { logger },
      );

      expect(await config.getValue("nullValue")).toBeNull();
      expect(await config.getValue("emptyString")).toBe("");
      expect(await config.getValue("zeroNumber")).toBe(0);
      expect(await config.getValue("falseBoolean")).toBe(false);
      expect(await config.getValue("emptyArray")).toEqual([]);
      expect(await config.getValue("emptyObject")).toEqual({});
    });
  });

  describe("ConfigurationFactory basic functionality", () => {
    it("should build configuration from object", async () => {
      const config = await ConfigurationFactory.buildFromObject(
        {
          test: {
            value: "factory-test",
          },
        },
        { logger },
      );

      expect(config).toBeInstanceOf(Configuration);
      expect(await config.getValue("test.value")).toBe("factory-test");
    });

    it("should merge multiple objects correctly", async () => {
      const factory = new ConfigurationFactory({ logger });

      factory
        .addObject({ app: { name: "base" }, database: { host: "localhost" } })
        .addObject({ app: { version: "1.0" }, database: { port: 5432 } });

      const config = await factory.build();

      expect(await config.getValue("app.name")).toBe("base");
      expect(await config.getValue("app.version")).toBe("1.0");
      expect(await config.getValue("database.host")).toBe("localhost");
      expect(await config.getValue("database.port")).toBe(5432);
    });
  });

  describe("Resolution options", () => {
    it("should handle resolve: false option", async () => {
      const config = await Configuration.initialize(
        {
          regularValue: "normal",
          externalRef: "ssm:/fake/param", // This won't be resolved
        },
        { logger },
      );

      // Regular value should work normally
      expect(await config.getValue("regularValue")).toBe("normal");

      // External reference should be returned as-is when resolution disabled
      expect(await config.getValue("externalRef", { resolve: false })).toBe("ssm:/fake/param");
    });

    it("should use getRaw method correctly", async () => {
      const config = await Configuration.initialize(
        {
          value: "test",
          external: "s3://bucket/key",
        },
        { logger },
      );

      expect(await config.getRaw("value")).toBe("test");
      expect(await config.getRaw("external")).toBe("s3://bucket/key");
    });
  });

  describe("Error handling", () => {
    it("should throw when accessing non-existent paths", async () => {
      const config = await Configuration.initialize(
        {
          existing: "value",
        },
        { logger },
      );

      expect(await config.getValue("nonexistent")).toBeUndefined();
      expect(await config.getValue("existing.nonexistent")).toBeUndefined();
    });

    it("should handle has() method correctly", async () => {
      const config = await Configuration.initialize(
        {
          app: {
            name: "test",
          },
        },
        { logger },
      );

      expect(config.has("app")).toBe(true);
      expect(config.has("app.name")).toBe(true);
      expect(config.has("app.nonexistent")).toBe(false);
      expect(config.has("nonexistent")).toBe(false);
    });
  });

  describe("Ternary operators and short-circuit expressions", () => {
    it("should handle conditional configuration", async () => {
      const isProduction = false;
      const config = await Configuration.initialize(
        {
          environment: isProduction ? "production" : "development",
          debug: !isProduction,
          logLevel: isProduction ? "error" : "debug",
          features: {
            enableNewUI: isProduction && true,
            enableDebugTools: !isProduction || false,
          },
        },
        { logger },
      );

      expect(await config.getValue("environment")).toBe("development");
      expect(await config.getValue("debug")).toBe(true);
      expect(await config.getValue("logLevel")).toBe("debug");
      expect(await config.getValue("features.enableNewUI")).toBe(false);
      expect(await config.getValue("features.enableDebugTools")).toBe(true);
    });

    it("should handle nullish coalescing", async () => {
      const userConfig = {
        timeout: null,
        retries: undefined,
        enabled: false,
      };

      const config = await Configuration.initialize(
        {
          timeout: userConfig.timeout ?? 5000,
          retries: userConfig.retries ?? 3,
          enabled: userConfig.enabled ?? true, // Should be false (not nullish)
          fallback: userConfig.timeout ?? userConfig.retries ?? "default",
        },
        { logger },
      );

      expect(await config.getValue("timeout")).toBe(5000);
      expect(await config.getValue("retries")).toBe(3);
      expect(await config.getValue("enabled")).toBe(false);
      expect(await config.getValue("fallback")).toBe("default");
    });

    it("should handle complex conditional logic", async () => {
      // Simulate getting environment from external source to avoid literal type inference
      const getEnvironment = (): "production" | "staging" | "development" => "staging";
      const env = getEnvironment();
      const features = { beta: true, experimental: false };

      const config = await Configuration.initialize(
        {
          database: {
            host:
              env === "production"
                ? "prod-db.example.com"
                : env === "staging"
                  ? "staging-db.example.com"
                  : "localhost",
            ssl: env !== "development",
          },
          features: {
            betaFeatures: features.beta && env !== "production",
            experimentalFeatures: features.experimental || env === "development",
          },
        },
        { logger },
      );

      expect(await config.getValue("database.host")).toBe("staging-db.example.com");
      expect(await config.getValue("database.ssl")).toBe(true);
      expect(await config.getValue("features.betaFeatures")).toBe(true);
      expect(await config.getValue("features.experimentalFeatures")).toBe(false);
    });
  });
});
