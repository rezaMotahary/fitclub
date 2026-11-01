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
import type { StaffPanelPaths } from "@/lib/staff-paths";
import { formatToman } from "@/lib/dashboard-format";
import { formatJalaliDay } from "@/lib/jalali-date";
import { paymentMemberHref } from "@/lib/payment-member-query";
import type {
  AdminOverview,
  ClubSettings,
  MemberSummary,
  PlanPublic,
  PublicAuthUser,
} from "@/lib/types";
import { DeskPager } from "./DeskPager";
import { JalaliDateField } from "./JalaliDateField";
import { PanelFrame } from "./PanelFrame";
import { RevenueChart } from "./RevenueChart";
import { ThemeToggle } from "./ThemeToggle";

const MEMBER_PAGE_SIZE = 5;

type Notice = { ok?: string; error?: string };

function SectionNotice({ notice }: { notice: Notice | null | undefined }) {
  if (!notice) return null;
  if (notice.error) return <p className="auth-error">{notice.error}</p>;
  if (notice.ok) return <p className="desk-ok">{notice.ok}</p>;
  return null;
}

export function AdminDesk({ paths }: { paths: StaffPanelPaths }) {
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageCount, setMemberPageCount] = useState(1);
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<Notice | null>(null);
  const [filterNotice, setFilterNotice] = useState<Notice | null>(null);
  const [planNotice, setPlanNotice] = useState<Record<string, Notice>>({});
  const [discountNotice, setDiscountNotice] = useState<Notice | null>(null);
  const [memberNotice, setMemberNotice] = useState<Record<string, Notice>>({});
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
    async (q: string, page = 1) => {
      const res = await searchMembers(q, includeArchived, page, MEMBER_PAGE_SIZE);
      setMembers(res.items);
      setMemberPage(res.page);
      setMemberPageCount(res.pageCount);
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
        return built.error;
      }
      const o = await fetchAdminOverview(built);
      setOverview(o);
      return null;
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
          setBootError("این در برای این حساب نیست.");
          return;
        }
        setUser(me.user);
        const [clubSettings] = await Promise.all([
          fetchClubSettings(),
          loadPlans(),
          loadMembers("", 1),
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
          window.location.href = paths.home;
          return;
        }
        setBootError("ارتباط با سیستم برقرار نشد. چند لحظه بعد دوباره صفحه را باز کنید.");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadMembers, loadPlans, paths.home]);

  const monthOptions = useMemo(() => {
    const rows = overview?.receptionRevenue.monthly ?? [];
    return [...rows].reverse();
  }, [overview]);

  async function onApplyFilter(e: FormEvent) {
    e.preventDefault();
    if (iranYear == null || iranMonth == null) return;
    setBusy(true);
    setFilterNotice(null);
    try {
      const err = await loadOverview(iranYear, iranMonth, fromInput, toInput);
      if (err) {
        setFilterNotice({ error: err });
        return;
      }
      setFilterNotice({ ok: "بازه درآمد به‌روز شد." });
    } catch (err) {
      setFilterNotice({
        error: err instanceof Error ? err.message : "فیلتر ناموفق بود",
      });
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
    setFilterNotice(null);
    try {
      const err = await loadOverview(y, m, "", "");
      if (err) setFilterNotice({ error: err });
    } catch (err) {
      setFilterNotice({
        error: err instanceof Error ? err.message : "فیلتر ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSearchNotice(null);
    try {
      await loadMembers(toAsciiDigits(query.trim()), 1);
      setSearchNotice({ ok: "نتیجه جستجو به‌روز شد." });
    } catch (err) {
      setSearchNotice({
        error: err instanceof Error ? err.message : "جستجو ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onMemberPage(page: number) {
    setBusy(true);
    setSearchNotice(null);
    try {
      await loadMembers(toAsciiDigits(query.trim()), page);
    } catch (err) {
      setSearchNotice({
        error: err instanceof Error ? err.message : "جستجو ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onToggleArchive(m: MemberSummary) {
    setBusy(true);
    setMemberNotice((prev) => ({ ...prev, [m.id]: {} }));
    try {
      if (m.isArchived) {
        await activateMember(m.id);
        setMemberNotice((prev) => ({
          ...prev,
          [m.id]: { ok: `${m.fullName} دوباره فعال شد.` },
        }));
      } else {
        await archiveMember(m.id);
        setMemberNotice((prev) => ({
          ...prev,
          [m.id]: { ok: `${m.fullName} آرشیو شد.` },
        }));
      }
      await loadMembers(toAsciiDigits(query.trim()), memberPage);
    } catch (err) {
      setMemberNotice((prev) => ({
        ...prev,
        [m.id]: {
          error: err instanceof Error ? err.message : "عملیات ناموفق بود",
        },
      }));
    } finally {
      setBusy(false);
    }
  }

  async function onSavePlanPrice(plan: PlanPublic) {
    const parsed = parseTomanInput(priceDrafts[plan.id] ?? "");
    if (parsed == null) {
      setPlanNotice((prev) => ({
        ...prev,
        [plan.id]: { error: "قیمت پلن باید عدد باشد (رقم فارسی یا انگلیسی)." },
      }));
      return;
    }
    setBusy(true);
    setPlanNotice((prev) => ({ ...prev, [plan.id]: {} }));
    try {
      const updated = await updatePlan(plan.id, { priceToman: parsed });
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setPriceDrafts((prev) => ({
        ...prev,
        [updated.id]: formatTomanGrouped(updated.priceToman),
      }));
      setPlanNotice((prev) => ({
        ...prev,
        [updated.id]: {
          ok: `قیمت «${updated.name}» برای فروش‌های بعدی ${updated.priceLabel} شد. اشتراک‌های قبلی عوض نمی‌شوند.`,
        },
      }));
    } catch (err) {
      setPlanNotice((prev) => ({
        ...prev,
        [plan.id]: {
          error: err instanceof Error ? err.message : "ذخیره تعرفه ناموفق بود",
        },
      }));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDiscount(e: FormEvent) {
    e.preventDefault();
    const parsed = parsePercentInput(discountRaw);
    if (parsed == null) {
      setDiscountNotice({
        error: "درصد تخفیف باید بین ۰ تا ۱۰۰ باشد (رقم فارسی یا انگلیسی).",
      });
      return;
    }
    setBusy(true);
    setDiscountNotice(null);
    try {
      const updated = await updateClubSettings({
        earlyRenewalDiscountPercent: parsed,
      });
      setSettings(updated);
      setDiscountRaw(updated.earlyRenewalDiscountPercent.toLocaleString("fa-IR"));
      setDiscountNotice({
        ok:
          parsed === 0
            ? "تخفیف تمدید زودتر خاموش شد."
            : `تخفیف تمدید زودتر ${updated.earlyRenewalDiscountPercent.toLocaleString("fa-IR")}٪ شد.`,
      });
    } catch (err) {
      setDiscountNotice({
        error: err instanceof Error ? err.message : "ذخیره تخفیف ناموفق بود",
      });
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
    window.location.href = paths.home;
  }

  if (!user && !bootError) {
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
    <PanelFrame
      title="داشبورد مدیریت"
      lede={user ? `${user.fullName} · ${roleLabel(user.role)}` : null}
      nav={[
        { href: paths.home, label: "نمای کلی", exact: true },
        { href: paths.payments, label: "پرداخت پذیرش" },
      ]}
      onLogout={onLogout}
    >

      {bootError ? <p className="auth-error desk-banner">{bootError}</p> : null}

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
              مجموع دریافتی‌های ثبت‌شده در پذیرش (فروش اشتراک، قسط و تمدید).
              هزینه‌های باشگاه مثل اجاره، حقوق و بوفه اینجا ثبت نمی‌شود.
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
              <JalaliDateField
                label="از تاریخ"
                value={fromInput}
                onChange={setFromInput}
                placeholder="۱۴۰۵/۰۸/۰۱"
                ariaLabel="از تاریخ شمسی"
              />
              <JalaliDateField
                label="تا تاریخ"
                value={toInput}
                onChange={setToInput}
                placeholder="۱۴۰۵/۰۸/۱۵"
                ariaLabel="تا تاریخ شمسی"
              />
              <button type="submit" className="btn btn-primary" disabled={busy}>
                نمایش بازه
              </button>
            </form>
            <SectionNotice notice={filterNotice} />
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
                emptyText="در این بازه پرداختی ثبت نشده است."
                dense
              />
              <RevenueChart
                title="شش ماه اخیر"
                points={revenue.monthly.map((m) => ({
                  label: m.label,
                  amountToman: m.amountToman,
                }))}
                emptyText="در ماه‌های اخیر پرداختی ثبت نشده است."
              />
            </div>
          </section>

          <div className="admin-split">
            <section className="desk-section admin-split-block">
              <h2>نزدیک انقضا</h2>
              <p className="auth-muted">
                اعضایی که ۱۴ روز یا کمتر از اشتراکشان مانده و هنوز تمدید
                نکرده‌اند.
              </p>
              {overview.expiringSoon.length === 0 ? (
                <p className="auth-muted">فعلاً هیچ عضوی در این وضعیت نیست.</p>
              ) : (
                <ul className="dash-list">
                  {overview.expiringSoon.map((m) => (
                    <li key={m.id} className="dash-list-item">
                      <div>
                        <strong>
                          {m.fullName}{" "}
                          <span className="desk-code ltr-isolate" dir="ltr">
                            {m.membershipCode}
                          </span>
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
                تغییر قیمت فقط روی فروش‌ها و تمدیدهای بعدی اثر دارد و مبلغ
                اشتراک‌های قبلی عوض نمی‌شود.
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
                        <SectionNotice notice={planNotice[p.id]} />
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
                  عدد ۰ یعنی بدون تخفیف. این درصد فقط وقتی کم می‌شود که عضو قبل
                  از پایان اشتراک فعلی تمدید کند.
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
                <SectionNotice notice={discountNotice} />
              </form>
            </section>
          </div>
        </>
      ) : null}

      <section className="desk-section">
        <h2>اعضا</h2>
        <p className="auth-muted">
          جستجو با نام، کد عضویت (
          <span className="ltr-isolate" dir="ltr">
            FS-
          </span>
          ) یا موبایل. کارهای روزمرهٔ پذیرش (ثبت حضور، فروش اول و قسط) در پنل
          منشی انجام می‌شود.
        </p>
        <form className="desk-search" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثلاً سارا یا FS-1042 یا ۰۹۱۲…"
            aria-label="جستجوی عضو"
          />
          <label className="desk-check">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => {
                const next = e.target.checked;
                setIncludeArchived(next);
                void searchMembers(toAsciiDigits(query.trim()), next, 1, MEMBER_PAGE_SIZE)
                  .then((res) => {
                    setMembers(res.items);
                    setMemberPage(res.page);
                    setMemberPageCount(res.pageCount);
                    setSearchNotice({ ok: "نتیجه جستجو به‌روز شد." });
                  })
                  .catch((err: unknown) => {
                    setSearchNotice({
                      error:
                        err instanceof Error ? err.message : "جستجو ناموفق بود",
                    });
                  });
              }}
            />
            نمایش اعضای آرشیوشده
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            جستجو
          </button>
        </form>
        <SectionNotice notice={searchNotice} />

        <div className="desk-members admin-members">
          {members.length === 0 ? (
            <p className="auth-muted">عضوی پیدا نشد.</p>
          ) : (
            members.map((m) => (
              <article key={m.id} className="desk-member">
                <div>
                  <h3>
                    {m.fullName}{" "}
                    <span className="desk-code ltr-isolate" dir="ltr">
                      {m.membershipCode}
                    </span>
                  </h3>
                  <p className="auth-muted">
                    <span className="ltr-isolate" dir="ltr">
                      {m.phone ?? "—"}
                    </span>{" "}
                    · {m.sessionGender === "WOMEN" ? "بانوان" : "آقایان"}
                    {m.isArchived ? " · آرشیو" : ""}
                  </p>
                  <p>
                    {m.currentPlanName ?? "بدون اشتراک فعال"}
                    {m.subscriptionEndsOn
                      ? ` · پایان: ${formatJalaliDay(m.subscriptionEndsOn)}`
                      : ""}
                  </p>
                  {m.debtAmount > 0 ? (
                    <p className="desk-warn">
                      ماندهٔ شهریه: {formatToman(m.debtAmount)}
                    </p>
                  ) : (
                    <p className="desk-ok-inline">بدهی شهریه ندارد</p>
                  )}
                  <SectionNotice notice={memberNotice[m.id]} />
                </div>
                <div className="att-live-actions">
                  {m.debtAmount > 0 ? (
                    <Link
                      className="btn btn-primary"
                      href={paymentMemberHref(paths.payments, m.membershipCode)}
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
                    {m.isArchived ? "فعال‌سازی دوباره" : "آرشیو"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <DeskPager
          page={memberPage}
          pageCount={memberPageCount}
          busy={busy}
          onPage={(p) => void onMemberPage(p)}
        />
      </section>
    </PanelFrame>
  );
}
