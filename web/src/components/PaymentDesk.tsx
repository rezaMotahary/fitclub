"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ApiError,
  fetchClubSettings,
  fetchMe,
  fetchMember,
  fetchPlans,
  listPayments,
  logout,
  recordReceptionPayment,
  renewSubscription,
  searchMembers,
} from "@/lib/api";
import {
  formatTomanGrouped,
  formatTomanInputLive,
  parseTomanInput,
  tomanAmountInWords,
} from "@/lib/amount-input";
import { roleLabel, toAsciiDigits } from "@/lib/auth";
import {
  formatToman,
  paymentMethodLabel,
} from "@/lib/dashboard-format";
import { formatJalaliDateTime, formatJalaliDay } from "@/lib/jalali-date";
import { createLatestGate } from "@/lib/member-select";
import {
  parsePaymentMemberQuery,
  resolveBootMember,
} from "@/lib/payment-member-query";
import { DeskPager } from "./DeskPager";
import { defaultRenewPlanId } from "@/lib/renew-plan-default";
import {
  minimumHalfTuition,
  previewRenewTuition,
} from "@/lib/renew-preview";
import type {
  MemberDetail,
  MemberSummary,
  PaymentPublic,
  PlanPublic,
  PublicAuthUser,
} from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type PayMethod = "CASH" | "CARD_READER" | "CARD_TRANSFER";
type Notice = { ok?: string; error?: string };

const MEMBER_PAGE_SIZE = 5;
const PAYMENT_PAGE_SIZE = 8;

function SectionNotice({ notice }: { notice: Notice | null | undefined }) {
  if (!notice) return null;
  if (notice.error) return <p className="auth-error">{notice.error}</p>;
  if (notice.ok) return <p className="desk-ok">{notice.ok}</p>;
  return null;
}

const METHODS: { value: PayMethod; label: string }[] = [
  { value: "CASH", label: "نقد" },
  { value: "CARD_READER", label: "کارت‌خوان" },
  { value: "CARD_TRANSFER", label: "کارت‌به‌کارت" },
];

function memberChipHint(m: MemberSummary): string {
  if (m.debtAmount > 0) return `بدهی ${formatToman(m.debtAmount)}`;
  if (m.currentPhase === "current" && m.subscriptionEndsOn) {
    return `پایان ${formatJalaliDay(m.subscriptionEndsOn)}`;
  }
  return "بدون بدهی شهریه";
}

export function PaymentDesk({
  panel,
}: {
  panel: "secretary" | "admin";
}) {
  const homeHref = panel === "admin" ? "/admin" : "/secretary";
  const title =
    panel === "admin" ? "پنل مدیریت — پرداخت پذیرش" : "پنل منشی — پرداخت پذیرش";

  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageCount, setMemberPageCount] = useState(1);
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [history, setHistory] = useState<PaymentPublic[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageCount, setHistoryPageCount] = useState(1);
  const [recent, setRecent] = useState<PaymentPublic[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentPageCount, setRecentPageCount] = useState(1);
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [amountRaw, setAmountRaw] = useState("");
  const [method, setMethod] = useState<PayMethod>("CASH");
  const [note, setNote] = useState("");
  const [renewPlanId, setRenewPlanId] = useState("");
  const [renewAmountRaw, setRenewAmountRaw] = useState("");
  const [renewMethod, setRenewMethod] = useState<PayMethod>("CASH");
  const [earlyDiscountPercent, setEarlyDiscountPercent] = useState(10);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<Notice | null>(null);
  const [payNotice, setPayNotice] = useState<Notice | null>(null);
  const [renewNotice, setRenewNotice] = useState<Notice | null>(null);

  const plansRef = useRef<PlanPublic[]>([]);
  const selectGate = useRef(createLatestGate()).current;

  const loadRecent = useCallback(
    async (page = 1) => {
      const list = await listPayments({
        method: filterMethod || undefined,
        page,
        pageSize: PAYMENT_PAGE_SIZE,
      });
      setRecent(list.items);
      setRecentPage(list.page);
      setRecentPageCount(list.pageCount);
    },
    [filterMethod],
  );

  // Stable identity: boot must not re-run when plans change (KI-007).
  const selectMember = useCallback(
    async (id: string) => {
      const ticket = selectGate.begin();
      const [detail, pays] = await Promise.all([
        fetchMember(id),
        listPayments({ memberId: id, page: 1, pageSize: PAYMENT_PAGE_SIZE }),
      ]);
      if (!selectGate.isLatest(ticket)) return;
      setSelected(detail);
      setHistory(pays.items);
      setHistoryPage(pays.page);
      setHistoryPageCount(pays.pageCount);
      setAmountRaw("");
      setNote("");
      setRenewAmountRaw("");
      setRenewPlanId(
        defaultRenewPlanId(
          detail.currentSubscription?.plan.id,
          plansRef.current.map((p) => p.id),
        ),
      );
    },
    [selectGate],
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me.user.role !== "SECRETARY" && me.user.role !== "ADMIN") {
          window.location.href = "/login/staff";
          return;
        }
        if (panel === "admin" && me.user.role !== "ADMIN") {
          window.location.href = "/secretary/payments";
          return;
        }
        setUser(me.user);
        const requested = parsePaymentMemberQuery(window.location.search);
        const [list, planList, clubSettings] = await Promise.all([
          searchMembers("", false, 1, MEMBER_PAGE_SIZE),
          fetchPlans(false),
          fetchClubSettings(),
        ]);
        if (cancelled) return;
        plansRef.current = planList;
        setMembers(list.items);
        setMemberPage(list.page);
        setMemberPageCount(list.pageCount);
        setPlans(planList);
        setEarlyDiscountPercent(clubSettings.earlyRenewalDiscountPercent);
        let pick = resolveBootMember(list.items, requested);
        if (requested.memberId && !pick) {
          await selectMember(requested.memberId);
        } else {
          if (requested.membershipCode && !pick) {
            const extra = await searchMembers(
              requested.membershipCode,
              false,
              1,
              20,
            );
            pick =
              extra.items.find(
                (m) => m.membershipCode.toUpperCase() === requested.membershipCode,
              ) ?? extra.items[0] ?? null;
          }
          if (pick) await selectMember(pick.id);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          window.location.href = "/login/staff";
          return;
        }
        setBootError("ارتباط با سرور برقرار نشد. کمی بعد دوباره باز کنید.");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [panel, selectMember]);

  useEffect(() => {
    let cancelled = false;
    listPayments({
      method: filterMethod || undefined,
      page: 1,
      pageSize: PAYMENT_PAGE_SIZE,
    })
      .then((list) => {
        if (!cancelled) {
          setRecent(list.items);
          setRecentPage(list.page);
          setRecentPageCount(list.pageCount);
        }
      })
      .catch(() => {
        /* first load may race the auth redirect */
      });
    return () => {
      cancelled = true;
    };
  }, [filterMethod]);

  const debt =
    selected?.currentSubscription?.debtToman ?? selected?.debtAmount ?? 0;
  const blocks = selected?.currentSubscription?.debtBlocksEntry ?? false;

  const renewBlockedByUpcoming = Boolean(selected?.upcomingSubscription);
  const canRenewEarly =
    Boolean(selected) &&
    !selected?.isArchived &&
    Boolean(selected?.currentSubscription) &&
    !renewBlockedByUpcoming;

  const renewingEarly = Boolean(selected?.currentSubscription);

  const selectedRenewPlan = plans.find((p) => p.id === renewPlanId) ?? null;
  const renewPreview = useMemo(() => {
    if (!selectedRenewPlan) return null;
    return previewRenewTuition({
      planPriceToman: selectedRenewPlan.priceToman,
      renewingBeforeCurrentEnds: renewingEarly,
      earlyDiscountPercent,
    });
  }, [selectedRenewPlan, renewingEarly, earlyDiscountPercent]);

  const payAmount = parseTomanInput(amountRaw);
  const payWords = payAmount != null ? tomanAmountInWords(payAmount) : null;
  const renewAmount = parseTomanInput(renewAmountRaw);
  const renewWords =
    renewAmount != null ? tomanAmountInWords(renewAmount) : null;

  async function loadMemberPage(page: number) {
    const list = await searchMembers(
      toAsciiDigits(query.trim()),
      false,
      page,
      MEMBER_PAGE_SIZE,
    );
    setMembers(list.items);
    setMemberPage(list.page);
    setMemberPageCount(list.pageCount);
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSearchNotice(null);
    try {
      await loadMemberPage(1);
      setSearchNotice({ ok: "نتیجه جستجو به‌روز شد." });
    } catch (err) {
      setSearchNotice({
        error: err instanceof Error ? err.message : "جستجو ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amount = parseTomanInput(amountRaw);
    if (amount == null || amount < 1) {
      setPayNotice({ error: "مبلغ را با رقم فارسی یا انگلیسی وارد کنید." });
      return;
    }
    setBusy(true);
    setPayNotice(null);
    try {
      const res = await recordReceptionPayment({
        memberId: selected.id,
        amountToman: amount,
        method,
        note: note.trim() || undefined,
      });
      setSelected(res.member);
      setAmountRaw("");
      setNote("");
      setPayNotice({
        ok: res.fullySettled
          ? `تسویه کامل شد. ورود از نظر شهریه باز است.`
          : `قسط ثبت شد. مانده: ${formatToman(res.subscription.debtToman)}`,
      });
      const [pays, list] = await Promise.all([
        listPayments({
          memberId: selected.id,
          page: 1,
          pageSize: PAYMENT_PAGE_SIZE,
        }),
        searchMembers(
          toAsciiDigits(query.trim()),
          false,
          memberPage,
          MEMBER_PAGE_SIZE,
        ),
        loadRecent(recentPage),
      ]);
      setHistory(pays.items);
      setHistoryPage(pays.page);
      setHistoryPageCount(pays.pageCount);
      setMembers(list.items);
      setMemberPage(list.page);
      setMemberPageCount(list.pageCount);
    } catch (err) {
      setPayNotice({
        error: err instanceof Error ? err.message : "ثبت پرداخت ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onRenew(e: FormEvent) {
    e.preventDefault();
    if (!selected || !renewPlanId) return;
    const amount = parseTomanInput(renewAmountRaw);
    if (amount == null || amount < 1) {
      setRenewNotice({
        error: "مبلغ تمدید را با رقم فارسی یا انگلیسی وارد کنید.",
      });
      return;
    }
    setBusy(true);
    setRenewNotice(null);
    try {
      const res = await renewSubscription({
        memberId: selected.id,
        planId: renewPlanId,
        amountPaidToman: amount,
        paymentMethod: renewMethod,
      });
      setSelected(res.member);
      setRenewAmountRaw("");
      const startLabel = formatJalaliDay(res.subscription.startsOn);
      const disc =
        res.subscription.discountPercentApplied > 0
          ? ` با تخفیف ${res.subscription.discountPercentApplied.toLocaleString("fa-IR")}٪`
          : "";
      setRenewNotice({
        ok: `تمدید ثبت شد${disc}. دورهٔ جدید از ${startLabel} شروع می‌شود (${res.subscription.plan.name}).`,
      });
      const [pays, list] = await Promise.all([
        listPayments({
          memberId: selected.id,
          page: 1,
          pageSize: PAYMENT_PAGE_SIZE,
        }),
        searchMembers(
          toAsciiDigits(query.trim()),
          false,
          memberPage,
          MEMBER_PAGE_SIZE,
        ),
        loadRecent(recentPage),
      ]);
      setHistory(pays.items);
      setHistoryPage(pays.page);
      setHistoryPageCount(pays.pageCount);
      setMembers(list.items);
      setMemberPage(list.page);
      setMemberPageCount(list.pageCount);
    } catch (err) {
      setRenewNotice({
        error: err instanceof Error ? err.message : "ثبت تمدید ناموفق بود",
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
    window.location.href = "/login/staff";
  }

  if (!user && !bootError) {
    return (
      <main className="auth-shell">
        <ThemeToggle className="theme-toggle-float" />
        <div className="auth-card">
          <p className="auth-muted">در حال بارگذاری پرداخت پذیرش…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="desk-shell desk-shell-wide">
      <header className="desk-top">
        <div>
          <p className="brand-mark">FITCLUB</p>
          <h1>{title}</h1>
          {user ? (
            <p className="auth-muted">
              {user.fullName} · {roleLabel(user.role)}
            </p>
          ) : null}
          <p className="auth-muted">
            قسط بدهی و تمدید اشتراک — فقط نقد / کارت‌خوان / کارت‌به‌کارت.
          </p>
        </div>
        <div className="desk-actions">
          <ThemeToggle />
          <Link className="btn btn-ghost" href={homeHref}>
            بازگشت به پنل
          </Link>
          {panel === "secretary" ? (
            <Link className="btn btn-ghost" href="/secretary">
              حضور
            </Link>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            خروج
          </button>
          <Link className="btn btn-ghost" href="/">
            سایت
          </Link>
        </div>
      </header>

      {bootError ? <p className="auth-error desk-banner">{bootError}</p> : null}

      <div className="att-layout">
        <section className="desk-section desk-section-first">
          <h2>پیدا کردن عضو</h2>
          <p className="auth-muted">
            برای تمدید زودتر، عضو نزدیک انقضا مثل{" "}
            <span className="ltr-isolate" dir="ltr">
              FS-1042
            </span>{" "}
            (سارا) را انتخاب کنید.
          </p>
          <form className="desk-search" onSubmit={onSearch}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام، کد FS- یا موبایل…"
              aria-label="جستجوی عضو برای پرداخت"
            />
            <button type="submit" className="btn btn-primary" disabled={busy}>
              جستجو
            </button>
          </form>
          <SectionNotice notice={searchNotice} />
          <div className="att-member-list">
            {members.length === 0 ? (
              <p className="auth-muted">عضوی پیدا نشد.</p>
            ) : (
              members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={
                    selected?.id === m.id
                      ? "att-member-chip active"
                      : "att-member-chip"
                  }
                  onClick={() => void selectMember(m.id)}
                >
                  <strong>
                    {m.fullName}{" "}
                    <span className="desk-code">{m.membershipCode}</span>
                  </strong>
                  <span className="auth-muted">{memberChipHint(m)}</span>
                </button>
              ))
            )}
          </div>
          <DeskPager
            page={memberPage}
            pageCount={memberPageCount}
            busy={busy}
            onPage={(p) => {
              void loadMemberPage(p).catch((err: unknown) => {
                setSearchNotice({
                  error: err instanceof Error ? err.message : "جستجو ناموفق بود",
                });
              });
            }}
          />
        </section>

        <section className="desk-section desk-section-first">
          <h2>قسط / تسویه بدهی</h2>
          {!selected ? (
            <p className="auth-muted">یک عضو را انتخاب کنید.</p>
          ) : (
            <>
              <div className="att-result">
                <div className="att-result-head">
                  <h3>
                    {selected.fullName}{" "}
                    <span className="desk-code">{selected.membershipCode}</span>
                  </h3>
                </div>
                {selected.currentSubscription ? (
                  <p className="auth-muted">
                    {selected.currentSubscription.plan.name} · پایان{" "}
                    {formatJalaliDay(selected.currentSubscription.endsOn)} ·
                    پرداخت‌شده{" "}
                    {formatToman(selected.currentSubscription.amountPaidToman)} از{" "}
                    {formatToman(selected.currentSubscription.priceToman)}
                  </p>
                ) : (
                  <p className="desk-warn">اشتراک جاری ندارد.</p>
                )}
                {selected.upcomingSubscription ? (
                  <p className="desk-ok-inline">
                    دورهٔ بعدی از{" "}
                    {formatJalaliDay(selected.upcomingSubscription.startsOn)}{" "}
                    ثبت شده — تمدید دوباره تا شروع آن مجاز نیست.
                  </p>
                ) : null}
                {debt > 0 ? (
                  <p className="desk-warn">
                    مانده بدهی: {formatToman(debt)}
                    {blocks
                      ? " — ورود به‌خاطر بدهی بسته است (از روز ۱۵)"
                      : " — تا روز ۱۴ ورود از نظر شهریه باز است"}
                  </p>
                ) : (
                  <p className="desk-ok-inline">بدهی شهریه ندارد</p>
                )}
              </div>

              {debt > 0 && selected.currentSubscription ? (
                <form className="pay-form" onSubmit={onPay}>
                  <label className="pay-field">
                    <span>مبلغ قسط (تومان)</span>
                    <input
                      value={amountRaw}
                      onChange={(e) =>
                        setAmountRaw(formatTomanInputLive(e.target.value))
                      }
                      inputMode="numeric"
                      dir="ltr"
                      className="ltr-isolate"
                      placeholder="مثلاً ۳٬۵۰۰٬۰۰۰"
                      aria-label="مبلغ پرداخت قسط"
                      disabled={busy}
                    />
                    {payWords ? (
                      <p className="pay-amount-words">{payWords}</p>
                    ) : (
                      <p className="pay-amount-words">
                        رقم فارسی یا انگلیسی؛ جداکننده خودکار گذاشته می‌شود.
                      </p>
                    )}
                  </label>
                  <label className="pay-field">
                    <span>روش</span>
                    <select
                      className="theme-select"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PayMethod)}
                      disabled={busy}
                    >
                      {METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pay-field">
                    <span>یادداشت (اختیاری)</span>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <div className="att-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => setAmountRaw(formatTomanGrouped(debt))}
                    >
                      کل مانده
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={busy}
                    >
                      ثبت قسط
                    </button>
                  </div>
                  <SectionNotice notice={payNotice} />
                </form>
              ) : (
                <SectionNotice notice={payNotice} />
              )}

              <div className="pay-renew-box">
                <h3>تمدید اشتراک</h3>
                <p className="auth-muted">
                  جدا از قسط بدهی. اگر دوره هنوز تمام نشده، دورهٔ جدید از{" "}
                  <strong>فردای روز پایان</strong> شروع می‌شود (بدون فاصله).
                  تمدید خودکار نیست.
                </p>
                {renewBlockedByUpcoming ? (
                  <p className="desk-warn">
                    دورهٔ بعدی از قبل ثبت شده؛ تا شروع آن تمدید دوباره مجاز
                    نیست.
                  </p>
                ) : !canRenewEarly || !selected.currentSubscription ? (
                  <p className="auth-muted">
                    برای تمدید زودتر، عضوی با اشتراک جاری و بدون دورهٔ بعدی لازم
                    است (نمونه: سارا FS-1042).
                  </p>
                ) : (
                  <form className="pay-form" onSubmit={onRenew}>
                    {renewPreview && selectedRenewPlan ? (
                      <p className="auth-muted">
                        شهریهٔ این تمدید: {formatToman(renewPreview.priceToman)}
                        {renewPreview.discountPercent > 0
                          ? ` (تخفیف تمدید زودتر ${renewPreview.discountPercent.toLocaleString("fa-IR")}٪ نمونه)`
                          : ""}
                        {" · "}
                        حداقل نصف:{" "}
                        {formatToman(minimumHalfTuition(renewPreview.priceToman))}
                        {" · "}
                        شروع پیش‌فرض: فردای{" "}
                        {formatJalaliDay(selected.currentSubscription.endsOn)}
                      </p>
                    ) : null}
                    <label className="pay-field">
                      <span>پلن دورهٔ بعد</span>
                      <select
                        className="theme-select"
                        value={renewPlanId}
                        onChange={(e) => {
                          setRenewPlanId(e.target.value);
                          setRenewAmountRaw("");
                        }}
                        disabled={busy}
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.priceLabel}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pay-field">
                      <span>مبلغ پرداخت تمدید (تومان)</span>
                      <input
                        value={renewAmountRaw}
                        onChange={(e) =>
                          setRenewAmountRaw(formatTomanInputLive(e.target.value))
                        }
                        inputMode="numeric"
                        dir="ltr"
                        className="ltr-isolate"
                        placeholder="حداقل نصف شهریهٔ تمدید"
                        aria-label="مبلغ تمدید"
                        disabled={busy}
                      />
                      {renewWords ? (
                        <p className="pay-amount-words">{renewWords}</p>
                      ) : (
                        <p className="pay-amount-words">
                          کمتر از نصف برای شروع دوره ثبت نمی‌شود.
                        </p>
                      )}
                    </label>
                    <label className="pay-field">
                      <span>روش</span>
                      <select
                        className="theme-select"
                        value={renewMethod}
                        onChange={(e) =>
                          setRenewMethod(e.target.value as PayMethod)
                        }
                        disabled={busy}
                      >
                        {METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="att-actions">
                      {renewPreview ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            setRenewAmountRaw(
                              formatTomanGrouped(renewPreview.priceToman),
                            )
                          }
                        >
                          مبلغ کامل
                        </button>
                      ) : null}
                      {renewPreview ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            setRenewAmountRaw(
                              formatTomanGrouped(
                                minimumHalfTuition(renewPreview.priceToman),
                              ),
                            )
                          }
                        >
                          حداقل نصف
                        </button>
                      ) : null}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={busy}
                      >
                        ثبت تمدید
                      </button>
                    </div>
                    <SectionNotice notice={renewNotice} />
                  </form>
                )}
                {renewBlockedByUpcoming || !canRenewEarly ? (
                  <SectionNotice notice={renewNotice} />
                ) : null}
              </div>

              <h3 className="dash-subhead">سوابق این عضو</h3>
              {history.length === 0 ? (
                <p className="auth-muted">پرداختی در پرونده نیست.</p>
              ) : (
                <>
                  <ul className="dash-list">
                    {history.map((p) => (
                      <li key={p.id} className="dash-list-item">
                        <div>
                          <strong>{p.title}</strong>
                          <p className="auth-muted">
                            {formatJalaliDateTime(p.paidAt)} ·{" "}
                            {paymentMethodLabel(p.method)}
                          </p>
                        </div>
                        <span className="dash-list-meta">
                          {formatToman(p.amountToman)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <DeskPager
                    page={historyPage}
                    pageCount={historyPageCount}
                    busy={busy}
                    onPage={(p) => {
                      if (!selected) return;
                      void listPayments({
                        memberId: selected.id,
                        page: p,
                        pageSize: PAYMENT_PAGE_SIZE,
                      }).then((pays) => {
                        setHistory(pays.items);
                        setHistoryPage(pays.page);
                        setHistoryPageCount(pays.pageCount);
                      });
                    }}
                  />
                </>
              )}
            </>
          )}
        </section>
      </div>

      <section className="desk-section">
        <h2>آخرین پرداخت‌های پذیرش</h2>
        <form
          className="desk-search"
          onSubmit={(e) => {
            e.preventDefault();
            void loadRecent();
          }}
        >
          <select
            className="theme-select"
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            aria-label="فیلتر روش پرداخت"
          >
            <option value="">همه روش‌ها</option>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost" disabled={busy}>
            اعمال فیلتر
          </button>
        </form>
        {recent.length === 0 ? (
          <p className="auth-muted">پرداختی نیست.</p>
        ) : (
          <>
            <ul className="dash-list">
              {recent.map((p) => (
                <li key={p.id} className="dash-list-item">
                  <div>
                    <strong>
                      {p.member?.fullName ?? "—"}{" "}
                      <span className="desk-code">
                        {p.member?.membershipCode ?? ""}
                      </span>
                    </strong>
                    <p className="auth-muted">
                      {p.title} · {formatJalaliDateTime(p.paidAt)} ·{" "}
                      {paymentMethodLabel(p.method)}
                    </p>
                  </div>
                  <span className="dash-list-meta">
                    {formatToman(p.amountToman)}
                  </span>
                </li>
              ))}
            </ul>
            <DeskPager
              page={recentPage}
              pageCount={recentPageCount}
              busy={busy}
              onPage={(p) => void loadRecent(p)}
            />
          </>
        )}
      </section>
    </main>
  );
}
