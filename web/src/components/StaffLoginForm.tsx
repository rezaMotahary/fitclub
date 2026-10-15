"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, staffLogin } from "@/lib/api";
import {
  isValidIranMobile,
  normalizeIranMobile,
  panelPathForRole,
} from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

function resolveStaffIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) return trimmed;
  const phone = normalizeIranMobile(trimmed);
  return isValidIranMobile(phone) ? phone : trimmed;
}

export function StaffLoginForm() {
  const router = useRouter();
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
      router.replace(panelPathForRole(res.user.role));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "شناسه یا رمز اشتباه است."
            : err.message || "ورود ناموفق بود.",
        );
      } else {
        setError("ارتباط با سرور برقرار نشد. API را روشن کنید.");
      }
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card">
        <div className="auth-card-top">
          <p className="brand-mark">FITCLUB</p>
        </div>
        <h1>ورود پرسنل</h1>
        <p className="auth-lead">برای منشی و مدیر باشگاه</p>

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
              placeholder="secretary@fitclub.local"
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
            نمونه منشی:{" "}
            <span className="ltr-isolate" dir="ltr">
              secretary@fitclub.local
            </span>
          </p>
          <p>
            نمونه مدیر:{" "}
            <span className="ltr-isolate" dir="ltr">
              admin@fitclub.local
            </span>
          </p>
          <p>رمزها در راهنمای «چطور باز کنم» آمده است.</p>
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
