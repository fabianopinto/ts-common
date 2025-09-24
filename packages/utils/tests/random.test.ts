/**
 * @fileoverview Unit tests for RandomUtils in @t68/utils
 */

import { describe, it, expect, vi } from "vitest";
import { RandomUtils, __test } from "../src/random";

function isUuidV4(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

describe("RandomUtils", () => {
  it("uuid produces RFC4122 v4 format", () => {
    const u = RandomUtils.uuid();
    expect(isUuidV4(u)).toBe(true);
  });

  it("falls back to manual UUID generation when randomUUID is unavailable (covers bytes + bit-munging path)", async () => {
    vi.resetModules();
    vi.doMock("node:crypto", async () => {
      const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
      // Deterministic bytes so we can validate format; values will be masked by version/variant bits
      const deterministic = (n: number) => Buffer.alloc(n, 0xab);
      return {
        ...actual,
        randomUUID: undefined as unknown as undefined,
        randomBytes: deterministic,
      };
    });

    const { RandomUtils: FallbackRandom } = await import("../src/random");
    const u = FallbackRandom.uuid();
    expect(isUuidV4(u)).toBe(true);
  });

  it("randomIntRejection throws RangeError when range is invalid (covers range <= 0n)", () => {
    expect(() => __test.randomIntRejection(10, 5)).toThrow(RangeError);
  });

  it("uses rejection sampling path when max === Number.MAX_SAFE_INTEGER (covers randomIntRejection)", () => {
    const min = Number.MAX_SAFE_INTEGER - 5;
    const max = Number.MAX_SAFE_INTEGER; // triggers rejection sampling path
    for (let i = 0; i < 10; i++) {
      const v = RandomUtils.randomInt(min, max);
      expect(v).toBeGreaterThanOrEqual(min);
      expect(v).toBeLessThanOrEqual(max);
    }
  });

  describe("randomInt", () => {
    it("respects inclusive bounds and equal bounds", () => {
      const x = RandomUtils.randomInt(5, 5);
      expect(x).toBe(5);
      for (let i = 0; i < 10; i++) {
        const v = RandomUtils.randomInt(0, 1);
        expect(v === 0 || v === 1).toBe(true);
      }
    });

    it("throws on invalid inputs and ordering", () => {
      expect(() => RandomUtils.randomInt(2, 1)).toThrow(RangeError);
      expect(() => RandomUtils.randomInt(Infinity, 2)).toThrow(RangeError);
      expect(() => RandomUtils.randomInt(0, Infinity)).toThrow(RangeError);
    });
  });

  describe("randomString", () => {
    it("generates with given length and charset", () => {
      const s = RandomUtils.randomString(16, "ab");
      expect(s.length).toBe(16);
      expect(/^[ab]+$/.test(s)).toBe(true);
    });

    it("handles edge cases", () => {
      expect(RandomUtils.randomString(0)).toBe("");
      expect(() => RandomUtils.randomString(-1)).toThrow(RangeError);
      expect(() => RandomUtils.randomString(4, "")).toThrow(RangeError);
    });
  });

  describe("pickOne and shuffle", () => {
    it("pickOne returns element and throws on empty", () => {
      const arr = [1, 2, 3];
      const v = RandomUtils.pickOne(arr);
      expect(arr.includes(v)).toBe(true);
      expect(() => RandomUtils.pickOne<number>([])).toThrow(RangeError);
    });

    it("shuffle returns new array with same elements", () => {
      const arr = [1, 2, 3, 4, 5];
      const out = RandomUtils.shuffle(arr);
      expect(out).not.toBe(arr);
      expect(out.sort()).toEqual(arr.slice().sort());
    });
  });
});
