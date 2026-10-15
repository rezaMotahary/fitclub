import { describe, expect, it } from "vitest";
import {
  canAccessPanel,
  clampIranMobileInput,
  isValidIranMobile,
  loginPathForPanel,
  normalizeIranMobile,
  panelPathForRole,
  roleLabel,
  toAsciiDigits,
} from "./auth";
import type { PublicAuthUser } from "./types";

const member: PublicAuthUser = {
  id: "1",
  role: "MEMBER",
  fullName: "سارا کریمی",
  phone: "09121234567",
  email: null,
  memberId: "m1",
  membershipCode: "FS-1042",
};

const secretary: PublicAuthUser = {
  id: "2",
  role: "SECRETARY",
  fullName: "مریم صالحی",
  phone: null,
  email: "secretary@fitclub.local",
  memberId: null,
  membershipCode: null,
};

const admin: PublicAuthUser = {
  id: "3",
  role: "ADMIN",
  fullName: "کاوه احمدی",
  phone: null,
  email: "admin@fitclub.local",
  memberId: null,
  membershipCode: null,
};

describe("role helpers", () => {
  it("maps roles to Persian labels and panel paths", () => {
    expect(roleLabel("ADMIN")).toBe("مدیر");
    expect(roleLabel("SECRETARY")).toBe("منشی");
    expect(roleLabel("MEMBER")).toBe("عضو");
    expect(panelPathForRole("ADMIN")).toBe("/admin");
    expect(panelPathForRole("SECRETARY")).toBe("/secretary");
    expect(panelPathForRole("MEMBER")).toBe("/member");
  });

  it("points panels to the right login pages", () => {
    expect(loginPathForPanel("member")).toBe("/login/member");
    expect(loginPathForPanel("secretary")).toBe("/login/staff");
    expect(loginPathForPanel("admin")).toBe("/login/staff");
  });
});

describe("canAccessPanel", () => {
  it("rejects missing user", () => {
    expect(canAccessPanel(null, "member")).toBe(false);
    expect(canAccessPanel(undefined, "admin")).toBe(false);
  });

  it("enforces role access", () => {
    expect(canAccessPanel(member, "member")).toBe(true);
    expect(canAccessPanel(member, "secretary")).toBe(false);
    expect(canAccessPanel(secretary, "secretary")).toBe(true);
    expect(canAccessPanel(secretary, "admin")).toBe(false);
    expect(canAccessPanel(admin, "secretary")).toBe(true);
    expect(canAccessPanel(admin, "admin")).toBe(true);
  });
});

describe("mobile normalize", () => {
  it("converts Persian and Arabic-Indic digits to ASCII", () => {
    expect(toAsciiDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("normalizes common Iranian formats (English)", () => {
    expect(normalizeIranMobile("0912 123 4567")).toBe("09121234567");
    expect(normalizeIranMobile("9121234567")).toBe("09121234567");
    expect(normalizeIranMobile("+98 912 123 4567")).toBe("09121234567");
    expect(normalizeIranMobile("989121234567")).toBe("09121234567");
  });

  it("normalizes Persian digits to 09xxxxxxxxx", () => {
    expect(normalizeIranMobile("۰۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(normalizeIranMobile("+۹۸ ۹۱۲ ۱۲۳ ۴۵۶۷")).toBe("09121234567");
    expect(normalizeIranMobile("۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
  });

  it("rejects wrong shapes after normalize", () => {
    expect(isValidIranMobile(normalizeIranMobile("08121234567"))).toBe(false);
    expect(isValidIranMobile(normalizeIranMobile("0912123456"))).toBe(false);
    expect(isValidIranMobile(normalizeIranMobile("۰۸۱۲۱۲۳۴۵۶۷"))).toBe(false);
  });

  it("clamps local numbers to 11 digits and allows +98 up to 12", () => {
    expect(clampIranMobileInput("0912123456789012345")).toBe("09121234567");
    expect(clampIranMobileInput("۰۹۱۲۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵")).toBe("۰۹۱۲۱۲۳۴۵۶۷");
    expect(clampIranMobileInput("912123456789")).toBe("9121234567");
    expect(clampIranMobileInput("98912123456789")).toBe("989121234567");
    expect(clampIranMobileInput("+98 912 123 4567")).toBe("+98 912 123 4567");
  });

  it("validates standard 09xxxxxxxxx only", () => {
    expect(isValidIranMobile("09121234567")).toBe(true);
    expect(isValidIranMobile("0912123456")).toBe(false);
    expect(isValidIranMobile("08121234567")).toBe(false);
    expect(isValidIranMobile("۰۹۱۲۱۲۳۴۵۶۷")).toBe(false);
  });
});
