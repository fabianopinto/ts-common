/**
 * @fileoverview Unit tests for NumberUtils in @fabianopinto/utils
 */

import { describe, it, expect } from "vitest";
import { NumberUtils } from "../src/number";

describe("NumberUtils", () => {
  describe("clamp", () => {
    it("clamps within bounds and handles edges", () => {
      expect(NumberUtils.clamp(10, 0, 5)).toBe(5);
      expect(NumberUtils.clamp(-2, 0, 5)).toBe(0);
      expect(NumberUtils.clamp(3, 0, 5)).toBe(3);
    });

    it("throws when min > max", () => {
      expect(() => NumberUtils.clamp(1, 5, 0)).toThrow(RangeError);
    });
  });

  describe("inRange", () => {
    it("checks inclusive bounds", () => {
      expect(NumberUtils.inRange(3, 1, 5)).toBe(true);
      expect(NumberUtils.inRange(1, 1, 5)).toBe(true);
      expect(NumberUtils.inRange(5, 1, 5)).toBe(true);
      expect(NumberUtils.inRange(0, 1, 5)).toBe(false);
      expect(NumberUtils.inRange(6, 1, 5)).toBe(false);
    });

    it("throws when min > max", () => {
      expect(() => NumberUtils.inRange(1, 3, 2)).toThrow(RangeError);
    });
  });

  describe("safeParseInt", () => {
    it("parses numbers and strings, trims and respects radix", () => {
      expect(NumberUtils.safeParseInt(12.9)).toBe(12);
      expect(NumberUtils.safeParseInt("42")).toBe(42);
      expect(NumberUtils.safeParseInt(" 08 ", 0, 10)).toBe(8);
      expect(NumberUtils.safeParseInt("x", 7)).toBe(7);
      expect(NumberUtils.safeParseInt("", 9)).toBe(9); // short-circuit empty
      expect(NumberUtils.safeParseInt(NaN as unknown as number, 5)).toBe(5);
    });

    it("returns default for non-number/non-string inputs", () => {
      expect(NumberUtils.safeParseInt(undefined, 7)).toBe(7);
      expect(NumberUtils.safeParseInt({} as any, 3)).toBe(3);
      expect(NumberUtils.safeParseInt(null as any, 4)).toBe(4);
    });
  });

  describe("safeParseFloat", () => {
    it("parses numbers and strings, defaults on NaN", () => {
      expect(NumberUtils.safeParseFloat(2)).toBe(2);
      expect(NumberUtils.safeParseFloat("3.14")).toBeCloseTo(3.14, 5);
      expect(NumberUtils.safeParseFloat(" x ", 1)).toBe(1);
      expect(NumberUtils.safeParseFloat("", 4)).toBe(4);
      expect(NumberUtils.safeParseFloat(Infinity as unknown as number, 6)).toBe(6);
    });

    it("returns default for non-number/non-string inputs", () => {
      expect(NumberUtils.safeParseFloat(undefined, 7)).toBe(7);
      expect(NumberUtils.safeParseFloat({} as any, 3)).toBe(3);
      expect(NumberUtils.safeParseFloat(null as any, 4)).toBe(4);
    });
  });
});
