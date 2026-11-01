"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError, logout, staffLogin } from "@/lib/api";
import { isValidIranMobile, normalizeIranMobile } from "@/lib/auth";
import {
  staffLoginHeading,
  staffLoginLead,
  staffLoginSampleEmail,
} from "@/lib/staff-login-copy";
import type { Role } from "@/lib/types";
import { STAFF_WRONG_DOOR_MESSAGE } from "./StaffWrongDoor";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";

function resolveStaffIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) return trimmed;
  const phone = normalizeIranMobile(trimmed);
  return isValidIranMobile(phone) ? phone : trimmed;
}

export function StaffLoginForm({
  expectedRole,
  panelPath,
}: {
  expectedRole: Extract<Role, "SECRETARY" | "ADMIN">;
  panelPath: string;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await staffLogin(resolveStaffIdentifier(identifier), password);
      if (res.user.role !== expectedRole) {
        try {
          await logout();
        } catch {
          // stay on this door without revealing the other path
        }
        setError(STAFF_WRONG_DOOR_MESSAGE);
        setPending(false);
        return;
      }
      window.location.replace(panelPath);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "ایمیل/موبایل یا رمز عبور اشتباه است."
            : err.message || "ورود انجام نشد. دوباره تلاش کنید.",
        );
      } else {
        setError("ارتباط با سیستم برقرار نشد. چند لحظه بعد دوباره تلاش کنید.");
      }
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card">
        <div className="auth-card-top">
          <BrandLogo size="md" wordmark />
        </div>
        <h1>{staffLoginHeading(expectedRole)}</h1>
        <p className="auth-lead">{staffLoginLead(expectedRole)}</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-field">
            <span>ایمیل یا موبایل</span>
            <input
              name="identifier"
              autoComplete="username"
              dir="ltr"
              className="ltr-isolate"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={staffLoginSampleEmail(expectedRole)}
              required
            />
          </label>
          <label className="auth-field">
            <span>رمز عبور</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              className="ltr-isolate"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
            {pending ? "در حال ورود…" : "ورود"}
          </button>
        </form>

        <div className="auth-hint">
          <p>
            ایمیل نمونه:{" "}
            <span className="ltr-isolate" dir="ltr">
              {staffLoginSampleEmail(expectedRole)}
            </span>
          </p>
          <p>رمز نمونه در صفحهٔ «چطور باز کنم؟» نوشته شده است.</p>
        </div>

        <div className="cta-row auth-links">
          <Link className="btn btn-ghost" href="/login/member">
            ورود اعضا
          </Link>
          <Link className="btn btn-ghost" href="/">
            سایت عمومی
          </Link>
        </div>
      </div>
    </main>
  );
}
