import { describe, expect, it } from "vitest";
import {
  staffLoginHeading,
  staffLoginLead,
  staffLoginSampleEmail,
} from "./staff-login-copy";

describe("staff login copy", () => {
  it("uses a secretary heading and sample email on the secretary door", () => {
    expect(staffLoginHeading("SECRETARY")).toBe("ورود منشی");
    expect(staffLoginLead("SECRETARY")).toBe("برای منشی باشگاه");
    expect(staffLoginSampleEmail("SECRETARY")).toBe("secretary@fitclub.local");
  });

  it("uses an admin heading and sample email on the admin door", () => {
    expect(staffLoginHeading("ADMIN")).toBe("ورود ادمین");
    expect(staffLoginLead("ADMIN")).toBe("برای ادمین باشگاه");
    expect(staffLoginSampleEmail("ADMIN")).toBe("admin@fitclub.local");
  });
});
