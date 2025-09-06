/**
 * @fileoverview Unit tests for ObjectUtils in @fabianopinto/utils
 */

import { describe, it, expect } from "vitest";
import { ObjectUtils } from "../src/object";

describe("ObjectUtils", () => {
  it("deepFreeze freezes nested structures", () => {
    const obj = { a: { b: 1 }, c: [1, 2] } as const as any;
    const frozen = ObjectUtils.deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.c)).toBe(true);
  });

  it("compact removes undefined values only (short-circuit)", () => {
    const obj = { a: 1, b: undefined as unknown as number, c: 0, d: false, e: "" };
    expect(ObjectUtils.compact(obj)).toEqual({ a: 1, c: 0, d: false, e: "" });
  });

  describe("shallowEqual", () => {
    it("compares shallow equality correctly", () => {
      expect(ObjectUtils.shallowEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(ObjectUtils.shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(ObjectUtils.shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
      expect(ObjectUtils.shallowEqual({ a: 1 }, null)).toBe(false);
      // non-object second arg
      expect(ObjectUtils.shallowEqual({ a: 1 }, 1 as unknown as object)).toBe(false);
    });

    it("returns true when comparing the exact same reference (covers a === b)", () => {
      const obj = { x: 1, y: 2 };
      expect(ObjectUtils.shallowEqual(obj, obj)).toBe(true);
    });
  });

  it("deepSet creates objects as needed and mutates input", () => {
    const obj: Record<string, unknown> = {};
    const out = ObjectUtils.deepSet(obj, "a.b.c", 5);
    expect(out).toBe(obj);
    expect(obj).toEqual({ a: { b: { c: 5 } } });
  });

  it("deepSet replaces non-object intermediate with object (covers typeof nextVal !== 'object')", () => {
    const obj: Record<string, unknown> = { a: 1 };
    ObjectUtils.deepSet(obj, "a.b", 2);
    expect(obj).toEqual({ a: { b: 2 } });
  });

  it("deepSet replaces null intermediate with object (covers nextVal === null)", () => {
    const obj: Record<string, unknown> = { a: null } as any;
    ObjectUtils.deepSet(obj, "a.b.c", 3);
    expect(obj).toEqual({ a: { b: { c: 3 } } });
  });

  it("pick returns only requested keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(ObjectUtils.pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("omit excludes specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(ObjectUtils.omit(obj, ["a", "c"])).toEqual({ b: 2 });
  });

  it("ensureArray wraps non-arrays and handles nullish (ternary)", () => {
    expect(ObjectUtils.ensureArray(1)).toEqual([1]);
    expect(ObjectUtils.ensureArray([1, 2])).toEqual([1, 2]);
    expect(ObjectUtils.ensureArray(null)).toEqual([]);
    expect(ObjectUtils.ensureArray(undefined)).toEqual([]);
  });
});
