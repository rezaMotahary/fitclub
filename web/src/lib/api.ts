import type {
  AuthMeResponse,
  MemberOtpRequestResponse,
  MemberOtpVerifyResponse,
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
