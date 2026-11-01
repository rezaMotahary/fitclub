import { describe, expect, it } from "vitest";
import type { MemberSummary } from "./types";
import { pickInitialMember } from "./member-select";
import {
  parsePaymentMemberQuery,
  paymentMemberHref,
  resolveBootMember,
} from "./payment-member-query";
import { buildStaffPaths } from "./staff-paths";

const staffPaths = buildStaffPaths({
  STAFF_PATH_SECRETARY: "qx".repeat(18),
  STAFF_PATH_ADMIN: "zm".repeat(18),
});

function member(partial: Partial<MemberSummary>): MemberSummary {
  return {
    id: partial.id ?? "id",
    membershipCode: partial.membershipCode ?? "FS-0000",
    fullName: partial.fullName ?? "عضو",
    phone: null,
    sessionGender: "WOMEN",
    isArchived: false,
    coachName: null,
    debtAmount: partial.debtAmount ?? 0,
    currentPlanName: null,
    currentPhase: partial.currentPhase ?? "current",
    subscriptionEndsOn: null,
  };
}

describe("parsePaymentMemberQuery", () => {
  it("reads membership code from ?member=FS-1046", () => {
    expect(parsePaymentMemberQuery("?member=FS-1046")).toEqual({
      membershipCode: "FS-1046",
      memberId: null,
    });
    expect(parsePaymentMemberQuery("member=fs-1046")).toEqual({
      membershipCode: "FS-1046",
      memberId: null,
    });
  });

  it("reads memberId when given", () => {
    expect(parsePaymentMemberQuery("?memberId=abc-123")).toEqual({
      membershipCode: null,
      memberId: "abc-123",
    });
  });

  it("returns empty when no query", () => {
    expect(parsePaymentMemberQuery("")).toEqual({
      membershipCode: null,
      memberId: null,
    });
  });
});

describe("resolveBootMember (KI-013)", () => {
  const sara = member({ id: "sara", membershipCode: "FS-1042" });
  const ali = member({
    id: "ali",
    membershipCode: "FS-1046",
    debtAmount: 725_000,
    fullName: "علی رضایی",
  });
  const hossein = member({
    id: "hossein",
    membershipCode: "FS-1045",
    debtAmount: 445_000,
  });

  it("selects Ali when ?member=FS-1046 even if Hossein is the first debtor", () => {
    const list = [hossein, sara, ali];
    expect(pickInitialMember(list)?.id).toBe("hossein");
    expect(
      resolveBootMember(list, parsePaymentMemberQuery("?member=FS-1046"))?.id,
    ).toBe("ali");
  });

  it("falls back to debtor-first when there is no member query", () => {
    const list = [sara, ali];
    expect(resolveBootMember(list, parsePaymentMemberQuery(""))?.id).toBe("ali");
  });

  it("selects by memberId", () => {
    const list = [sara, ali];
    expect(
      resolveBootMember(list, parsePaymentMemberQuery("?memberId=sara"))?.id,
    ).toBe("sara");
  });
});

describe("paymentMemberHref", () => {
  it("builds payment links from the given panel payments path", () => {
    expect(paymentMemberHref(staffPaths.admin.payments, "FS-1046")).toBe(
      `${staffPaths.admin.payments}?member=FS-1046`,
    );
    expect(paymentMemberHref(staffPaths.secretary.payments, "FS-1042")).toBe(
      `${staffPaths.secretary.payments}?member=FS-1042`,
    );
  });
});
