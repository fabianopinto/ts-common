/**
 * @fileoverview Object utility helpers (pure functions).
 *
 * Provides common helpers for object manipulation and validation, such as
 * deep cloning, deep equality checks, and freezing objects.
 *
 * Design:
 * - Pure, non-mutating functions (object transformations return a cloned shape)
 * - Opinionated defaults with extensible options
 */

export const ObjectUtils = {
  /**
   * Deeply freeze an object (shallow for arrays/objects inside).
   *
   * @typeParam T - Object type
   * @param obj - Object to freeze
   * @returns Readonly view of the same object
   */
  deepFreeze<T extends object>(obj: T): Readonly<T> {
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
      const value = (obj as Record<string, unknown>)[key as keyof T as string];
      if (
        value &&
        (typeof value === "object" || typeof value === "function") &&
        !Object.isFrozen(value)
      ) {
        ObjectUtils.deepFreeze(value as object);
      }
    }
    return obj as Readonly<T>;
  },

  /**
   * Create a new object without undefined values.
   *
   * @typeParam T - Object type
   * @param obj - Object to compact
   * @returns New object with undefined values removed
   *
   * @example
   * ObjectUtils.compact({ a: 1, b: undefined, c: 2 })
   * // => { a: 1, c: 2 }
   */
  compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const out = {} as Partial<T>;
    (Object.keys(obj) as Array<keyof T>).forEach((key) => {
      const value = obj[key];
      if (value !== undefined) {
        out[key] = value;
      }
    });
    return out;
  },

  /**
   * Shallow equality check for plain objects.
   *
   * @param a - First object to compare
   * @param b - Second object to compare
   * @returns True if objects are shallowly equal, false otherwise
   */
  shallowEqual(a: Record<string, unknown>, b: unknown): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (typeof a !== "object" || typeof b !== "object") return false;
    const ak = Object.keys(a);
    const bk = Object.keys(b as object);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (a[k] !== (b as Record<string, unknown>)[k]) return false;
    }
    return true;
  },

  /**
   * Set a value at a dot-notation path, creating objects as needed. Mutates input.
   *
   * @typeParam T - Object type
   * @param obj - Object to modify
   * @param path - Dot-notation path to set value at
   * @param value - Value to set
   * @returns Modified object
   *
   * @example
   * ObjectUtils.deepSet({ a: { b: 1 } }, "a.b", 2)
   * // => { a: { b: 2 } }
   */
  deepSet<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
    const parts = path.split(".").filter(Boolean);
    let cursor: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i] as keyof typeof cursor as string;
      if (i === parts.length - 1) {
        (cursor as Record<string, unknown>)[key] = value as unknown;
      } else {
        const nextVal = (cursor as Record<string, unknown>)[key];
        if (typeof nextVal !== "object" || nextVal === null) {
          (cursor as Record<string, unknown>)[key] = {};
        }
        cursor = (cursor as Record<string, unknown>)[key] as Record<string, unknown>;
      }
    }
    return obj;
  },

  /**
   * Return a new object with only the specified keys.
   *
   * @typeParam T - Object type
   * @param obj - Object to pick from
   * @param keys - Array of keys to include
   * @returns New object with only the specified keys
   *
   * @example
   * ObjectUtils.pick({ a: 1, b: 2, c: 3 }, ["a", "c"])
   * // => { a: 1, c: 3 }
   */
  pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const out = {} as Pick<T, K>;
    for (const k of keys) {
      if (k in obj) {
        out[k] = obj[k];
      }
    }
    return out;
  },

  /**
   * Return a new object without the specified keys.
   *
   * @typeParam T - Object type
   * @param obj - Object to omit from
   * @param keys - Array of keys to exclude
   * @returns New object without the specified keys
   *
   * @example
   * ObjectUtils.omit({ a: 1, b: 2, c: 3 }, ["a", "c"])
   * // => { b: 2 }
   */
  omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const exclude = new Set<keyof T>(keys);
    const out = {} as Omit<T, K>;
    (Object.keys(obj) as Array<keyof T>).forEach((key) => {
      if (!exclude.has(key)) {
        (out as Record<string, unknown>)[key as string] = obj[key] as unknown;
      }
    });
    return out;
  },

  /**
   * Ensure a value is an array.
   *
   * @typeParam T - Type of array elements
   * @param value - Value to ensure is an array
   * @returns Array containing the value, or an empty array if null/undefined
   *
   * @example
   * ObjectUtils.ensureArray(1)
   * // => [1]
   *
   * @example
   * ObjectUtils.ensureArray([1, 2, 3])
   * // => [1, 2, 3]
   */
  ensureArray<T>(value: T | T[] | null | undefined): T[] {
    if (value == null) return [] as T[];
    return Array.isArray(value) ? value : [value];
  },

  /**
   * Deeply merge two plain objects with pruning semantics.
   *
   * Rules:
   * - Objects are merged recursively
   * - Arrays are replaced by the right-hand side
   * - When the source has a key with value `null`, that key is deleted from the result (pruned)
   *
   * @typeParam T - Type of the first object
   * @typeParam U - Type of the second object
   * @param target - Object to merge properties into
   * @param source - Object with properties to merge into `target`
   * @return A new object that is the result of merging `target` and `source`
   *
   * @example
   * ObjectUtils.deepMerge({ a: 1, b: { c: 2, x: 1 }, arr: [1,2] }, { b: { d: 3, x: null }, e: 4, arr: [9] })
   * // => { a: 1, b: { c: 2, d: 3 }, e: 4, arr: [9] }
   */
  deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(
    target: T,
    source: U,
  ): T & U {
    const out: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(source)) {
      // Prune on explicit null in source
      if (value === null) {
        delete out[key];
        continue;
      }

      const existing = out[key];
      const bothObjects =
        existing != null &&
        value != null &&
        typeof existing === "object" &&
        typeof value === "object" &&
        !Array.isArray(existing) &&
        !Array.isArray(value);
      if (bothObjects) {
        out[key] = ObjectUtils.deepMerge(
          existing as Record<string, unknown>,
          value as Record<string, unknown>,
        );
        continue;
      }

      // Arrays or primitives: replace
      out[key] = value as unknown;
    }
    return out as T & U;
  },

  /**
   * Safely get a value from a nested object using a dot-notation path.
   *
   * @param obj - The object to traverse
   * @param path - The dot-notation path to the desired value
   * @returns The value at the specified path, or `undefined` if the path does not exist
   *
   * @example
   * ObjectUtils.deepGet({ a: { b: 1 } }, "a.b")
   * // => 1
   *
   * @example
   * ObjectUtils.deepGet({ a: { b: 1 } }, "c")
   * // => undefined
   */
  deepGet<T = unknown>(obj: unknown, path: string): T | undefined {
    if (!obj || typeof obj !== "object" || !path) return undefined as T | undefined;
    const parts = path.split(".").filter(Boolean);
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined as T | undefined;
      }
    }
    return current as T;
  },
} as const;
