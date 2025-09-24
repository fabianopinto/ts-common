/**
 * @fileoverview Tests for ConfigurationFactory class.
 *
 * Covers factory methods, file loading, S3 loading, object merging,
 * error handling, and edge cases in configuration building.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

import { ConfigurationError } from "@t68/errors";

import { Configuration } from "../src/configuration.js";
import { ConfigurationFactory } from "../src/factory.js";
import {
  createTestLogger,
  testConfigs,
  resetTestEnvironment,
} from "./__fixtures__/test-helpers.js";

// Mock fs/promises for file operations
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";

describe("ConfigurationFactory", () => {
  let logger: ReturnType<typeof createTestLogger>;
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    resetTestEnvironment();
    logger = createTestLogger();
  });

  afterEach(() => {
    // Clear singleton instance for test isolation
    (Configuration as any).instance = undefined;
    s3Mock.reset();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create factory with default options", () => {
      const factory = new ConfigurationFactory();
      expect(factory).toBeInstanceOf(ConfigurationFactory);
    });

    it("should create factory with custom options", () => {
      const options = {
        logger,
        resolve: { external: false },
      };

      const factory = new ConfigurationFactory(options);
      expect(factory).toBeInstanceOf(ConfigurationFactory);
    });

    it("should use default logger when none provided", () => {
      const factory = new ConfigurationFactory();
      expect(factory).toBeInstanceOf(ConfigurationFactory);
    });
  });

  describe("addObject method", () => {
    it("should add single object", () => {
      const factory = new ConfigurationFactory({ logger });
      const result = factory.addObject(testConfigs.simple);

      expect(result).toBe(factory); // Should return factory for chaining
    });

    it("should merge multiple objects", async () => {
      const factory = new ConfigurationFactory({ logger });

      factory
        .addObject({ app: { name: "test1" }, database: { host: "host1" } })
        .addObject({ app: { version: "1.0" }, database: { port: 5432 } });

      const config = await factory.build();

      expect(await config.getValue("app.name")).toBe("test1");
      expect(await config.getValue("app.version")).toBe("1.0");
      expect(await config.getValue("database.host")).toBe("host1");
      expect(await config.getValue("database.port")).toBe(5432);
    });

    it("should handle deep merging correctly", async () => {
      const factory = new ConfigurationFactory({ logger });

      factory
        .addObject({
          nested: {
            level1: { a: 1, b: 2 },
            level2: { x: "original" },
          },
        })
        .addObject({
          nested: {
            level1: { b: 3, c: 4 },
            level3: { y: "new" },
          },
        });

      const config = await factory.build();
      const nested = await config.getValue("nested");

      expect(nested).toEqual({
        level1: { a: 1, b: 3, c: 4 }, // b overridden, a and c preserved
        level2: { x: "original" }, // preserved
        level3: { y: "new" }, // added
      });
    });

    it("should handle null value pruning", async () => {
      const factory = new ConfigurationFactory({ logger });

      factory
        .addObject({
          app: { name: "test", version: "1.0", debug: true },
          features: { a: 1, b: 2 },
        })
        .addObject({
          app: { version: null, debug: false }, // null should prune version
          features: null, // null should prune entire features
        });

      const config = await factory.build();

      expect(await config.getValue("app.name")).toBe("test");
      expect(await config.getValue("app.version")).toBeUndefined();
      expect(await config.getValue("app.debug")).toBe(false);
      expect(await config.getValue("features")).toBeUndefined();
    });

    it("should handle array replacement (not merging)", async () => {
      const factory = new ConfigurationFactory({ logger });

      factory.addObject({ items: [1, 2, 3] }).addObject({ items: [4, 5] });

      const config = await factory.build();
      expect(await config.getValue("items")).toEqual([4, 5]);
    });

    it("should handle edge case values", async () => {
      const factory = new ConfigurationFactory({ logger });

      factory.addObject({
        testValue: "exists",
        nullValue: null,
        emptyString: "",
        zeroNumber: 0,
        falseBoolean: false,
        emptyArray: [],
        emptyObject: {},
      });

      const config = await factory.build();

      // Test that regular values work
      expect(await config.getRaw("testValue")).toBe("exists");
      // Null values are filtered out by factory
      expect(await config.getRaw("nullValue")).toBeUndefined();
      expect(await config.getValue("emptyString")).toBe("");
      expect(await config.getValue("zeroNumber")).toBe(0);
      expect(await config.getValue("falseBoolean")).toBe(false);
      expect(await config.getValue("emptyArray")).toEqual([]);
      expect(await config.getValue("emptyObject")).toEqual({});
    });
  });

  describe("addFile method", () => {
    it("should read and parse JSON file", async () => {
      const factory = new ConfigurationFactory({ logger });
      const mockFileContent = JSON.stringify(testConfigs.simple);

      (readFile as Mock).mockResolvedValueOnce(mockFileContent);

      await factory.addFile("/path/to/config.json");
      const config = await factory.build();

      expect(await config.getValue("app.name")).toBe("test-app");
      expect(readFile).toHaveBeenCalledWith("/path/to/config.json", "utf8");
    });

    it("should handle multiple files with merging", async () => {
      const factory = new ConfigurationFactory({ logger });

      (readFile as Mock)
        .mockResolvedValueOnce('{"app":{"name":"base"},"database":{"host":"localhost"}}')
        .mockResolvedValueOnce('{"app":{"version":"1.0"},"database":{"port":5432}}');

      await factory.addFile("/base.json");
      await factory.addFile("/override.json");

      const config = await factory.build();

      expect(await config.getValue("app.name")).toBe("base");
      expect(await config.getValue("app.version")).toBe("1.0");
      expect(await config.getValue("database.host")).toBe("localhost");
      expect(await config.getValue("database.port")).toBe(5432);
    });

    it("should handle file read errors", async () => {
      const factory = new ConfigurationFactory({ logger });
      const fileError = new Error("ENOENT: no such file or directory");

      (readFile as Mock).mockRejectedValueOnce(fileError);

      await expect(factory.addFile("/nonexistent.json")).rejects.toThrow(ConfigurationError);

      try {
        await factory.addFile("/nonexistent.json");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).code).toBe("CONFIG_READ_FILE_ERROR");
        expect((error as ConfigurationError).context).toEqual({
          filePath: "/nonexistent.json",
        });
      }
    });

    it("should handle JSON parse errors", async () => {
      const factory = new ConfigurationFactory({ logger });

      (readFile as Mock).mockResolvedValueOnce("invalid json {");

      await expect(factory.addFile("/invalid.json")).rejects.toThrow(ConfigurationError);
    });

    it("should handle empty files", async () => {
      const factory = new ConfigurationFactory({ logger });

      (readFile as Mock).mockResolvedValueOnce("");

      await expect(factory.addFile("/empty.json")).rejects.toThrow(ConfigurationError);
    });

    it("should handle whitespace-only files", async () => {
      const factory = new ConfigurationFactory({ logger });

      (readFile as Mock).mockResolvedValueOnce("   \n\t  ");

      await expect(factory.addFile("/whitespace.json")).rejects.toThrow(ConfigurationError);
    });
  });

  describe("addS3 method", () => {
    it("should read and parse S3 object", async () => {
      const factory = new ConfigurationFactory({ logger });
      const s3Content = JSON.stringify(testConfigs.simple);

      // Mock S3 GetObject response with stream
      const mockStream = {
        transformToString: async () => s3Content,
      } as any;

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockStream,
      });

      await factory.addS3("s3://bucket/config.json");
      const config = await factory.build();

      expect(await config.getValue("app.name")).toBe("test-app");
    });

    it("should handle S3 resolution errors", async () => {
      const factory = new ConfigurationFactory({ logger });
      const s3Error = new Error("Access denied");

      vi.doMock("../src/resolvers.js", () => ({
        resolveS3: vi.fn().mockRejectedValue(s3Error),
      }));

      await expect(factory.addS3("s3://bucket/config.json")).rejects.toThrow(ConfigurationError);

      try {
        await factory.addS3("s3://bucket/config.json");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).code).toBe("CONFIG_READ_S3_ERROR");
        expect((error as ConfigurationError).context).toEqual({
          s3Path: "s3://bucket/config.json",
        });
      }
    });

    it("should handle S3 JSON parse errors", async () => {
      const factory = new ConfigurationFactory({ logger });

      vi.doMock("../src/resolvers.js", () => ({
        resolveS3: vi.fn().mockResolvedValue("invalid json {"),
      }));

      await expect(factory.addS3("s3://bucket/invalid.json")).rejects.toThrow(ConfigurationError);
    });
  });

  describe("build method", () => {
    it("should create Configuration instance", async () => {
      const factory = new ConfigurationFactory({ logger });
      factory.addObject(testConfigs.simple);

      const config = await factory.build();

      expect(config).toBeInstanceOf(Configuration);
      expect(await config.getValue("app.name")).toBe("test-app");
    });

    it("should pass factory options to Configuration", async () => {
      const options = {
        logger,
        resolve: { external: false },
      };

      const factory = new ConfigurationFactory(options);
      factory.addObject(testConfigs.withExternalRefs);

      const config = await factory.build();

      // Should not resolve external refs due to options
      expect(await config.getValue("app.apiKey")).toBe("ssm:/test/api-key");
    });

    it("should handle empty configuration", async () => {
      const factory = new ConfigurationFactory({ logger });

      const config = await factory.build();

      expect(config).toBeInstanceOf(Configuration);
      expect(await config.getValue("anything")).toBeUndefined();
    });
  });

  describe("static factory methods", () => {
    describe("buildFromObject", () => {
      it("should create Configuration from object", async () => {
        const config = await ConfigurationFactory.buildFromObject(testConfigs.simple, { logger });

        expect(config).toBeInstanceOf(Configuration);
        expect(await config.getValue("app.name")).toBe("test-app");
      });

      it("should handle options correctly", async () => {
        const config = await ConfigurationFactory.buildFromObject(testConfigs.withExternalRefs, {
          logger,
          resolve: { external: false },
        });

        expect(await config.getValue("app.apiKey")).toBe("ssm:/test/api-key");
      });
    });

    describe("buildFromFiles", () => {
      it("should create Configuration from files", async () => {
        (readFile as Mock)
          .mockResolvedValueOnce('{"app":{"name":"test"}}')
          .mockResolvedValueOnce('{"app":{"version":"1.0"}}');

        const config = await ConfigurationFactory.buildFromFiles(["/base.json", "/override.json"], {
          logger,
        });

        expect(config).toBeInstanceOf(Configuration);
        expect(await config.getValue("app.name")).toBe("test");
        expect(await config.getValue("app.version")).toBe("1.0");
      });

      it("should handle file errors", async () => {
        (readFile as Mock).mockRejectedValueOnce(new Error("File not found"));

        await expect(
          ConfigurationFactory.buildFromFiles(["/bad.json"], { logger }),
        ).rejects.toThrow(ConfigurationError);
      });
    });

    describe("buildFromS3", () => {
      it("should create Configuration from S3 objects", async () => {
        const mockStream1 = {
          transformToString: async () => '{"app":{"name":"test"}}',
        } as any;
        const mockStream2 = {
          transformToString: async () => '{"app":{"version":"1.0"}}',
        } as any;

        s3Mock
          .on(GetObjectCommand)
          .resolvesOnce({ Body: mockStream1 })
          .resolvesOnce({ Body: mockStream2 });

        const config = await ConfigurationFactory.buildFromS3(
          ["s3://bucket/base.json", "s3://bucket/override.json"],
          { logger },
        );

        expect(config).toBeInstanceOf(Configuration);
        expect(await config.getValue("app.name")).toBe("test");
        expect(await config.getValue("app.version")).toBe("1.0");
      });

      it("should handle S3 errors", async () => {
        vi.doMock("../src/resolvers.js", () => ({
          resolveS3: vi.fn().mockRejectedValue(new Error("S3 error")),
        }));

        await expect(
          ConfigurationFactory.buildFromS3(["s3://bucket/bad.json"], { logger }),
        ).rejects.toThrow(ConfigurationError);
      });
    });
  });

  describe("complex scenarios", () => {
    it("should handle mixed sources with proper precedence", async () => {
      const factory = new ConfigurationFactory({ logger });

      // Add base object
      factory.addObject({
        app: { name: "base", version: "0.1.0", env: "dev" },
        database: { host: "localhost" },
      });

      // Add file (should override)
      (readFile as Mock).mockResolvedValueOnce(
        JSON.stringify({
          app: { version: "1.0.0", debug: true },
          database: { port: 5432 },
        }),
      );
      await factory.addFile("/override.json");

      // Add another object (should override again)
      factory.addObject({
        app: { env: "prod", debug: false },
        features: { newUI: true },
      });

      const config = await factory.build();

      expect(await config.getValue("app.name")).toBe("base"); // from base object
      expect(await config.getValue("app.version")).toBe("1.0.0"); // from file
      expect(await config.getValue("app.env")).toBe("prod"); // from second object
      expect(await config.getValue("app.debug")).toBe(false); // from second object
      expect(await config.getValue("database.host")).toBe("localhost");
      expect(await config.getValue("database.port")).toBe(5432);
      expect(await config.getValue("features.newUI")).toBe(true);
    });

    it("should handle circular references gracefully", async () => {
      const factory = new ConfigurationFactory({ logger });

      const circularObj: any = { name: "test" };
      circularObj.self = circularObj;

      // Should not throw due to structuredClone handling
      expect(() => factory.addObject(circularObj)).not.toThrow();
    });
  });
});
