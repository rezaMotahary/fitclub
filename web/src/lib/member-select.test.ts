import { describe, expect, it } from "vitest";
import { createLatestGate, pickInitialMember } from "./member-select";
import type { MemberSummary } from "./types";

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

describe("pickInitialMember", () => {
  it("prefers a debtor, then FS-1042, then any current member", () => {
    const sara = member({ id: "sara", membershipCode: "FS-1042" });
    const ali = member({ id: "ali", membershipCode: "FS-1046", debtAmount: 725_000 });
    const maryam = member({ id: "maryam", membershipCode: "FS-1043" });

    expect(pickInitialMember([maryam, sara, ali])?.id).toBe("ali");
    expect(pickInitialMember([maryam, sara])?.id).toBe("sara");
    expect(pickInitialMember([maryam])?.id).toBe("maryam");
    expect(pickInitialMember([])).toBeNull();
  });
});

describe("createLatestGate (KI-007 member jump)", () => {
  it("lets only the newest selection apply", () => {
    const gate = createLatestGate();
    const bootPick = gate.begin(); // boot auto-picks Ali
    const userClick = gate.begin(); // user clicks Maryam before Ali loads

    expect(gate.isLatest(bootPick)).toBe(false);
    expect(gate.isLatest(userClick)).toBe(true);
  });
});
