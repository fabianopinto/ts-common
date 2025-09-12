import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { ConfigurationFactory } from "../src/factory";
import { Configuration } from "../src/configuration";

// Helper: minimal logger to avoid external dependency behavior differences
const makeTestLogger = () =>
  ({
    isLevelEnabled: () => true,
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(function (this: any) {
      return this;
    }),
  }) as any;

// Mock fs/promises readFile for addFile tests
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

// Import mocked readFile type
import { readFile } from "node:fs/promises";

describe("ConfigurationFactory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("addObject deep merges objects (later overrides earlier, arrays replaced)", () => {
    const logger = makeTestLogger();
    const f = new ConfigurationFactory({ logger, resolveExternal: false });

    f.addObject({ a: 1, nest: { x: 1, arr: [1, 2] } } as any).addObject({
      b: 2,
      nest: { x: 3, arr: [9] },
    } as any);

    // Spy on Configuration.initialize to capture result of build
    const initSpy = vi.spyOn(Configuration, "initialize").mockReturnValue({} as any);
    f.build();

    // The factory passes merged data into initialize via 'initialize' call args
    const [{ a, b, nest }] = initSpy.mock.calls[0] as any[];
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(nest).toEqual({ x: 3, arr: [9] });
  });

  it("addFile reads JSON and merges it", async () => {
    const logger = makeTestLogger();
    const f = new ConfigurationFactory({ logger, resolveExternal: true });

    (readFile as unknown as Mock)
      .mockResolvedValueOnce('{"k":1,"nest":{"a":1}}')
      .mockResolvedValueOnce('{"nest":{"b":2}}\n');

    await f.addFile("/tmp/a.json");
    await f.addFile("/tmp/b.json");

    const initSpy = vi.spyOn(Configuration, "initialize").mockReturnValue({} as any);
    f.build();

    const [merged, options] = initSpy.mock.calls[0] as any[];
    expect(merged).toEqual({ k: 1, nest: { a: 1, b: 2 } });
    // ensure options from factory ctor are forwarded
    expect(options).toMatchObject({ resolveExternal: true });
  });

  it("addFile wraps read/parse errors in ConfigurationError with code CONFIG_READ_FILE_ERROR", async () => {
    const logger = makeTestLogger();
    const f = new ConfigurationFactory({ logger });
    (readFile as unknown as Mock).mockRejectedValueOnce(new Error("ENOENT"));

    await expect(f.addFile("/bad.json")).rejects.toMatchObject({
      name: expect.stringMatching(/ConfigurationError/),
      code: "CONFIG_READ_FILE_ERROR",
      context: { filePath: "/bad.json" },
      isOperational: false,
    });
  });

  it("buildFromObject and buildFromFiles call through to build/initialize", async () => {
    const initSpy = vi.spyOn(Configuration, "initialize").mockReturnValue({} as any);

    const cfg1 = ConfigurationFactory.buildFromObject({ x: 1 } as any, { resolveExternal: false });
    expect(initSpy).toHaveBeenCalledWith({ x: 1 }, { resolveExternal: false });
    expect(cfg1).toBeDefined();

    (readFile as unknown as Mock).mockResolvedValueOnce('{"a":1}');
    const cfg2 = await ConfigurationFactory.buildFromFiles(["/f.json"], { resolveExternal: true });
    expect(initSpy).toHaveBeenCalledWith({ a: 1 }, { resolveExternal: true });
    expect(cfg2).toBeDefined();
  });
});
