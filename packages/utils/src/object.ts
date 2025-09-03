/** Object helpers (pure functions) */

/** Deeply freeze an object (shallow for arrays/objects inside). */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = obj[key as keyof T];
    if (
      value &&
      (typeof value === "object" || typeof value === "function") &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

/** Create a new object without undefined values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out = {} as Partial<T>;
  (Object.keys(obj) as Array<keyof T>).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      out[key] = value;
    }
  });
  return out;
}

/** Shallow equality check for plain objects. */
export function shallowEqual(a: Record<string, unknown>, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== (b as Record<string, unknown>)[k]) return false;
  }
  return true;
}
