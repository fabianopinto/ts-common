/**
 * @fileoverview Tests for the S3 resolver.
 *
 * Covers S3 object resolution, content and metadata retrieval,
 * streaming support, error handling, and edge cases for AWS S3
 * object resolution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Readable } from "node:stream";
import { ConfigurationError } from "@t68/errors";

import { S3Resolver } from "../../src/resolvers/s3-resolver.js";
import {
  createTestLogger,
  createMockS3Client,
  createMockStream,
  resetTestEnvironment,
} from "../__fixtures__/test-helpers.js";

describe("S3Resolver", () => {
  let resolver: S3Resolver;
  let logger: ReturnType<typeof createTestLogger>;
  let mockS3: ReturnType<typeof createMockS3Client>;

  beforeEach(async () => {
    resetTestEnvironment();
    logger = createTestLogger();
    resolver = new S3Resolver();

    // Mock AWS SDK
    mockS3 = createMockS3Client();
    vi.doMock("@aws-sdk/client-s3", () => mockS3);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(resolver.initialize(logger)).resolves.not.toThrow();
    });

    it("should have correct protocol", () => {
      expect(resolver.protocol).toBe("s3");
    });

    it("should not support batch operations by default", () => {
      expect(resolver.supportsBatch).toBe(false);
    });

    it("should have default options", () => {
      expect(resolver.defaultOptions).toEqual({
        retrieveMetadata: false,
        metadataFields: [],
        cacheTtlMs: 10 * 60 * 1000, // 10 minutes
        retries: 3,
      });
    });
  });

  describe("validateReference", () => {
    it("should validate s3:// references", () => {
      expect(resolver.validateReference("s3://bucket/key")).toBe(true);
      expect(resolver.validateReference("s3://my-bucket/path/to/file.json")).toBe(true);
      expect(resolver.validateReference("s3://bucket-name/config.txt")).toBe(true);
    });

    it("should reject invalid references", () => {
      expect(resolver.validateReference("ssm:/param")).toBe(false);
      expect(resolver.validateReference("http://example.com")).toBe(false);
      expect(resolver.validateReference("plain-string")).toBe(false);
      expect(resolver.validateReference("")).toBe(false);
    });

    it("should reject malformed S3 references", () => {
      expect(resolver.validateReference("s3://")).toBe(false);
      expect(resolver.validateReference("s3://bucket")).toBe(false);
      expect(resolver.validateReference("s3://bucket/")).toBe(false);
      expect(resolver.validateReference("s3:///key")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(resolver.validateReference("s3:")).toBe(false);
      expect(resolver.validateReference("s3:/")).toBe(false);
      expect(resolver.validateReference("s3://bucket-only")).toBe(false);
    });
  });

  describe("content resolution", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should resolve S3 object content via transformToString", async () => {
      const content = "test file content";
      mockS3.mockSend.mockResolvedValueOnce({
        Body: {
          transformToString: vi.fn().mockResolvedValue(content),
        },
      });

      const result = await resolver.resolve("s3://test-bucket/config.json", {}, logger);

      expect(result).toBe(content);
      expect(mockS3.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Bucket: "test-bucket",
            Key: "config.json",
          },
        }),
      );
    });

    it("should resolve S3 object content via Node stream fallback", async () => {
      const content = "stream content";
      const mockStream = createMockStream(content);

      mockS3.mockSend.mockResolvedValueOnce({
        Body: mockStream,
      });

      const result = await resolver.resolve("s3://test-bucket/stream.txt", {}, logger);

      expect(result).toBe(content);
    });

    it("should handle nested object keys", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("nested content") },
      });

      await resolver.resolve("s3://bucket/path/to/nested/file.json", {}, logger);

      expect(mockS3.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Bucket: "bucket",
            Key: "path/to/nested/file.json",
          },
        }),
      );
    });

    it("should handle keys with special characters", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("special content") },
      });

      await resolver.resolve("s3://bucket/config-v2_final.json", {}, logger);

      expect(mockS3.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Bucket: "bucket",
            Key: "config-v2_final.json",
          },
        }),
      );
    });

    it("should handle URL-encoded keys", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("encoded content") },
      });

      await resolver.resolve("s3://bucket/path%20with%20spaces/file.txt", {}, logger);

      expect(mockS3.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Bucket: "bucket",
            Key: "path%20with%20spaces/file.txt",
          },
        }),
      );
    });

    it("should log debug information when enabled", async () => {
      (logger.isLevelEnabled as any).mockReturnValue(true);
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("debug content") },
      });

      await resolver.resolve("s3://debug-bucket/debug.json", {}, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "s3://debug-bucket/debug.json",
          bucket: "debug-bucket",
          key: "debug.json",
        }),
        expect.stringContaining("Resolving S3 object"),
      );
    });
  });

  describe("metadata resolution", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should retrieve metadata when requested", async () => {
      const metadata = {
        ContentType: "application/json",
        ContentLength: 1024,
        LastModified: new Date("2023-01-01"),
        ETag: '"abc123"',
      };

      mockS3.mockSend.mockResolvedValueOnce(metadata);

      const result = await resolver.resolve(
        "s3://bucket/file.json",
        {
          metadata: true,
        },
        logger,
      );

      // Should return JSON metadata only
      const parsed = JSON.parse(result);
      expect(parsed).toMatchObject({
        ContentType: "application/json",
        ContentLength: 1024,
        ETag: '"abc123"',
      });
    });

    it("should retrieve selective metadata fields", async () => {
      const metadata = {
        ContentType: "application/json",
        ContentLength: 1024,
        LastModified: new Date("2023-01-01"),
        ETag: '"abc123"',
        ServerSideEncryption: "AES256",
      };

      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("content") },
        ...metadata,
      });

      const result = await resolver.resolve(
        "s3://bucket/file.json",
        {
          metadata: true,
          metadataFields: ["ContentType", "ContentLength"],
        },
        logger,
      );

      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        ContentType: "application/json",
        ContentLength: 1024,
      });
      expect(parsed.LastModified).toBeUndefined();
      expect(parsed.ETag).toBeUndefined();
    });

    it("should handle missing metadata fields gracefully", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("content") },
        ContentType: "text/plain",
        // Missing other metadata fields
      });

      const result = await resolver.resolve(
        "s3://bucket/file.txt",
        {
          metadata: true,
          metadataFields: ["ContentType", "ContentLength", "NonExistent"],
        },
        logger,
      );

      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        ContentType: "text/plain",
        // ContentLength and NonExistent should be omitted
      });
    });
  });

  describe("streaming support", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should handle readable streams", async () => {
      const chunks = ["chunk1", "chunk2", "chunk3"];
      const stream = Readable.from(chunks.map((chunk) => Buffer.from(chunk)));

      mockS3.mockSend.mockResolvedValueOnce({
        Body: stream,
      });

      const result = await resolver.resolve("s3://bucket/stream.txt", {}, logger);

      expect(result).toBe("chunk1chunk2chunk3");
    });

    it("should handle empty streams", async () => {
      const stream = Readable.from([]);

      mockS3.mockSend.mockResolvedValueOnce({
        Body: stream,
      });

      const result = await resolver.resolve("s3://bucket/empty.txt", {}, logger);

      expect(result).toBe("");
    });

    it("should handle stream errors", async () => {
      const stream = new Readable({
        read() {
          this.emit("error", new Error("Stream error"));
        },
      });

      mockS3.mockSend.mockResolvedValueOnce({
        Body: stream,
      });

      await expect(resolver.resolve("s3://bucket/error.txt", {}, logger)).rejects.toThrow(
        "Failed to resolve S3 object",
      );
    });

    it("should handle large streams efficiently", async () => {
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const stream = Readable.from([Buffer.from(largeContent)]);

      mockS3.mockSend.mockResolvedValueOnce({
        Body: stream,
      });

      const result = await resolver.resolve("s3://bucket/large.txt", {}, logger);

      expect(result).toBe(largeContent);
      expect(result.length).toBe(1024 * 1024);
    });
  });

  describe("error handling", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it.skip("should handle object not found errors", async () => {
      const notFoundError = new Error("NoSuchKey");
      notFoundError.name = "NoSuchKey";
      mockS3.mockSend.mockRejectedValueOnce(notFoundError);

      await expect(resolver.resolve("s3://bucket/missing.txt", {}, logger)).rejects.toThrow(
        ConfigurationError,
      );
    });

    it.skip("should handle access denied errors", async () => {
      const accessError = new Error("AccessDenied");
      accessError.name = "AccessDenied";
      mockS3.mockSend.mockRejectedValueOnce(accessError);

      await expect(resolver.resolve("s3://forbidden/file.txt", {}, logger)).rejects.toThrow(
        ConfigurationError,
      );
    });

    it.skip("should handle bucket not found errors", async () => {
      const bucketError = new Error("NoSuchBucket");
      bucketError.name = "NoSuchBucket";
      mockS3.mockSend.mockRejectedValueOnce(bucketError);

      await expect(resolver.resolve("s3://missing-bucket/file.txt", {}, logger)).rejects.toThrow(
        ConfigurationError,
      );
    });

    it("should handle empty body responses", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: undefined,
      });

      await expect(resolver.resolve("s3://bucket/empty-body.txt", {}, logger)).rejects.toThrow(
        /Empty response body for S3 object/,
      );
    });

    it("should handle malformed S3 paths", async () => {
      await expect(resolver.resolve("s3://bucket-only", {}, logger)).rejects.toThrow(
        /Invalid S3 reference format/,
      );

      await expect(resolver.resolve("s3:///no-bucket", {}, logger)).rejects.toThrow(
        /Invalid S3 reference format/,
      );
    });

    it.skip("should log errors appropriately", async () => {
      const error = new Error("S3 test error");
      mockS3.mockSend.mockRejectedValueOnce(error);

      try {
        await resolver.resolve("s3://bucket/error.txt", {}, logger);
      } catch (e) {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "s3://bucket/error.txt",
        }),
        "Failed to resolve S3 object",
      );
    });
  });

  describe("edge cases and ternary operators", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should handle options with ternary operators", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("conditional content") },
        ContentType: "application/json",
      });

      const isProduction = true;
      const options = {
        retrieveMetadata: isProduction ? true : false,
        metadataFields: isProduction ? ["ContentType"] : [],
        cacheTtlMs: isProduction ? 20 * 60 * 1000 : 10 * 60 * 1000,
      };

      const result = await resolver.resolve("s3://bucket/conditional.json", options, logger);

      expect(result).toBe("conditional content");
    });

    it("should handle short-circuit evaluation in options", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("short-circuit content") },
      });

      const config = { enableMetadata: false };
      const options = {
        retrieveMetadata: config.enableMetadata && true, // Should be false
        metadataFields: config.enableMetadata ? ["ContentType"] : [], // Should be []
        retries: config.enableMetadata ? 1 : 3, // Should be 3
      };

      const result = await resolver.resolve("s3://bucket/short-circuit.txt", options, logger);

      expect(result).toBe("short-circuit content"); // No metadata wrapping
    });

    it("should handle nullish coalescing in options", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("nullish content") },
      });

      const userConfig = {
        retrieveMetadata: null as boolean | null,
        retries: undefined as number | undefined,
        cacheTtlMs: 0,
      };

      const options = {
        retrieveMetadata: userConfig.retrieveMetadata ?? false, // Should be false
        retries: userConfig.retries ?? 5, // Should be 5
        cacheTtlMs: userConfig.cacheTtlMs || 10000, // Should be 0 (falsy but not nullish)
      };

      const result = await resolver.resolve("s3://bucket/nullish.txt", options, logger);

      expect(result).toBe("nullish content");
    });

    it("should handle very long S3 keys", async () => {
      const longKey = "path/".repeat(200) + "file.txt"; // Very long key
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("long-key content") },
      });

      await resolver.resolve(`s3://bucket/${longKey}`, {}, logger);

      expect(mockS3.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Bucket: "bucket",
            Key: longKey,
          },
        }),
      );
    });

    it("should handle bucket names with special characters", async () => {
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue("special bucket content") },
      });

      await resolver.resolve("s3://my-bucket-123.example.com/file.txt", {}, logger);

      expect(mockS3.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Bucket: "my-bucket-123.example.com",
            Key: "file.txt",
          },
        }),
      );
    });

    it("should handle different content encodings", async () => {
      const utf8Content = "Hello, 世界! 🌍";
      mockS3.mockSend.mockResolvedValueOnce({
        Body: { transformToString: vi.fn().mockResolvedValue(utf8Content) },
      });

      const result = await resolver.resolve("s3://bucket/unicode.txt", {}, logger);

      expect(result).toBe(utf8Content);
    });
  });

  describe("performance considerations", () => {
    beforeEach(async () => {
      await resolver.initialize(logger);
    });

    it("should handle concurrent resolutions", async () => {
      // Mock multiple responses
      Array.from({ length: 10 }).forEach((_, i) => {
        mockS3.mockSend.mockResolvedValueOnce({
          Body: { transformToString: vi.fn().mockResolvedValue(`content-${i}`) },
        });
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        resolver.resolve(`s3://bucket/file-${i}.txt`, {}, logger),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toBe(`content-${i}`);
      });
    });

    it("should handle rapid successive calls", async () => {
      for (let i = 0; i < 100; i++) {
        mockS3.mockSend.mockResolvedValueOnce({
          Body: { transformToString: vi.fn().mockResolvedValue(`rapid-${i}`) },
        });
      }

      for (let i = 0; i < 100; i++) {
        const result = await resolver.resolve(`s3://bucket/rapid-${i}.txt`, {}, logger);
        expect(result).toBe(`rapid-${i}`);
      }
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources properly", async () => {
      await resolver.initialize(logger);

      // Verify resolver is initialized
      expect(resolver.protocol).toBe("s3");

      // Cleanup should not throw
      expect(() => resolver.cleanup()).not.toThrow();

      // After cleanup, resolver should still be usable but will need re-initialization
      await expect(resolver.resolve("s3://bucket/test.txt", {}, logger)).rejects.toThrow(
        "S3 resolver not initialized",
      );
    });
  });
});
