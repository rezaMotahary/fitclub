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

/** Normalize Iranian mobile input to 09xxxxxxxxx when possible. */
export function normalizeIranMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  if (digits.length === 12 && digits.startsWith("98")) return `0${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith("09")) return digits;
  return digits;
}

export function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}
