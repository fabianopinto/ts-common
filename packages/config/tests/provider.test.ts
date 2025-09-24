import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DefaultConfigurationProvider } from "../src/provider";
import { Configuration } from "../src/configuration";

// Minimal logger not strictly required here but used for initializing config cleanly
const logger = {
  isLevelEnabled: () => true,
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(function (this: any) {
    return this;
  }),
} as any;

describe("DefaultConfigurationProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates has and getValue to Configuration.getInstance", async () => {
    // Initialize a known instance
    Configuration.initialize({ a: { b: 123 } } as any, { logger });

    const prov = new DefaultConfigurationProvider();
    expect(prov.has("a.b")).toBe(true);
    expect(prov.has("a.c")).toBe(false);

    await expect(prov.getValue<number>("a.b")).resolves.toBe(123);
    await expect(prov.getValue("a.c")).resolves.toBeUndefined();
  });
});
