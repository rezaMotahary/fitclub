import type { MemberSummary } from "./types";
import { pickInitialMember } from "./member-select";

export type PaymentMemberQuery = {
  membershipCode: string | null;
  memberId: string | null;
};

const CODE_RE = /^FS-\d+$/i;

export function parsePaymentMemberQuery(search: string): PaymentMemberQuery {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const member = params.get("member")?.trim() ?? "";
  const memberIdRaw = params.get("memberId")?.trim() ?? "";

  if (CODE_RE.test(member)) {
    return {
      membershipCode: member.toUpperCase(),
      memberId: memberIdRaw || null,
    };
  }

  return {
    membershipCode: null,
    memberId: memberIdRaw || member || null,
  };
}

export function resolveBootMember(
  list: MemberSummary[],
  query: PaymentMemberQuery,
): MemberSummary | null {
  if (query.membershipCode) {
    const hit = list.find(
      (m) => m.membershipCode.toUpperCase() === query.membershipCode,
    );
    if (hit) return hit;
  }
  if (query.memberId) {
    const hit = list.find((m) => m.id === query.memberId);
    if (hit) return hit;
  }
  if (query.membershipCode || query.memberId) {
    return null;
  }
  return pickInitialMember(list);
}

export function paymentMemberHref(
  panel: "admin" | "secretary",
  membershipCode: string,
): string {
  const base = panel === "admin" ? "/admin/payments" : "/secretary/payments";
  return `${base}?member=${encodeURIComponent(membershipCode)}`;
}
