/** Enough for `+98 912 123 4567` / `098…` with spaces; not endless digits. */
export const IRAN_MOBILE_INPUT_MAX_LEN = 16;

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Persian / Arabic-Indic digits → ASCII 0-9. */
export function toAsciiDigits(raw: string): string {
  return [...raw]
    .map((ch) => {
      const p = PERSIAN_DIGITS.indexOf(ch);
      if (p >= 0) return String(p);
      const a = ARABIC_DIGITS.indexOf(ch);
      if (a >= 0) return String(a);
      return ch;
    })
    .join('');
}

/**
 * Limit typing/paste for mobile fields: keep + / spaces / dashes,
 * stop after 12 digits (covers 98xxxxxxxxxx), and cap raw length.
 */
export function clampIranMobileInput(raw: string): string {
  const MAX_DIGITS = 12;
  let out = '';
  let digitCount = 0;

  for (const ch of raw) {
    if (out.length >= IRAN_MOBILE_INPUT_MAX_LEN) break;

    if (ch === '+' && out.length === 0) {
      out += ch;
      continue;
    }
    if (ch === ' ' || ch === '-') {
      out += ch;
      continue;
    }

    const ascii = toAsciiDigits(ch);
    if (/^\d$/.test(ascii)) {
      if (digitCount >= MAX_DIGITS) continue;
      out += ch;
      digitCount += 1;
    }
  }

  return out;
}

/** Normalize Iranian mobile input to 09xxxxxxxxx when possible. */
export function normalizeIranMobile(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`;
  if (digits.length === 12 && digits.startsWith('98')) return `0${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith('09')) return digits;
  return digits;
}

export function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}
