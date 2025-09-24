import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Configuration } from "../src/configuration";
import * as Resolvers from "../src/resolvers";
import type { ConfigObject } from "../src/types";

// Minimal test logger implementing the methods used by Configuration
const makeTestLogger = () => {
  const logs: any[] = [];
  const base = {
    isLevelEnabled: (_level: string) => true,
    info: vi.fn((...args: any[]) => logs.push(["info", ...args])),
    debug: vi.fn((...args: any[]) => logs.push(["debug", ...args])),
    warn: vi.fn((...args: any[]) => logs.push(["warn", ...args])),
    error: vi.fn((...args: any[]) => logs.push(["error", ...args])),
    child: vi.fn(() => base),
  } as any;
  return base;
};

describe("Configuration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset the private singleton by re-initializing with an empty config in each test that needs it
  });

  it("supports per-call overrides: disable resolution and disable SSM decryption", async () => {
    const logger = makeTestLogger();
    const ssmSpy = vi.spyOn(Resolvers, "resolveSSM").mockResolvedValue("decrypted-secret");
    const s3Spy = vi.spyOn(Resolvers, "resolveS3").mockResolvedValue("s3-data");

    Configuration.initialize(
      {
        a: "ssm://param/secure",
        b: "s3://bucket/key",
      },
      { logger, resolve: { external: true } },
    );

    const inst = Configuration.getInstance();
    // Per-call: disable all resolution
    await expect(inst.getValue("a", { resolve: false })).resolves.toBe("ssm://param/secure");
    await expect(inst.getValue("b", { resolve: false })).resolves.toBe("s3://bucket/key");

    // Per-call: keep resolution but disable SSM decryption
    ssmSpy.mockResolvedValueOnce("plaintext-secret");
    await expect(inst.getValue("a", { resolve: true, ssmDecryption: false })).resolves.toBe(
      "plaintext-secret",
    );

    // Trigger S3 resolution with per-call enable to ensure resolver is invoked
    await expect(inst.getValue("b", { resolve: true })).resolves.toBe("s3-data");

    expect(ssmSpy).toHaveBeenCalled();
    expect(s3Spy).toHaveBeenCalled();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getInstance throws if not initialized (isolated module)", async () => {
    vi.resetModules();
    const mod = await import("../src/configuration");
    expect(() => mod.Configuration.getInstance()).toThrowError(/not been initialized/i);
  });

  it("initialize sets instance and logs", () => {
    const logger = makeTestLogger();
    const cfg = Configuration.initialize({ a: 1 } as ConfigObject, { logger });
    expect(cfg).toBeInstanceOf(Configuration);
    expect(() => Configuration.getInstance()).not.toThrow();
    expect(logger.info).toHaveBeenCalledWith("Configuration initialized");
  });

  it("uses base logger child when options.logger is not provided", async () => {
    vi.resetModules();
    const base = {
      isLevelEnabled: () => true,
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(function (this: any) {
        return this;
      }),
    };
    vi.doMock("@t68/logger", () => ({
      logger: base,
    }));
    const mod = await import("../src/configuration");
    const cfg = mod.Configuration.initialize({ foo: "bar" } as any);
    expect(cfg).toBeInstanceOf(mod.Configuration);
    // child should have been called with module tag
    expect(base.child).toHaveBeenCalledWith({ module: "config" });
    // and info should log initialization using the derived logger
    expect(base.info).toHaveBeenCalledWith("Configuration initialized");
  });

  it("has returns true/false without resolving external refs", () => {
    const logger = makeTestLogger();
    Configuration.initialize({ db: { host: "localhost" } }, { logger });
    const inst = Configuration.getInstance();
    expect(inst.has("db.host")).toBe(true);
    expect(inst.has("db.port")).toBe(false);
    expect(inst.has("db\\.host")).toBe(false); // literal dot not supported in this simple pathing
  });

  it("getValue returns undefined for missing paths", async () => {
    const logger = makeTestLogger();
    Configuration.initialize({ x: { y: 1 } }, { logger });
    const val = await Configuration.getInstance().getValue("x.z");
    expect(val).toBeUndefined();
  });

  it("getValue resolves external refs with default resolve options (external=true)", async () => {
    const logger = makeTestLogger();
    // Mock resolvers to control behavior
    const ssmSpy = vi.spyOn(Resolvers, "resolveSSM").mockResolvedValue("secret-value");
    const s3Spy = vi.spyOn(Resolvers, "resolveS3").mockResolvedValue("file-contents");

    Configuration.initialize(
      {
        a: "ssm://param/name",
        b: "s3://bucket/key",
        c: ["ssm://param2", 42, { d: "s3://b/k2" }],
        e: { nested: "nope" },
      },
      { logger },
    );

    const inst = Configuration.getInstance();
    await expect(inst.getValue("a")).resolves.toBe("secret-value");
    await expect(inst.getValue("b")).resolves.toBe("file-contents");
    await expect(inst.getValue("c")).resolves.toEqual(["secret-value", 42, { d: "file-contents" }]);
    await expect(inst.getValue("e.nested")).resolves.toBe("nope");

    expect(ssmSpy).toHaveBeenCalled();
    expect(s3Spy).toHaveBeenCalled();
  });

  it("getValue does not resolve external refs when resolve.external=false (short-circuit)", async () => {
    const logger = makeTestLogger();
    const ssmSpy = vi.spyOn(Resolvers, "resolveSSM");
    const s3Spy = vi.spyOn(Resolvers, "resolveS3");

    Configuration.initialize(
      { a: "ssm://param/name", b: "s3://b/k" },
      { logger, resolve: { external: false } },
    );

    const inst = Configuration.getInstance();
    await expect(inst.getValue("a")).resolves.toBe("ssm://param/name");
    await expect(inst.getValue("b")).resolves.toBe("s3://b/k");

    // Ensure resolvers were not called (short-circuit)
    expect(ssmSpy).not.toHaveBeenCalled();
    expect(s3Spy).not.toHaveBeenCalled();
  });

  it("maybeResolve handles objects and arrays recursively and preserves primitives", async () => {
    const logger = makeTestLogger();
    vi.spyOn(Resolvers, "resolveSSM").mockResolvedValue("v1");
    vi.spyOn(Resolvers, "resolveS3").mockResolvedValue("v2");

    Configuration.initialize(
      {
        arr: ["ssm://p", "x", 3, null],
        obj: { k: "s3://b/k" },
        prim: true,
      },
      { logger },
    );

    const inst = Configuration.getInstance();
    await expect(inst.getValue("arr")).resolves.toEqual(["v1", "x", 3, null]);
    await expect(inst.getValue("obj.k")).resolves.toBe("v2");
    await expect(inst.getValue("prim")).resolves.toBe(true);
  });

  it("resolves array root with mixed external refs and nested structures", async () => {
    const logger = makeTestLogger();
    const ssmSpy = vi.spyOn(Resolvers, "resolveSSM").mockResolvedValue("ssm-resolved");
    const s3Spy = vi.spyOn(Resolvers, "resolveS3").mockResolvedValue("s3-resolved");

    Configuration.initialize(
      {
        root: [
          "ssm://param/a",
          "s3://bucket/key",
          0,
          null,
          { deep: "ssm://param/b" },
          ["s3://bucket/another"],
        ],
      },
      { logger },
    );

    const inst = Configuration.getInstance();
    await expect(inst.getValue("root")).resolves.toEqual([
      "ssm-resolved",
      "s3-resolved",
      0,
      null,
      { deep: "ssm-resolved" },
      ["s3-resolved"],
    ]);
    expect(ssmSpy).toHaveBeenCalled();
    expect(s3Spy).toHaveBeenCalled();
  });
});
