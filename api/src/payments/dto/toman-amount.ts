import { toAsciiDigits } from '../../common/iran-mobile.js';

/** Parse toman from number or Persian/English digit string. */
export function parseTomanAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
    return value;
  }
  if (typeof value === 'string') {
    const ascii = toAsciiDigits(value).replace(/[^\d]/g, '');
    if (!ascii) return null;
    const n = Number(ascii);
    if (!Number.isInteger(n)) return null;
    return n;
  }
  return null;
}
