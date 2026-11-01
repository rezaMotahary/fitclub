import { describe, expect, it } from "vitest";
import type { MemberSummary } from "./types";
import { pickInitialMember } from "./member-select";
import {
  parsePaymentMemberQuery,
  paymentMemberHref,
  resolveBootMember,
} from "./payment-member-query";

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
  it("builds admin and secretary payment links with the code", () => {
    expect(paymentMemberHref("admin", "FS-1046")).toBe(
      "/admin/payments?member=FS-1046",
    );
    expect(paymentMemberHref("secretary", "FS-1042")).toBe(
      "/secretary/payments?member=FS-1042",
    );
  });
});
