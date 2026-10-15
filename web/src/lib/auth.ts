import type { PublicAuthUser, Role } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  MEMBER: "عضو",
  SECRETARY: "منشی",
  ADMIN: "مدیر",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

export function panelPathForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "SECRETARY":
      return "/secretary";
    case "MEMBER":
    default:
      return "/member";
  }
}

export function loginPathForPanel(panel: "member" | "secretary" | "admin"): string {
  if (panel === "member") return "/login/member";
  return "/login/staff";
}

export function canAccessPanel(
  user: PublicAuthUser | null | undefined,
  panel: "member" | "secretary" | "admin",
): boolean {
  if (!user) return false;
  if (panel === "member") return user.role === "MEMBER";
  if (panel === "secretary") {
    return user.role === "SECRETARY" || user.role === "ADMIN";
  }
  return user.role === "ADMIN";
}

/** Enough for `+98 912 123 4567` / `098…` with spaces; not endless digits. */
export const IRAN_MOBILE_INPUT_MAX_LEN = 16;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

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
    .join("");
}

/**
 * Limit typing/paste for mobile fields: keep + / spaces / dashes.
 * Local Iranian mobile → max 11 digits (`09xxxxxxxxx`);
 * `98…` / `+98…` → max 12 digits; bare `9xxxxxxxxx` → max 10.
 */
export function clampIranMobileInput(raw: string): string {
  let out = "";
  let digits = "";

  for (const ch of raw) {
    if (out.length >= IRAN_MOBILE_INPUT_MAX_LEN) break;

    if (ch === "+" && out.length === 0) {
      out += ch;
      continue;
    }
    if (ch === " " || ch === "-") {
      out += ch;
      continue;
    }

    const ascii = toAsciiDigits(ch);
    if (!/^\d$/.test(ascii)) continue;

    const next = digits + ascii;
    const maxDigits = next.startsWith("98")
      ? 12
      : next.startsWith("0")
        ? 11
        : 10;

    if (next.length > maxDigits) continue;
    digits = next;
    out += ch;
  }

  return out;
}

/** Normalize Iranian mobile input to 09xxxxxxxxx when possible. */
export function normalizeIranMobile(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  if (digits.length === 12 && digits.startsWith("98")) return `0${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith("09")) return digits;
  return digits;
}

export function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

/** OTP / numeric codes: Persian+English digits → ASCII, max length. */
export function normalizeOtpCode(raw: string, length = 6): string {
  return toAsciiDigits(raw).replace(/\D/g, "").slice(0, length);
}

/** Keep typing Persian/English digits for OTP; stop at `length`. */
export function clampOtpInput(raw: string, length = 6): string {
  let out = "";
  let digitCount = 0;
  for (const ch of raw) {
    const ascii = toAsciiDigits(ch);
    if (!/^\d$/.test(ascii)) continue;
    if (digitCount >= length) break;
    out += ch;
    digitCount += 1;
  }
  return out;
}
