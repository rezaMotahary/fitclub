"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, fetchMe, logout } from "@/lib/api";
import { canAccessPanel, loginPathForPanel, roleLabel } from "@/lib/auth";
import type { PublicAuthUser } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type Panel = "member" | "secretary" | "admin";

type AuthGateProps = {
  panel: Panel;
  title: string;
  children?: (user: PublicAuthUser) => ReactNode;
};

export function AuthGate({ panel, title, children }: AuthGateProps) {
  const router = useRouter();
  const loginHref = loginPathForPanel(panel);
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetchMe();
        if (cancelled) return;
        if (!canAccessPanel(res.user, panel)) {
          router.replace(loginHref);
          return;
        }
        setUser(res.user);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace(loginHref);
          return;
        }
        setError("ارتباط با سرور برقرار نشد. مطمئن شوید API روشن است.");
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loginHref, panel, router]);

  async function onLogout() {
    try {
      await logout();
    } catch {
      // still leave the panel
    }
    router.replace(loginHref);
  }

  if (status === "loading") {
    return (
      <main className="auth-shell">
        <ThemeToggle className="theme-toggle-float" />
        <div className="auth-card">
          <p className="auth-muted">در حال بررسی ورود…</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !user) {
    return (
      <main className="auth-shell">
        <ThemeToggle className="theme-toggle-float" />
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-error">{error ?? "ورود لازم است."}</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href={loginHref}>
              رفتن به صفحه ورود
            </Link>
            <Link className="btn btn-ghost" href="/">
              بازگشت به سایت
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (children) {
    return <>{children(user)}</>;
  }

  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card welcome-card">
        <div className="auth-card-top">
          <p className="brand-mark">FITCLUB</p>
        </div>
        <h1>وارد شدید — خوش آمدید</h1>
        <p className="auth-lead">
          {user.fullName}
          <span className="welcome-role">{roleLabel(user.role)}</span>
        </p>
        {user.membershipCode ? (
          <p className="auth-muted">
            کد عضویت:{" "}
            <span className="ltr-isolate" dir="ltr">
              {user.membershipCode}
            </span>
          </p>
        ) : null}
        {user.email ? (
          <p className="auth-muted">
            <span className="ltr-isolate" dir="ltr">
              {user.email}
            </span>
          </p>
        ) : null}
        {user.phone ? (
          <p className="auth-muted">
            <span className="ltr-isolate" dir="ltr">
              {user.phone}
            </span>
          </p>
        ) : null}
        <p className="auth-note">
          داشبورد کامل حضور و مالی هنوز آماده نیست. فعلاً فقط تأیید ورود است.
        </p>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={onLogout}>
            خروج
          </button>
          <Link className="btn btn-ghost" href="/">
            بازگشت به سایت
          </Link>
        </div>
      </div>
    </main>
  );
}
