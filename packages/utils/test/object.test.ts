/**
 * @fileoverview Unit tests for ObjectUtils in @t68/utils
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

  describe("deepMerge", () => {
    it("merges nested objects and replaces arrays", () => {
      const a = { a: { x: 1, arr: [1, 2] }, b: 1 } as const;
      const b = { a: { y: 2, arr: [9] }, c: 3 } as const;
      const merged = ObjectUtils.deepMerge(a as any, b as any);
      expect(merged).toEqual({ a: { x: 1, y: 2, arr: [9] }, b: 1, c: 3 });
    });

    it("does not mutate inputs", () => {
      const a = { a: { x: 1 } };
      const b = { a: { y: 2 } };
      const copyA = JSON.parse(JSON.stringify(a));
      const copyB = JSON.parse(JSON.stringify(b));
      const merged = ObjectUtils.deepMerge(a, b);
      expect(merged).toEqual({ a: { x: 1, y: 2 } });
      expect(a).toEqual(copyA);
      expect(b).toEqual(copyB);
    });

    it("prefers right-hand side for primitive and array values", () => {
      const a = { k: 1, arr: [1, 2], obj: { a: 1 } };
      const b = { k: 2, arr: [3], obj: { a: 1, b: 2 } };
      const merged = ObjectUtils.deepMerge(a, b);
      expect(merged.k).toBe(2);
      expect(merged.arr).toEqual([3]);
      expect(merged.obj).toEqual({ a: 1, b: 2 });
    });

    it("prunes keys when source has null (object branch)", () => {
      const left = { a: { b: { c: 1 }, d: 2 }, e: 5 };
      const right = { a: { b: null }, e: null } as any;
      const merged = ObjectUtils.deepMerge(left as any, right as any);
      expect(merged).toEqual({ a: { d: 2 } });
      expect("e" in merged).toBe(false);
    });

    it("prunes entire arrays when source has null for array key", () => {
      const left = { arr: [1, 2, 3], obj: { x: 1 } } as const;
      const right = { arr: null, obj: { x: null } } as any;
      const merged = ObjectUtils.deepMerge(left as any, right as any);
      expect("arr" in merged).toBe(false);
      expect(merged.obj).toEqual({});
    });

    it("handles non-object sources gracefully", () => {
      const a = { a: 1 } as Record<string, unknown>;
      const merged = ObjectUtils.deepMerge(a, { a: 2 } as Record<string, unknown>);
      expect(merged).toEqual({ a: 2 });
    });
  });

  describe("deepGet", () => {
    const obj = {
      a: { b: { c: 123 } },
      empty: {},
      mixed: { arr: [{ x: 1 }, { y: 2 }], n: 0, f: false, s: "" },
    } as const;

    it("returns nested value for existing path", () => {
      expect(ObjectUtils.deepGet<number>(obj, "a.b.c")).toBe(123);
    });

    it("returns undefined for missing path", () => {
      expect(ObjectUtils.deepGet(obj, "a.b.z")).toBeUndefined();
      expect(ObjectUtils.deepGet(obj, "z.y.x")).toBeUndefined();
    });

    it("returns undefined for empty path or non-object input", () => {
      expect(ObjectUtils.deepGet(obj, "")).toBeUndefined();
      expect(ObjectUtils.deepGet(null, "a")).toBeUndefined();
      expect(ObjectUtils.deepGet(123 as unknown as object, "a")).toBeUndefined();
    });

    it("supports arrays in path traversal when accessed by dot key", () => {
      // Our deepGet uses object property access; numeric keys are strings in objects
      expect(ObjectUtils.deepGet(obj, "mixed.arr.0.x")).toBe(1);
      expect(ObjectUtils.deepGet(obj, "mixed.arr.1.y")).toBe(2);
    });

    it("does not treat falsy values as missing", () => {
      expect(ObjectUtils.deepGet<number>(obj, "mixed.n")).toBe(0);
      expect(ObjectUtils.deepGet<boolean>(obj, "mixed.f")).toBe(false);
      expect(ObjectUtils.deepGet<string>(obj, "mixed.s")).toBe("");
    });
  });
});
