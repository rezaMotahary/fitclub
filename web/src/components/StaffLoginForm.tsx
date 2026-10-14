"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, staffLogin } from "@/lib/api";
import { panelPathForRole } from "@/lib/auth";

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
      const res = await staffLogin(identifier.trim(), password);
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
      <div className="auth-card">
        <p className="brand-mark">FITCLUB</p>
        <h1>ورود پرسنل</h1>
        <p className="auth-lead">برای منشی و مدیر باشگاه</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-field">
            <span>ایمیل یا موبایل</span>
            <input
              name="identifier"
              autoComplete="username"
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
          <p>نمونه منشی: secretary@fitclub.local</p>
          <p>نمونه مدیر: admin@fitclub.local</p>
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
