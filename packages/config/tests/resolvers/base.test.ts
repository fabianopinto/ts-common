/**
 * @fileoverview Tests for base resolver functionality.
 *
 * Covers protocol extraction, reference validation, and base interfaces
 * used by all resolver implementations.
 */

import { describe, it, expect } from "vitest";
import { extractProtocol, isExternalReference } from "../../src/resolvers/base.js";

describe("Base Resolver Utilities", () => {
  describe("extractProtocol", () => {
    it("should extract protocol from valid references", () => {
      expect(extractProtocol("ssm:/param")).toBe("ssm");
      expect(extractProtocol("ssm://param")).toBe("ssm");
      expect(extractProtocol("ssm-secure:/secret")).toBe("ssm-secure");
      expect(extractProtocol("ssm-secure://secret")).toBe("ssm-secure");
      expect(extractProtocol("s3://bucket/key")).toBe("s3");
      expect(extractProtocol("https://example.com")).toBe("https");
      expect(extractProtocol("file:/path/to/file")).toBe("file");
    });

    it("should handle protocol case insensitivity", () => {
      expect(extractProtocol("SSM:/param")).toBe("ssm");
      expect(extractProtocol("S3://bucket/key")).toBe("s3");
      expect(extractProtocol("HTTPS://example.com")).toBe("https");
    });

    it("should return null for invalid references", () => {
      expect(extractProtocol("")).toBeNull();
      expect(extractProtocol("no-protocol")).toBeNull();
      expect(extractProtocol(":/missing-protocol")).toBeNull();
      expect(extractProtocol("123:/invalid-start")).toBeNull();
      expect(extractProtocol("-invalid:/start")).toBeNull();
      expect(extractProtocol(".invalid:/start")).toBeNull();
    });

    it("should return null for non-string inputs", () => {
      expect(extractProtocol(null as any)).toBeNull();
      expect(extractProtocol(undefined as any)).toBeNull();
      expect(extractProtocol(123 as any)).toBeNull();
      expect(extractProtocol({} as any)).toBeNull();
      expect(extractProtocol([] as any)).toBeNull();
      expect(extractProtocol(true as any)).toBeNull();
    });

    it("should handle edge cases in protocol format", () => {
      // Valid protocol characters: letters, numbers, +, ., -
      expect(extractProtocol("http+ssl://example.com")).toBe("http+ssl");
      expect(extractProtocol("custom.protocol://test")).toBe("custom.protocol");
      expect(extractProtocol("proto-col://test")).toBe("proto-col");
      expect(extractProtocol("a1b2c3://test")).toBe("a1b2c3");

      // Must start with letter
      expect(extractProtocol("1protocol://test")).toBeNull();
      expect(extractProtocol("+protocol://test")).toBeNull();
      expect(extractProtocol(".protocol://test")).toBeNull();
    });

    it("should handle single vs double slash formats", () => {
      expect(extractProtocol("ssm:/param")).toBe("ssm");
      expect(extractProtocol("ssm://param")).toBe("ssm");
      expect(extractProtocol("custom:/value")).toBe("custom");
      expect(extractProtocol("custom://value")).toBe("custom");
    });
  });

  describe("isExternalReference", () => {
    it("should return true for valid external references", () => {
      expect(isExternalReference("ssm:/param")).toBe(true);
      expect(isExternalReference("ssm://param")).toBe(true);
      expect(isExternalReference("ssm-secure:/secret")).toBe(true);
      expect(isExternalReference("ssm-secure://secret")).toBe(true);
      expect(isExternalReference("s3://bucket/key")).toBe(true);
      expect(isExternalReference("custom://protocol")).toBe(true);
    });

    it("should return false for invalid references", () => {
      expect(isExternalReference("")).toBe(false);
      expect(isExternalReference("plain-string")).toBe(false);
      expect(isExternalReference("no-protocol-here")).toBe(false);
      expect(isExternalReference(":/missing-protocol")).toBe(false);
      expect(isExternalReference("123:/invalid")).toBe(false);
    });

    it("should return false for non-string inputs", () => {
      expect(isExternalReference(null)).toBe(false);
      expect(isExternalReference(undefined)).toBe(false);
      expect(isExternalReference(123)).toBe(false);
      expect(isExternalReference({})).toBe(false);
      expect(isExternalReference([])).toBe(false);
      expect(isExternalReference(true)).toBe(false);
      expect(isExternalReference(false)).toBe(false);
    });

    it("should handle edge case strings", () => {
      expect(isExternalReference("   ")).toBe(false);
      expect(isExternalReference("\n")).toBe(false);
      expect(isExternalReference("\t")).toBe(false);
      expect(isExternalReference("://")).toBe(false);
      expect(isExternalReference(":")).toBe(false);
      expect(isExternalReference("/")).toBe(false);
    });

    it("should be consistent with extractProtocol", () => {
      const testCases = [
        "ssm:/param",
        "ssm://param",
        "ssm-secure:/secret",
        "s3://bucket/key",
        "invalid-string",
        "",
        ":/invalid",
        "123:/invalid",
      ];

      testCases.forEach((testCase) => {
        const hasProtocol = extractProtocol(testCase) !== null;
        const isExternal = isExternalReference(testCase);
        expect(isExternal).toBe(hasProtocol);
      });
    });
  });

  describe("protocol validation edge cases", () => {
    it("should handle very long protocols", () => {
      const longProtocol = "a".repeat(100);
      const reference = `${longProtocol}://test`;

      expect(extractProtocol(reference)).toBe(longProtocol);
      expect(isExternalReference(reference)).toBe(true);
    });

    it("should handle protocols with all valid characters", () => {
      const protocol = "abc123+.-";
      const reference = `${protocol}://test`;

      expect(extractProtocol(reference)).toBe(protocol);
      expect(isExternalReference(reference)).toBe(true);
    });

    it("should handle minimal valid protocols", () => {
      expect(extractProtocol("a:/test")).toBe("a");
      expect(isExternalReference("a:/test")).toBe(true);

      expect(extractProtocol("z://test")).toBe("z");
      expect(isExternalReference("z://test")).toBe(true);
    });

    it("should handle unicode and special characters", () => {
      // These should be invalid according to URI spec
      expect(extractProtocol("protócol://test")).toBeNull();
      expect(isExternalReference("protócol://test")).toBe(false);

      expect(extractProtocol("protocol_with_underscore://test")).toBeNull();
      expect(isExternalReference("protocol_with_underscore://test")).toBe(false);

      expect(extractProtocol("protocol with space://test")).toBeNull();
      expect(isExternalReference("protocol with space://test")).toBe(false);
    });
  });

  describe("performance considerations", () => {
    it("should handle large numbers of calls efficiently", () => {
      const testCases = ["ssm:/param", "s3://bucket/key", "invalid-string", "ssm-secure:/secret"];

      // Test many iterations to check for performance issues
      for (let i = 0; i < 1000; i++) {
        testCases.forEach((testCase) => {
          extractProtocol(testCase);
          isExternalReference(testCase);
        });
      }

      // If we get here without timeout, performance is acceptable
      expect(true).toBe(true);
    });

    it("should handle very long strings without issues", () => {
      const longString = "a".repeat(10000);
      const longReference = `protocol://${longString}`;

      expect(extractProtocol(longReference)).toBe("protocol");
      expect(isExternalReference(longReference)).toBe(true);

      // Invalid long string
      expect(extractProtocol(longString)).toBeNull();
      expect(isExternalReference(longString)).toBe(false);
    });
  });

  describe("real-world protocol examples", () => {
    it("should handle common AWS service protocols", () => {
      const awsProtocols = [
        "ssm:/aws/parameter",
        "ssm-secure:/aws/secret",
        "s3://my-bucket/config.json",
        "secretsmanager://my-secret",
        "dynamodb://table/key",
      ];

      awsProtocols.forEach((ref) => {
        expect(isExternalReference(ref)).toBe(true);
        expect(extractProtocol(ref)).toBeTruthy();
      });
    });

    it("should handle standard URI protocols", () => {
      const standardProtocols = [
        "http://example.com",
        "https://example.com",
        "ftp://files.example.com",
        "file:///path/to/file",
        "mailto:user@example.com",
      ];

      standardProtocols.forEach((ref) => {
        expect(isExternalReference(ref)).toBe(true);
        expect(extractProtocol(ref)).toBeTruthy();
      });
    });

    it("should handle custom application protocols", () => {
      const customProtocols = [
        "vault://secret/path",
        "consul://config/key",
        "etcd://cluster/key",
        "redis://cache/key",
        "database://connection/string",
      ];

      customProtocols.forEach((ref) => {
        expect(isExternalReference(ref)).toBe(true);
        expect(extractProtocol(ref)).toBeTruthy();
      });
    });
  });
});
