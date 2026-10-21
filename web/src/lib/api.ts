import type {
  AdminOverview,
  AttendanceEligibilityResponse,
  AttendanceInsideResponse,
  AttendanceRecord,
  AttendanceTodayResponse,
  AuthMeResponse,
  CheckInResponse,
  MemberDashboard,
  MemberDetail,
  MemberOtpRequestResponse,
  MemberOtpVerifyResponse,
  MemberSummary,
  PaymentPublic,
  PlanPublic,
  RecordPaymentResponse,
  RenewSubscriptionResponse,
  StaffLoginResponse,
} from "./types";

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:3001/api"
  );
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type ApiFetchOptions = {
  method?: string;
  body?: unknown;
};

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (Array.isArray(record.message) && record.message.length > 0) {
    return String(record.message[0]);
  }
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    credentials: "include",
    headers: options.body
      ? { "Content-Type": "application/json", Accept: "application/json" }
      : { Accept: "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      messageFromBody(parsed, `خطای سرور (${res.status})`),
      res.status,
      parsed,
    );
  }

  return parsed as T;
}

export function staffLogin(identifier: string, password: string) {
  return apiFetch<StaffLoginResponse>("/auth/staff/login", {
    method: "POST",
    body: { identifier, password },
  });
}

export function requestMemberOtp(phone: string) {
  return apiFetch<MemberOtpRequestResponse>("/auth/member/otp/request", {
    method: "POST",
    body: { phone },
  });
}

export function verifyMemberOtp(phone: string, code: string) {
  return apiFetch<MemberOtpVerifyResponse>("/auth/member/otp/verify", {
    method: "POST",
    body: { phone, code },
  });
}

export function fetchMe() {
  return apiFetch<AuthMeResponse>("/auth/me");
}

export function logout() {
  return apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export function fetchPlans(includeInactive = false) {
  const q = includeInactive ? "?all=true" : "";
  return apiFetch<PlanPublic[]>(`/plans${q}`);
}

export function searchMembers(q: string, includeArchived = false) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (includeArchived) params.set("includeArchived", "true");
  const qs = params.toString();
  return apiFetch<MemberSummary[]>(`/members${qs ? `?${qs}` : ""}`);
}

export function archiveMember(id: string) {
  return apiFetch<MemberSummary>(`/members/${id}/archive`, { method: "POST" });
}

export function activateMember(id: string) {
  return apiFetch<MemberSummary>(`/members/${id}/activate`, {
    method: "POST",
  });
}

export function fetchAttendanceEligibility(memberId: string) {
  return apiFetch<AttendanceEligibilityResponse>(
    `/attendance/eligibility/${memberId}`,
  );
}

export function fetchAttendanceToday() {
  return apiFetch<AttendanceTodayResponse>("/attendance/today");
}

export function fetchAttendanceInside() {
  return apiFetch<AttendanceInsideResponse>("/attendance/inside");
}

export function attendanceCheckIn(memberId: string) {
  return apiFetch<CheckInResponse>("/attendance/check-in", {
    method: "POST",
    body: { memberId },
  });
}

export function attendanceCheckOut(params: {
  memberId?: string;
  attendanceId?: string;
}) {
  return apiFetch<{ ok: boolean; attendance: AttendanceRecord }>(
    "/attendance/check-out",
    {
      method: "POST",
      body: params,
    },
  );
}

export function voidAttendance(id: string, reason?: string) {
  return apiFetch<{ ok: boolean; attendance: AttendanceRecord }>(
    `/attendance/${id}/void`,
    {
      method: "POST",
      body: reason ? { reason } : {},
    },
  );
}

export function fetchMemberDashboard() {
  return apiFetch<MemberDashboard>("/dashboard/me");
}

export function fetchAdminOverview() {
  return apiFetch<AdminOverview>("/dashboard/admin");
}

export function fetchMember(id: string) {
  return apiFetch<MemberDetail>(`/members/${id}`);
}

export function listPayments(params: {
  memberId?: string;
  q?: string;
  method?: string;
  limit?: number;
} = {}) {
  const search = new URLSearchParams();
  if (params.memberId) search.set("memberId", params.memberId);
  if (params.q) search.set("q", params.q);
  if (params.method) search.set("method", params.method);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch<PaymentPublic[]>(`/payments${qs ? `?${qs}` : ""}`);
}

export function listMyPayments() {
  return apiFetch<PaymentPublic[]>("/payments/me");
}

export function recordReceptionPayment(body: {
  memberId: string;
  subscriptionId?: string;
  amountToman: number;
  method: "CASH" | "CARD_READER" | "CARD_TRANSFER";
  note?: string;
}) {
  return apiFetch<RecordPaymentResponse>("/payments", {
    method: "POST",
    body,
  });
}

export function renewSubscription(body: {
  memberId: string;
  planId: string;
  amountPaidToman: number;
  paymentMethod?: "CASH" | "CARD_READER" | "CARD_TRANSFER";
  startsOn?: string;
}) {
  return apiFetch<RenewSubscriptionResponse>("/subscriptions/renew", {
    method: "POST",
    body,
  });
}
