import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Readable } from "node:stream";
import { isExternalRef, resolveSSM, resolveS3 } from "../src/resolvers";

// Mock RetryUtils to avoid retries and to simply execute the provided function
vi.mock("@t68/utils", () => ({
  RetryUtils: {
    retryAsync: vi.fn(async <T>(op: () => Promise<T>) => op()),
  },
}));

describe("resolvers.isExternalRef", () => {
  it("recognizes ssm and s3 prefixes", () => {
    expect(isExternalRef("ssm://param")).toBe(true);
    expect(isExternalRef("s3://bucket/key")).toBe(true);
  });
  it("rejects non-strings and other prefixes", () => {
    expect(isExternalRef("http://x")).toBe(false);
    expect(isExternalRef(123 as any)).toBe(false);
    expect(isExternalRef(null as any)).toBe(false);
    expect(isExternalRef(undefined as any)).toBe(false);
    expect(isExternalRef({} as any)).toBe(false);
  });
});

describe("resolvers.resolveSSM", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock("@aws-sdk/client-ssm");
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves SSM parameter via AWS SDK (happy path)", async () => {
    vi.doMock("@aws-sdk/client-ssm", () => {
      class SSMClient {
        send = vi.fn().mockResolvedValue({ Parameter: { Value: "secret" } });
      }
      class GetParameterCommand {
        constructor(public args: any) {}
      }
      return { SSMClient, GetParameterCommand };
    });
    const logger = {
      isLevelEnabled: (level: string) => level === "debug",
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(function (this: any) {
        return this;
      }),
      trace: vi.fn(),
    } as any;
    const val = await resolveSSM("ssm://my/param", logger);
    expect(val).toBe("secret");
    expect(logger.debug).toHaveBeenCalled();
  });

  it("propagates errors from AWS SDK", async () => {
    const err = new Error("boom");
    vi.doMock("@aws-sdk/client-ssm", () => {
      class SSMClient {
        send = vi.fn().mockRejectedValue(err);
      }
      class GetParameterCommand {
        constructor(public args: any) {}
      }
      return { SSMClient, GetParameterCommand };
    });
    await expect(resolveSSM("ssm://p")).rejects.toBe(err);
  });

  it("throws when value missing", async () => {
    vi.doMock("@aws-sdk/client-ssm", () => {
      class SSMClient {
        send = vi.fn().mockResolvedValue({});
      }
      class GetParameterCommand {
        constructor(public args: any) {}
      }
      return { SSMClient, GetParameterCommand };
    });
    await expect(resolveSSM("ssm://p")).rejects.toThrow(/not found|no string value/i);
  });
});

describe("resolvers.resolveS3", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock("@aws-sdk/client-s3");
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates path format", async () => {
    await expect(resolveS3("s3://onlybucket" as any)).rejects.toThrow(/invalid s3 path/i);
  });

  it("resolves via transformToString when available", async () => {
    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = vi
          .fn()
          .mockResolvedValue({ Body: { transformToString: vi.fn().mockResolvedValue("content") } });
      }
      class GetObjectCommand {
        constructor(public args: any) {}
      }
      return { S3Client, GetObjectCommand };
    });
    const text = await resolveS3("s3://b/k");
    expect(text).toBe("content");
  });

  it("falls back to Node stream when transformToString is unavailable", async () => {
    const body = Readable.from([Buffer.from("hel"), Buffer.from("lo")]);

    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = vi.fn().mockResolvedValue({ Body: body as any });
      }
      class GetObjectCommand {
        constructor(public args: any) {}
      }
      return { S3Client, GetObjectCommand };
    });

    const logger = {
      isLevelEnabled: (level: string) => level === "debug",
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(function (this: any) {
        return this;
      }),
      trace: vi.fn(),
    } as any;
    await expect(resolveS3("s3://b/k", logger)).resolves.toBe("hello");
    expect(logger.debug).toHaveBeenCalled();
  });

  it("propagates errors", async () => {
    const err = new Error("nope");
    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = vi.fn().mockRejectedValue(err);
      }
      class GetObjectCommand {
        constructor(public args: any) {}
      }
      return { S3Client, GetObjectCommand };
    });
    await expect(resolveS3("s3://b/k")).rejects.toBe(err);
  });

  it("throws when Body is empty (undefined)", async () => {
    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = vi.fn().mockResolvedValue({ Body: undefined });
      }
      class GetObjectCommand {
        constructor(public args: any) {}
      }
      return { S3Client, GetObjectCommand };
    });
    await expect(resolveS3("s3://bucket/key")).rejects.toThrow(/Empty body for s3:\/\/bucket\/key/);
  });
});
