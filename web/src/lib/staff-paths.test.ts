import { describe, expect, it } from "vitest";
import {
  buildStaffPaths,
  matchStaffKey,
  parseStaffPathToken,
} from "./staff-paths";

const SECRETARY_TOKEN = "qx".repeat(18);
const ADMIN_TOKEN = "zm".repeat(18);

const fakeEnv = {
  STAFF_PATH_SECRETARY: SECRETARY_TOKEN,
  STAFF_PATH_ADMIN: ADMIN_TOKEN,
};

describe("parseStaffPathToken", () => {
  it("accepts a long url-safe token", () => {
    expect(parseStaffPathToken(SECRETARY_TOKEN, "STAFF_PATH_SECRETARY")).toBe(
      SECRETARY_TOKEN,
    );
  });

  it("rejects a short token", () => {
    expect(() => parseStaffPathToken("short-token-value", "STAFF_PATH_SECRETARY")).toThrow(
      /32/,
    );
  });

  it("rejects tokens with forbidden words", () => {
    expect(() =>
      parseStaffPathToken(
        "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxadmin",
        "STAFF_PATH_ADMIN",
      ),
    ).toThrow(/forbidden|ممنوع/i);
    expect(() =>
      parseStaffPathToken(
        "secretaryxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "STAFF_PATH_SECRETARY",
      ),
    ).toThrow(/forbidden|ممنوع/i);
    expect(() =>
      parseStaffPathToken(
        "xxxxstaffxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "STAFF_PATH_SECRETARY",
      ),
    ).toThrow(/forbidden|ممنوع/i);
    expect(() =>
      parseStaffPathToken(
        "xxxxFitClubxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "STAFF_PATH_ADMIN",
      ),
    ).toThrow(/forbidden|ممنوع/i);
  });

  it("rejects characters that are not url-safe", () => {
    expect(() =>
      parseStaffPathToken(`${SECRETARY_TOKEN}!`, "STAFF_PATH_SECRETARY"),
    ).toThrow(/url-safe|آدرس/i);
  });
});

describe("buildStaffPaths", () => {
  it("builds stable reception and overview paths from env", () => {
    const paths = buildStaffPaths(fakeEnv);
    expect(paths.secretary.home).toBe(`/${SECRETARY_TOKEN}/reception`);
    expect(paths.secretary.payments).toBe(
      `/${SECRETARY_TOKEN}/reception/payments`,
    );
    expect(paths.admin.home).toBe(`/${ADMIN_TOKEN}/overview`);
    expect(paths.admin.payments).toBe(`/${ADMIN_TOKEN}/overview/payments`);
    expect(paths.secretary.home).not.toContain("secretary");
    expect(paths.admin.home).not.toContain("admin");
  });

  it("rejects identical tokens", () => {
    expect(() =>
      buildStaffPaths({
        STAFF_PATH_SECRETARY: SECRETARY_TOKEN,
        STAFF_PATH_ADMIN: SECRETARY_TOKEN,
      }),
    ).toThrow(/differ|متفاوت/i);
  });
});

describe("matchStaffKey", () => {
  it("matches each token to its own panel only", () => {
    const paths = buildStaffPaths(fakeEnv);
    expect(matchStaffKey(SECRETARY_TOKEN, paths)).toBe("secretary");
    expect(matchStaffKey(ADMIN_TOKEN, paths)).toBe("admin");
    expect(matchStaffKey("admin", paths)).toBeNull();
    expect(matchStaffKey("secretary", paths)).toBeNull();
    expect(matchStaffKey("staff", paths)).toBeNull();
  });
});
