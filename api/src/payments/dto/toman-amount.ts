import { toAsciiDigits } from '../../common/iran-mobile.js';

/** Upper bound that still fits the database integer columns (toman). */
export const MAX_TOMAN_AMOUNT = 2_000_000_000;

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
