"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  activateMember,
  archiveMember,
  fetchMe,
  fetchPlans,
  logout,
  searchMembers,
} from "@/lib/api";
import { roleLabel } from "@/lib/auth";
import type { MemberSummary, PlanPublic, PublicAuthUser } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

function formatToman(n: number): string {
  return `${n.toLocaleString("fa-IR")} تومان`;
}

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
        await Promise.all([loadPlans(), loadMembers("")]);
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
  }, [loadMembers, loadPlans]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await loadMembers(query.trim());
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
      await loadMembers(query.trim());
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
          جستجو با نام، کد FS- یا موبایل. حضور کامل هنوز در این صفحه نیست.
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
                      ? ` · پایان: ${m.subscriptionEndsOn}`
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
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void onToggleArchive(m)}
                >
                  {m.isArchived ? "فعال‌سازی" : "آرشیو"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
