import type { MemberSummary } from "./types";

/** Initial member on desk boot: debtor first, then sample near-expiry, then any current. */
export function pickInitialMember(
  list: MemberSummary[],
): MemberSummary | null {
  return (
    list.find((m) => m.debtAmount > 0) ??
    list.find((m) => m.membershipCode === "FS-1042") ??
    list.find((m) => m.currentPhase === "current") ??
    list[0] ??
    null
  );
}

/**
 * Only the latest started request may apply its result —
 * a slow fetch for an older member click must not overwrite a newer one.
 */
export function createLatestGate() {
  let seq = 0;
  return {
    begin(): number {
      seq += 1;
      return seq;
    },
    isLatest(ticket: number): boolean {
      return ticket === seq;
    },
  };
}
