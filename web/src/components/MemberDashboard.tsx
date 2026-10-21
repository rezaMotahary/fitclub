"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, fetchMemberDashboard, logout } from "@/lib/api";
import {
  formatDurationMinutes,
  formatToman,
  paymentMethodLabel,
} from "@/lib/dashboard-format";
import { formatClockFa } from "@/lib/attendance-format";
import {
  formatJalaliDateTime,
  formatJalaliDay,
} from "@/lib/jalali-date";
import type { MemberDashboard as MemberDashboardData } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

export function MemberDashboard() {
  const router = useRouter();
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const dash = await fetchMemberDashboard();
        if (cancelled) return;
        setData(dash);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/login/member");
          return;
        }
        setError("ارتباط با سرور برقرار نشد. کمی بعد دوباره باز کنید.");
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onLogout() {
    try {
      await logout();
    } catch {
      // still leave
    }
    router.replace("/login/member");
  }

  if (status === "loading") {
    return (
      <main className="auth-shell">
        <ThemeToggle className="theme-toggle-float" />
        <div className="auth-card">
          <p className="auth-muted">در حال بارگذاری داشبورد…</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !data) {
    return (
      <main className="auth-shell">
        <ThemeToggle className="theme-toggle-float" />
        <div className="auth-card">
          <h1>پنل اعضا</h1>
          <p className="auth-error">{error ?? "بارگذاری ناموفق بود."}</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href="/login/member">
              ورود دوباره
            </Link>
            <Link className="btn btn-ghost" href="/">
              سایت
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { profile, subscription, weekly, notices, recentAttendance, payments } =
    data;

  return (
    <main className="desk-shell">
      <header className="desk-top">
        <div>
          <p className="brand-mark">FITCLUB</p>
          <h1>پنل اعضا</h1>
          <p className="auth-muted">
            {profile.fullName}
            {" · "}
            <span className="ltr-isolate" dir="ltr">
              {profile.membershipCode}
            </span>
          </p>
        </div>
        <div className="desk-actions">
          <ThemeToggle />
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            خروج
          </button>
          <Link className="btn btn-ghost" href="/">
            سایت
          </Link>
        </div>
      </header>

      {notices.length > 0 ? (
        <section className="dash-notices" aria-label="اعلان‌ها">
          {notices.map((n) => (
            <p
              key={`${n.type}-${n.message.slice(0, 24)}`}
              className={
                n.type === "expiry" || n.type === "debt" || n.type === "expired"
                  ? "dash-notice dash-notice-warn"
                  : "dash-notice"
              }
            >
              {n.message}
            </p>
          ))}
        </section>
      ) : null}

      <section className="desk-section">
        <h2>اشتراک فعلی</h2>
        {subscription ? (
          <div className="dash-stats">
            <article className="att-stat">
              <div className="label">پلن</div>
              <div className="value dash-stat-text">{subscription.planName}</div>
            </article>
            <article className="att-stat">
              <div className="label">روز مانده</div>
              <div className="value">
                {(subscription.remainingDays ?? 0).toLocaleString("fa-IR")}
              </div>
            </article>
            <article className="att-stat">
              <div className="label">پایان اشتراک</div>
              <div className="value dash-stat-text">
                {formatJalaliDay(subscription.endsOn)}
              </div>
            </article>
          </div>
        ) : (
          <p className="auth-muted">اشتراک جاری ندارید.</p>
        )}
        {data.upcomingSubscription ? (
          <p className="desk-ok-inline">
            دورهٔ بعدی از {formatJalaliDay(data.upcomingSubscription.startsOn)}{" "}
            ({data.upcomingSubscription.planName}) ثبت شده است.
          </p>
        ) : null}
      </section>

      <section className="desk-section">
        <h2>سهم این هفته</h2>
        <p className="auth-muted">
          هفته از شنبه تا جمعه است. شمارندهٔ «جلسه در ماه» نداریم — فقط سقف
          هفتگی.
        </p>
        <div className="dash-stats">
          <article className="att-stat">
            <div className="label">مصرف‌شده</div>
            <div className="value">
              {weekly.usedDays.toLocaleString("fa-IR")} از{" "}
              {weekly.weeklyCap.toLocaleString("fa-IR")}
            </div>
          </article>
          <article className="att-stat">
            <div className="label">مانده هفته</div>
            <div className={`value ${weekly.remaining === 0 ? "warn" : "ok"}`}>
              {weekly.remaining.toLocaleString("fa-IR")} روز
            </div>
          </article>
        </div>
        <div className="dash-week" role="list" aria-label="تقویم هفته">
          {weekly.calendar.map((d) => (
            <div
              key={d.day}
              role="listitem"
              className={[
                "dash-week-day",
                d.counted ? "counted" : "",
                d.isToday ? "today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={formatJalaliDay(d.day)}
            >
              <span className="dash-week-label">{d.weekdayLabel}</span>
              <span className="dash-week-mark">
                {d.counted ? "✓" : d.isToday ? "امروز" : "—"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="desk-section">
        <h2>حضورهای اخیر</h2>
        {recentAttendance.length === 0 ? (
          <p className="auth-muted">هنوز حضوری ثبت نشده است.</p>
        ) : (
          <ul className="dash-list">
            {recentAttendance.map((a) => (
              <li key={a.id} className="dash-list-item">
                <div>
                  <strong>
                    {a.isOpen
                      ? "داخل سالن"
                      : a.isVoided
                        ? "باطل‌شده"
                        : "حضور"}
                  </strong>
                  {a.closedAutomatically ? (
                    <span className="auth-muted"> · بستن خودکار</span>
                  ) : null}
                  <p className="auth-muted">
                    ورود: {formatJalaliDateTime(a.checkInAt)}
                    {a.checkOutAt
                      ? ` · خروج: ${formatClockFa(a.checkOutAt)}`
                      : ""}
                  </p>
                </div>
                <span className="dash-list-meta">
                  {a.isOpen
                    ? "باز"
                    : formatDurationMinutes(a.durationMinutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="desk-section">
        <h2>سوابق پرداخت</h2>
        <p className="auth-muted">
          پرداخت فقط در پذیرش ثبت می‌شود؛ از این پنل پرداخت آنلاین نیست.
        </p>
        {payments.length === 0 ? (
          <p className="auth-muted">پرداختی در پرونده نیست.</p>
        ) : (
          <ul className="dash-list">
            {payments.map((p) => (
              <li key={p.id} className="dash-list-item">
                <div>
                  <strong>{p.title}</strong>
                  <p className="auth-muted">
                    {formatJalaliDateTime(p.paidAt)} ·{" "}
                    {paymentMethodLabel(p.method)}
                  </p>
                </div>
                <span className="dash-list-meta">{formatToman(p.amountToman)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
