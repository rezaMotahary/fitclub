"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  activateMember,
  archiveMember,
  fetchAdminOverview,
  fetchClubSettings,
  fetchMe,
  fetchPlans,
  logout,
  searchMembers,
  updateClubSettings,
  updatePlan,
} from "@/lib/api";
import {
  buildAdminOverviewQuery,
  parsePercentInput,
} from "@/lib/admin-overview";
import {
  formatTomanGrouped,
  formatTomanInputLive,
  parseTomanInput,
  tomanAmountInWords,
} from "@/lib/amount-input";
import { roleLabel, toAsciiDigits } from "@/lib/auth";
import { formatToman } from "@/lib/dashboard-format";
import { formatJalaliDay } from "@/lib/jalali-date";
import type {
  AdminOverview,
  ClubSettings,
  MemberSummary,
  PlanPublic,
  PublicAuthUser,
} from "@/lib/types";
import { RevenueChart } from "./RevenueChart";
import { ThemeToggle } from "./ThemeToggle";

export function AdminDesk() {
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [iranYear, setIranYear] = useState<number | null>(null);
  const [iranMonth, setIranMonth] = useState<number | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [discountRaw, setDiscountRaw] = useState("");

  const loadPlans = useCallback(async () => {
    const list = await fetchPlans(true);
    setPlans(list);
    setPriceDrafts(
      Object.fromEntries(
        list.map((p) => [p.id, formatTomanGrouped(p.priceToman)]),
      ),
    );
  }, []);

  const loadMembers = useCallback(
    async (q: string) => {
      const list = await searchMembers(q, includeArchived);
      setMembers(list);
    },
    [includeArchived],
  );

  const loadOverview = useCallback(
    async (year: number, month: number, from: string, to: string) => {
      const built = buildAdminOverviewQuery({
        iranYear: year,
        iranMonth: month,
        fromInput: from,
        toInput: to,
      });
      if ("error" in built) {
        setError(built.error);
        return;
      }
      const o = await fetchAdminOverview(built);
      setOverview(o);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me.user.role !== "ADMIN") {
          window.location.href =
            me.user.role === "SECRETARY" ? "/secretary" : "/login/staff";
          return;
        }
        setUser(me.user);
        const [clubSettings] = await Promise.all([
          fetchClubSettings(),
          loadPlans(),
          loadMembers(""),
        ]);
        if (cancelled) return;
        setSettings(clubSettings);
        setDiscountRaw(
          clubSettings.earlyRenewalDiscountPercent.toLocaleString("fa-IR"),
        );
        const o = await fetchAdminOverview();
        if (cancelled) return;
        setOverview(o);
        setIranYear(o.receptionRevenue.thisMonth.iranYear);
        setIranMonth(o.receptionRevenue.thisMonth.iranMonth);
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

  const monthOptions = useMemo(() => {
    const rows = overview?.receptionRevenue.monthly ?? [];
    return [...rows].reverse();
  }, [overview]);

  async function onApplyFilter(e: FormEvent) {
    e.preventDefault();
    if (iranYear == null || iranMonth == null) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await loadOverview(iranYear, iranMonth, fromInput, toInput);
      setNote("بازه درآمد به‌روز شد.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فیلتر ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onMonthChange(value: string) {
    const [y, m] = value.split("-").map(Number);
    if (!y || !m) return;
    setIranYear(y);
    setIranMonth(m);
    setFromInput("");
    setToInput("");
    setBusy(true);
    setError(null);
    try {
      await loadOverview(y, m, "", "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فیلتر ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
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

  async function onSavePlanPrice(plan: PlanPublic) {
    const parsed = parseTomanInput(priceDrafts[plan.id] ?? "");
    if (parsed == null) {
      setError("قیمت پلن باید عدد باشد (رقم فارسی یا انگلیسی).");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const updated = await updatePlan(plan.id, { priceToman: parsed });
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setPriceDrafts((prev) => ({
        ...prev,
        [updated.id]: formatTomanGrouped(updated.priceToman),
      }));
      setNote(
        `قیمت «${updated.name}» برای فروش‌های بعدی ${updated.priceLabel} شد. اشتراک‌های قبلی عوض نمی‌شوند.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره تعرفه ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDiscount(e: FormEvent) {
    e.preventDefault();
    const parsed = parsePercentInput(discountRaw);
    if (parsed == null) {
      setError("درصد تخفیف باید بین ۰ تا ۱۰۰ باشد (رقم فارسی یا انگلیسی).");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const updated = await updateClubSettings({
        earlyRenewalDiscountPercent: parsed,
      });
      setSettings(updated);
      setDiscountRaw(updated.earlyRenewalDiscountPercent.toLocaleString("fa-IR"));
      setNote(
        parsed === 0
          ? "تخفیف تمدید زودتر خاموش شد."
          : `تخفیف تمدید زودتر ${updated.earlyRenewalDiscountPercent.toLocaleString("fa-IR")}٪ شد.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره تخفیف ناموفق بود");
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
          <p className="auth-muted">در حال بارگذاری پنل مدیریت…</p>
        </div>
      </main>
    );
  }

  const revenue = overview?.receptionRevenue;
  const selectedMonthValue =
    iranYear != null && iranMonth != null ? `${iranYear}-${iranMonth}` : "";

  return (
    <main className="desk-shell admin-shell">
      <header className="desk-top">
        <div>
          <p className="brand-mark">FITCLUB</p>
          <h1>داشبورد مدیریت</h1>
          {user ? (
            <p className="auth-muted">
              {user.fullName} · {roleLabel(user.role)}
            </p>
          ) : null}
        </div>
        <div className="desk-actions">
          <ThemeToggle />
          <Link className="btn btn-ghost" href="/admin/payments">
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

      {overview && revenue ? (
        <>
          <section className="desk-section desk-section-first">
            <h2>وضعیت باشگاه</h2>
            <div className="admin-kpis">
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
                  {overview.attendanceToday.insideNow.toLocaleString("fa-IR")} ·
                  رد امروز:{" "}
                  {overview.attendanceToday.rejectedToday.toLocaleString("fa-IR")}
                </p>
              </article>
              <article className="att-stat">
                <div className="label">درآمد امروز</div>
                <div className="value dash-stat-text">
                  {formatToman(revenue.today.amountToman)}
                </div>
                <p className="dash-stat-hint">
                  {revenue.today.paymentCount.toLocaleString("fa-IR")} پرداخت ·{" "}
                  {revenue.today.jalaliLabel}
                </p>
              </article>
              <article className="att-stat">
                <div className="label">
                  درآمد {revenue.thisMonth.monthLabel}
                </div>
                <div className="value dash-stat-text">
                  {formatToman(revenue.thisMonth.amountToman)}
                </div>
                <p className="dash-stat-hint">
                  {revenue.thisMonth.paymentCount.toLocaleString("fa-IR")} پرداخت
                  پذیرش
                </p>
              </article>
            </div>
          </section>

          <section className="desk-section">
            <h2>درآمد پذیرش</h2>
            <p className="auth-muted">
              فقط شهریه و خدمات ثبت‌شده در پذیرش. اجاره، حقوق و بوفه در این نسخه
              نیست.
            </p>
            <form className="admin-filter" onSubmit={onApplyFilter}>
              <label className="pay-field">
                ماه شمسی
                <select
                  className="theme-select"
                  value={selectedMonthValue}
                  onChange={(e) => void onMonthChange(e.target.value)}
                  aria-label="ماه شمسی درآمد"
                >
                  {monthOptions.map((m) => (
                    <option
                      key={`${m.iranYear}-${m.iranMonth}`}
                      value={`${m.iranYear}-${m.iranMonth}`}
                    >
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pay-field">
                از تاریخ
                <input
                  dir="ltr"
                  className="ltr-isolate"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  placeholder="۱۴۰۵/۰۸/۰۱"
                  aria-label="از تاریخ شمسی"
                />
              </label>
              <label className="pay-field">
                تا تاریخ
                <input
                  dir="ltr"
                  className="ltr-isolate"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  placeholder="۱۴۰۵/۰۸/۱۵"
                  aria-label="تا تاریخ شمسی"
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                نمایش بازه
              </button>
            </form>
            <p className="admin-range-summary">
              بازه انتخابی ({revenue.range.jalaliFromLabel} تا{" "}
              {revenue.range.jalaliToLabel}):{" "}
              <strong>{formatToman(revenue.range.amountToman)}</strong>
              {" · "}
              {revenue.range.paymentCount.toLocaleString("fa-IR")} پرداخت
            </p>
            <div className="admin-charts">
              <RevenueChart
                title="درآمد روزانه در بازه"
                points={revenue.daily}
                emptyText="در این بازه پرداختی ثبت نشده."
              />
              <RevenueChart
                title="شش ماه اخیر"
                points={revenue.monthly.map((m) => ({
                  label: m.label,
                  amountToman: m.amountToman,
                }))}
                emptyText="برای ماه‌های اخیر پرداختی نیست."
              />
            </div>
          </section>

          <div className="admin-split">
            <section className="desk-section admin-split-block">
              <h2>نزدیک انقضا</h2>
              <p className="auth-muted">۱۴ روز یا کمتر، بدون تمدید ثبت‌شده.</p>
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

            <section className="desk-section admin-split-block">
              <h2>تعرفه و تخفیف تمدید</h2>
              <p className="auth-muted">
                قیمت تازه فقط برای فروش بعدی است. اشتراک‌هایی که قبلاً فروخته
                شده‌اند همان مبلغ خودشان می‌مانند.
              </p>
              <div className="admin-tariffs">
                {plans.map((p) => {
                  const draft = priceDrafts[p.id] ?? "";
                  const parsed = parseTomanInput(draft);
                  const words = parsed != null ? tomanAmountInWords(parsed) : null;
                  return (
                    <article key={p.id} className="admin-tariff">
                      <div>
                        <h3>{p.name}</h3>
                        <p className="auth-muted">
                          سقف هفته: {p.weeklyCap.toLocaleString("fa-IR")} روز
                        </p>
                      </div>
                      <div className="admin-tariff-edit">
                        <label className="pay-field">
                          قیمت (تومان)
                          <input
                            dir="ltr"
                            className="ltr-isolate"
                            value={draft}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({
                                ...prev,
                                [p.id]: formatTomanInputLive(e.target.value),
                              }))
                            }
                            inputMode="numeric"
                            aria-label={`قیمت ${p.name}`}
                          />
                        </label>
                        {words ? (
                          <p className="pay-amount-words">{words}</p>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => void onSavePlanPrice(p)}
                        >
                          ذخیره قیمت
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <form className="admin-discount" onSubmit={onSaveDiscount}>
                <label className="pay-field">
                  درصد تخفیف تمدید زودتر
                  <input
                    dir="ltr"
                    className="ltr-isolate"
                    value={discountRaw}
                    onChange={(e) => setDiscountRaw(e.target.value)}
                    inputMode="numeric"
                    aria-label="درصد تخفیف تمدید زودتر"
                  />
                </label>
                <p className="auth-muted">
                  صفر یعنی بدون تخفیف. فقط برای تمدید قبل از پایان دوره است؛ کد
                  تخفیف ماهانه نیست.
                </p>
                {settings ? (
                  <p className="dash-stat-hint">
                    الان:{" "}
                    {settings.earlyRenewalDiscountPercent.toLocaleString("fa-IR")}٪
                  </p>
                ) : null}
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  ذخیره تخفیف
                </button>
              </form>
            </section>
          </div>
        </>
      ) : null}

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
              onChange={(e) => {
                const next = e.target.checked;
                setIncludeArchived(next);
                void searchMembers(toAsciiDigits(query.trim()), next)
                  .then(setMembers)
                  .catch((err: unknown) => {
                    setError(
                      err instanceof Error ? err.message : "جستجو ناموفق بود",
                    );
                  });
              }}
            />
            آرشیو هم نشان بده
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            جستجو
          </button>
        </form>

        <div className="desk-members admin-members">
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
                    <Link className="btn btn-primary" href="/admin/payments">
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
