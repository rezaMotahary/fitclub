import { toAsciiDigits } from "./auth";

const PERSIAN_DIGIT = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(asciiDigits: string): string {
  return [...asciiDigits]
    .map((ch) => (/[0-9]/.test(ch) ? PERSIAN_DIGIT[Number(ch)] : ch))
    .join("");
}

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

/** Keep typing digits (fa/en); separators are re-applied by formatTomanInputLive. */
export function clampTomanInput(raw: string): string {
  let digits = "";
  for (const ch of raw) {
    const ascii = toAsciiDigits(ch);
    if (/\d/.test(ascii)) {
      digits += ascii;
      if (digits.length >= 12) break;
    }
  }
  return digits;
}

/** Grouped display: ۳٬۵۰۰٬۰۰۰ (Persian digits + separator). */
export function formatTomanGrouped(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
    return "";
  }
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return toPersianDigits(grouped);
}

/**
 * Live formatter while typing/paste: digits → grouped Persian string.
 * Empty input stays empty.
 */
export function formatTomanInputLive(raw: string): string {
  const digits = clampTomanInput(raw);
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isInteger(n)) return "";
  return formatTomanGrouped(n);
}

const ONES = [
  "صفر",
  "یک",
  "دو",
  "سه",
  "چهار",
  "پنج",
  "شش",
  "هفت",
  "هشت",
  "نه",
];
const TEENS = [
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
];
const TENS = [
  "",
  "",
  "بیست",
  "سی",
  "چهل",
  "پنجاه",
  "شصت",
  "هفتاد",
  "هشتاد",
  "نود",
];
const HUNDREDS = [
  "",
  "صد",
  "دویست",
  "سیصد",
  "چهارصد",
  "پانصد",
  "ششصد",
  "هفتصد",
  "هشتصد",
  "نهصد",
];

function underThousand(n: number): string {
  if (n === 0) return "";
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? TENS[t] : `${TENS[t]} و ${ONES[o]}`;
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (rest === 0) return HUNDREDS[h];
  return `${HUNDREDS[h]} و ${underThousand(rest)}`;
}

/** Integer ≥ 0 → Persian words (no currency). */
export function numberToPersianWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) return "";
  if (n === 0) return ONES[0];

  const parts: string[] = [];
  const scales: Array<{ div: number; label: string }> = [
    { div: 1_000_000_000, label: "میلیارد" },
    { div: 1_000_000, label: "میلیون" },
    { div: 1_000, label: "هزار" },
  ];

  let rest = n;
  for (const { div, label } of scales) {
    if (rest >= div) {
      const chunk = Math.floor(rest / div);
      rest = rest % div;
      const words =
        chunk === 1 && label === "هزار" ? "هزار" : `${underThousand(chunk)} ${label}`;
      parts.push(words);
    }
  }
  if (rest > 0) parts.push(underThousand(rest));
  return parts.join(" و ");
}

/** e.g. ۳۵۰۰۰۰۰ → «سه میلیون و پانصد هزار تومان» */
export function tomanAmountInWords(amount: number): string | null {
  if (!Number.isInteger(amount) || amount < 1) return null;
  return `${numberToPersianWords(amount)} تومان`;
}
