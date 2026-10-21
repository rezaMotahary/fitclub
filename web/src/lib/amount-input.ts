import { toAsciiDigits } from "./auth";

/**
 * Parse a toman amount typed with Persian or English digits.
 * Strips separators (٬ , spaces) and returns integer toman or null.
 */
export function parseTomanInput(raw: string): number | null {
  const ascii = toAsciiDigits(raw).replace(/[^\d]/g, "");
  if (!ascii) return null;
  const n = Number(ascii);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

/** Keep typing digits (fa/en) and common thousand separators for amount fields. */
export function clampTomanInput(raw: string): string {
  let out = "";
  for (const ch of raw) {
    if (out.length >= 16) break;
    const ascii = toAsciiDigits(ch);
    if (/\d/.test(ascii) || ch === "," || ch === "٬" || ch === " ") {
      out += ch;
    }
  }
  return out;
}
