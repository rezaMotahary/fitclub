"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  activateMember,
  archiveMember,
  fetchAdminOverview,
  fetchMe,
  fetchPlans,
  logout,
  searchMembers,
} from "@/lib/api";
import { roleLabel, toAsciiDigits } from "@/lib/auth";
import { formatToman } from "@/lib/dashboard-format";
import { formatJalaliDay } from "@/lib/jalali-date";
import type {
  AdminOverview,
  MemberSummary,
  PlanPublic,
  PublicAuthUser,
} from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

export function StaffDesk({
  panel,
  title,
}: {
  panel: "secretary" | "admin";
  title: string;
}) {
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const loadPlans = useCallback(async () => {
    const list = await fetchPlans(panel === "admin");
    setPlans(list);
  }, [panel]);

  const loadMembers = useCallback(
    async (q: string) => {
      const list = await searchMembers(q, includeArchived);
      setMembers(list);
    },
    [includeArchived],
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setUser(me.user);
        const tasks: Promise<unknown>[] = [loadPlans(), loadMembers("")];
        if (panel === "admin") {
          tasks.push(
            fetchAdminOverview().then((o) => {
              if (!cancelled) setOverview(o);
            }),
          );
        }
        await Promise.all(tasks);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          window.location.href = "/login/staff";
          return;
        }
        setError("ارتباط با سرور برقرار نشد. کمی بعد دوباره باز کنید.");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadMembers, loadPlans, panel]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      // رقم فارسی در جستجوی موبایل مثل انگلیسی کار کند
      await loadMembers(toAsciiDigits(query.trim()));
      setNote("نتیجه جستجو به‌روز شد.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "جستجو ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleArchive(m: MemberSummary) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (m.isArchived) {
        await activateMember(m.id);
        setNote(`${m.fullName} دوباره فعال شد.`);
      } else {
        await archiveMember(m.id);
        setNote(`${m.fullName} آرشیو شد.`);
      }
      await loadMembers(toAsciiDigits(query.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "عملیات ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    try {
      await logout();
    } catch {
      // ignore
    }
    window.location.href = "/login/staff";
  }

  if (!user && !error) {
    return (
      <main className="auth-shell">
        <ThemeToggle className="theme-toggle-float" />
        <div className="auth-card">
          <p className="auth-muted">در حال بارگذاری پنل…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="desk-shell">
      <header className="desk-top">
        <div>
          <p className="brand-mark">FITCLUB</p>
          <h1>{title}</h1>
          {user ? (
            <p className="auth-muted">
              {user.fullName} · {roleLabel(user.role)}
            </p>
          ) : null}
        </div>
        <div className="desk-actions">
          <ThemeToggle />
          <Link
            className="btn btn-ghost"
            href={panel === "admin" ? "/admin/payments" : "/secretary/payments"}
          >
            پرداخت پذیرش
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            خروج
          </button>
          <Link className="btn btn-ghost" href="/">
            سایت
          </Link>
        </div>
      </header>

      {error ? <p className="auth-error desk-banner">{error}</p> : null}
      {note ? <p className="desk-ok desk-banner">{note}</p> : null}

      {panel === "admin" && overview ? (
        <section className="desk-section desk-section-first">
          <h2>نمای کلی</h2>
          <p className="auth-muted">
            فقط درآمد پذیرش (شهریه و خدمات). اجاره، حقوق و بوفه در نسخهٔ اول
            نیست.
          </p>
          <div className="dash-stats">
            <article className="att-stat">
              <div className="label">اعضای فعال</div>
              <div className="value">
                {overview.activeMembers.toLocaleString("fa-IR")}
              </div>
            </article>
            <article className="att-stat">
              <div className="label">حضور امروز</div>
              <div className="value ok">
                {overview.attendanceToday.checkInsToday.toLocaleString("fa-IR")}
              </div>
              <p className="dash-stat-hint">
                الان داخل:{" "}
                {overview.attendanceToday.insideNow.toLocaleString("fa-IR")} · رد
                امروز:{" "}
                {overview.attendanceToday.rejectedToday.toLocaleString("fa-IR")}
              </p>
            </article>
            <article className="att-stat">
              <div className="label">
                درآمد پذیرش · {overview.receptionRevenueThisMonth.monthLabel}
              </div>
              <div className="value dash-stat-text">
                {formatToman(overview.receptionRevenueThisMonth.amountToman)}
              </div>
              <p className="dash-stat-hint">
                {overview.receptionRevenueThisMonth.paymentCount.toLocaleString(
                  "fa-IR",
                )}{" "}
                پرداخت
              </p>
            </article>
          </div>

          <h3 className="dash-subhead">اشتراک نزدیک انقضا (۱۴ روز یا کمتر)</h3>
          {overview.expiringSoon.length === 0 ? (
            <p className="auth-muted">در این بازه کسی نیست.</p>
          ) : (
            <ul className="dash-list">
              {overview.expiringSoon.map((m) => (
                <li key={m.id} className="dash-list-item">
                  <div>
                    <strong>
                      {m.fullName}{" "}
                      <span className="desk-code">{m.membershipCode}</span>
                    </strong>
                    <p className="auth-muted">
                      {m.planName} · پایان {formatJalaliDay(m.endsOn)}
                    </p>
                  </div>
                  <span className="dash-list-meta warn">
                    {m.remainingDays.toLocaleString("fa-IR")} روز
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="desk-section">
        <h2>پلن‌های نمونه</h2>
        <p className="auth-muted">
          قیمت‌ها نمونه هستند؛ تعرفه رسمی را بعداً مدیر عوض می‌کند.
        </p>
        <div className="desk-plans">
          {plans.map((p) => (
            <article key={p.id} className="desk-plan">
              <h3>{p.name}</h3>
              <p>سقف هفته: {p.weeklyCap} روز</p>
              <strong>{p.priceLabel}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="desk-section">
        <h2>اعضا</h2>
        <p className="auth-muted">
          جستجو با نام، کد FS- یا موبایل. برای ثبت ورود و خروج به{" "}
          <Link href="/secretary">صفحه حضور منشی</Link> بروید.
        </p>
        <form className="desk-search" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثلاً سارا یا FS-1042 یا 0912…"
            aria-label="جستجوی عضو"
          />
          <label className="desk-check">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            آرشیو هم نشان بده
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            جستجو
          </button>
        </form>

        <div className="desk-members">
          {members.length === 0 ? (
            <p className="auth-muted">عضوی پیدا نشد.</p>
          ) : (
            members.map((m) => (
              <article key={m.id} className="desk-member">
                <div>
                  <h3>
                    {m.fullName}{" "}
                    <span className="desk-code">{m.membershipCode}</span>
                  </h3>
                  <p className="auth-muted">
                    {m.phone ?? "—"} ·{" "}
                    {m.sessionGender === "WOMEN" ? "بانوان" : "آقایان"}
                    {m.isArchived ? " · آرشیو" : ""}
                  </p>
                  <p>
                    {m.currentPlanName ?? "بدون اشتراک جاری"}
                    {m.subscriptionEndsOn
                      ? ` · پایان: ${formatJalaliDay(m.subscriptionEndsOn)}`
                      : ""}
                  </p>
                  {m.debtAmount > 0 ? (
                    <p className="desk-warn">
                      مانده شهریه: {formatToman(m.debtAmount)}
                    </p>
                  ) : (
                    <p className="desk-ok-inline">بدهی شهریه ندارد</p>
                  )}
                </div>
                <div className="att-live-actions">
                  {m.debtAmount > 0 ? (
                    <Link
                      className="btn btn-primary"
                      href={
                        panel === "admin"
                          ? `/admin/payments`
                          : `/secretary/payments`
                      }
                    >
                      ثبت پرداخت
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void onToggleArchive(m)}
                  >
                    {m.isArchived ? "فعال‌سازی" : "آرشیو"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
