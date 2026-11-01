import type { Role } from "./types";

type StaffLoginRole = Extract<Role, "SECRETARY" | "ADMIN">;

export function staffLoginHeading(role: StaffLoginRole): string {
  return role === "ADMIN" ? "ورود ادمین" : "ورود منشی";
}

export function staffLoginLead(role: StaffLoginRole): string {
  return role === "ADMIN" ? "برای ادمین باشگاه" : "برای منشی باشگاه";
}

export function staffLoginSampleEmail(role: StaffLoginRole): string {
  return role === "ADMIN" ? "admin@fitclub.local" : "secretary@fitclub.local";
}
