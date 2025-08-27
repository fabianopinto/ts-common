/** String helpers (pure functions) */

/** Capitalize the first letter of a string. */
export function capitalize(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

/** Convert a string to a URL-friendly slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Truncate a string to maxLength and append suffix if truncated. */
export function truncate(
  input: string,
  maxLength: number,
  suffix = "…",
): string {
  if (maxLength <= 0) return "";
  if (input.length <= maxLength) return input;
  const sliceLen = Math.max(0, maxLength - suffix.length);
  return input.slice(0, sliceLen) + suffix;
}
