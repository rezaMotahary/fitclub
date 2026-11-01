"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  fetchClubSettings,
  fetchMember,
  fetchPlans,
  listPayments,
  recordReceptionPayment,
  renewSubscription,
  sellSubscription,
} from "@/lib/api";
import {
  formatTomanGrouped,
  formatTomanInputLive,
  parseTomanInput,
  tomanAmountInWords,
} from "@/lib/amount-input";
import { formatToman, paymentMethodLabel } from "@/lib/dashboard-format";
import { formatJalaliDateTime, formatJalaliDay } from "@/lib/jalali-date";
import { iranTodayDay, saleStartChoices } from "@/lib/iran-day";
import { RECEPTION_PAYMENT_PAGE_SIZE } from "@/lib/reception-list";
import { defaultRenewPlanId } from "@/lib/renew-plan-default";
import {
  minimumHalfTuition,
  previewRenewTuition,
} from "@/lib/renew-preview";
import type { MemberDetail, PaymentPublic, PlanPublic } from "@/lib/types";
import { DeskPager } from "./DeskPager";
import { SectionNotice, type SectionNoticeState } from "./SectionNotice";

type PayMethod = "CASH" | "CARD_READER" | "CARD_TRANSFER";

const METHODS: { value: PayMethod; label: string }[] = [
  { value: "CASH", label: "نقد" },
  { value: "CARD_READER", label: "کارت‌خوان" },
  { value: "CARD_TRANSFER", label: "کارت‌به‌کارت" },
];

export function MemberFinance({
  memberId,
  busy = false,
  onChanged,
}: {
  memberId: string;
  busy?: boolean;
  onChanged?: () => Promise<void> | void;
}) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [history, setHistory] = useState<PaymentPublic[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageCount, setHistoryPageCount] = useState(1);
  const [earlyDiscountPercent, setEarlyDiscountPercent] = useState(10);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [payAmountRaw, setPayAmountRaw] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("CASH");
  const [payNote, setPayNote] = useState("");
  const [payNotice, setPayNotice] = useState<SectionNoticeState | null>(null);
  const [renewPlanId, setRenewPlanId] = useState("");
  const [renewAmountRaw, setRenewAmountRaw] = useState("");
  const [renewMethod, setRenewMethod] = useState<PayMethod>("CASH");
  const [renewNotice, setRenewNotice] = useState<SectionNoticeState | null>(
    null,
  );
  const [sellPlanId, setSellPlanId] = useState("");
  const [sellAmountRaw, setSellAmountRaw] = useState("");
  const [sellMethod, setSellMethod] = useState<PayMethod>("CASH");
  const [sellStart, setSellStart] = useState<"today" | "tomorrow">("today");
  const [sellNotice, setSellNotice] = useState<SectionNoticeState | null>(
    null,
  );

  const plansRef = useRef<PlanPublic[]>([]);
  const locked = busy || saving;
  const starts = saleStartChoices(iranTodayDay());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError(null);
      try {
        const [member, planList, settings, pays] = await Promise.all([
          fetchMember(memberId),
          fetchPlans(false),
          fetchClubSettings(),
          listPayments({
            memberId,
            page: 1,
            pageSize: RECEPTION_PAYMENT_PAGE_SIZE,
          }),
        ]);
        if (cancelled) return;
        plansRef.current = planList;
        setDetail(member);
        setPlans(planList);
        setEarlyDiscountPercent(settings.earlyRenewalDiscountPercent);
        setHistory(pays.items);
        setHistoryPage(pays.page);
        setHistoryPageCount(pays.pageCount);
        const ids = planList.map((p) => p.id);
        setRenewPlanId(
          defaultRenewPlanId(member.currentSubscription?.plan.id, ids),
        );
        setSellPlanId(ids[0] ?? "");
        setPayAmountRaw("");
        setPayNote("");
        setRenewAmountRaw("");
        setSellAmountRaw("");
        setSellStart("today");
        setPayNotice(null);
        setRenewNotice(null);
        setSellNotice(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "پروندهٔ عضو خوانده نشد",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const debt =
    detail?.currentSubscription?.debtToman ?? detail?.debtAmount ?? 0;
  const blocks = detail?.currentSubscription?.debtBlocksEntry ?? false;
  const renewBlockedByUpcoming = Boolean(detail?.upcomingSubscription);
  const canRenew =
    Boolean(detail) &&
    !detail?.isArchived &&
    Boolean(detail?.currentSubscription) &&
    !renewBlockedByUpcoming;
  const canSell =
    Boolean(detail) &&
    !detail?.isArchived &&
    !detail?.currentSubscription &&
    !detail?.upcomingSubscription;

  const selectedRenewPlan = plans.find((p) => p.id === renewPlanId) ?? null;
  const renewPreview = useMemo(() => {
    if (!selectedRenewPlan) return null;
    return previewRenewTuition({
      planPriceToman: selectedRenewPlan.priceToman,
      renewingBeforeCurrentEnds: Boolean(detail?.currentSubscription),
      earlyDiscountPercent,
    });
  }, [selectedRenewPlan, detail?.currentSubscription, earlyDiscountPercent]);

  const sellPlan = plans.find((p) => p.id === sellPlanId) ?? null;
  const payAmount = parseTomanInput(payAmountRaw);
  const payWords = payAmount != null ? tomanAmountInWords(payAmount) : null;
  const renewAmount = parseTomanInput(renewAmountRaw);
  const renewWords =
    renewAmount != null ? tomanAmountInWords(renewAmount) : null;
  const sellAmount = parseTomanInput(sellAmountRaw);
  const sellWords = sellAmount != null ? tomanAmountInWords(sellAmount) : null;

  async function refreshHistory(page = 1) {
    const pays = await listPayments({
      memberId,
      page,
      pageSize: RECEPTION_PAYMENT_PAGE_SIZE,
    });
    setHistory(pays.items);
    setHistoryPage(pays.page);
    setHistoryPageCount(pays.pageCount);
  }

  async function notifyChanged() {
    try {
      await onChanged?.();
    } catch {
      // money result stays; status refresh can be retried by selecting again
    }
  }

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const amount = parseTomanInput(payAmountRaw);
    if (amount == null || amount < 1) {
      setPayNotice({ error: "مبلغ را با رقم فارسی یا انگلیسی وارد کنید." });
      return;
    }
    setSaving(true);
    setPayNotice(null);
    setSellNotice(null);
    setRenewNotice(null);
    try {
      const res = await recordReceptionPayment({
        memberId: detail.id,
        amountToman: amount,
        method: payMethod,
        note: payNote.trim() || undefined,
      });
      setDetail(res.member);
      setPayAmountRaw("");
      setPayNote("");
      setPayNotice({
        ok: res.fullySettled
          ? "شهریه کامل تسویه شد و مانع بدهی برای ورود برداشته شد."
          : `قسط ثبت شد. ماندهٔ بدهی: ${formatToman(res.subscription.debtToman)}`,
      });
      await refreshHistory(1);
      await notifyChanged();
    } catch (err) {
      setPayNotice({
        error: err instanceof Error ? err.message : "ثبت پرداخت انجام نشد",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onRenew(e: FormEvent) {
    e.preventDefault();
    if (!detail || !renewPlanId || !renewPreview) return;
    const amount = parseTomanInput(renewAmountRaw);
    if (amount == null || amount < 1) {
      setRenewNotice({
        error: "مبلغ تمدید را با رقم فارسی یا انگلیسی وارد کنید.",
      });
      return;
    }
    if (amount < minimumHalfTuition(renewPreview.priceToman)) {
      setRenewNotice({
        error: "برای شروع دوره باید حداقل نصف شهریه پرداخت شود.",
      });
      return;
    }
    setSaving(true);
    setPayNotice(null);
    setSellNotice(null);
    setRenewNotice(null);
    try {
      const res = await renewSubscription({
        memberId: detail.id,
        planId: renewPlanId,
        amountPaidToman: amount,
        paymentMethod: renewMethod,
      });
      setDetail(res.member);
      setRenewAmountRaw("");
      const startLabel = formatJalaliDay(res.subscription.startsOn);
      const disc =
        res.subscription.discountPercentApplied > 0
          ? ` با ${res.subscription.discountPercentApplied.toLocaleString("fa-IR")}٪ تخفیف تمدید زودتر`
          : "";
      setRenewNotice({
        ok: `تمدید ثبت شد${disc}. دورهٔ جدید (${res.subscription.plan.name}) از ${startLabel} شروع می‌شود.`,
      });
      await refreshHistory(1);
      await notifyChanged();
    } catch (err) {
      setRenewNotice({
        error: err instanceof Error ? err.message : "ثبت تمدید انجام نشد",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onSell(e: FormEvent) {
    e.preventDefault();
    if (!detail || !sellPlan) return;
    const amount = parseTomanInput(sellAmountRaw);
    if (amount == null || amount < 1) {
      setSellNotice({
        error: "مبلغ را با رقم فارسی یا انگلیسی وارد کنید.",
      });
      return;
    }
    if (amount < minimumHalfTuition(sellPlan.priceToman)) {
      setSellNotice({
        error: "برای شروع دوره باید حداقل نصف شهریه پرداخت شود.",
      });
      return;
    }
    setSaving(true);
    setPayNotice(null);
    setSellNotice(null);
    setRenewNotice(null);
    try {
      const startsOn = sellStart === "tomorrow" ? starts.tomorrow : starts.today;
      const res = await sellSubscription({
        memberId: detail.id,
        planId: sellPlan.id,
        amountPaidToman: amount,
        paymentMethod: sellMethod,
        startsOn,
      });
      setDetail(res.member);
      setSellAmountRaw("");
      setRenewPlanId(
        defaultRenewPlanId(
          res.member.currentSubscription?.plan.id,
          plansRef.current.map((p) => p.id),
        ),
      );
      const paid = formatToman(amount);
      const when = formatJalaliDay(res.subscription.startsOn);
      setSellNotice({
        ok:
          res.subscription.debtToman > 0
            ? `اشتراک ثبت شد (${paid}). شروع از ${when} · ماندهٔ بدهی: ${formatToman(res.subscription.debtToman)}`
            : `اشتراک با تسویهٔ کامل ثبت شد. تاریخ شروع: ${when}.`,
      });
      await refreshHistory(1);
      await notifyChanged();
    } catch (err) {
      setSellNotice({
        error: err instanceof Error ? err.message : "ثبت اشتراک انجام نشد",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <SectionNotice notice={{ error: loadError }} />;
  }

  if (!detail) {
    return <p className="auth-muted">در حال خواندن پروندهٔ مالی عضو…</p>;
  }

  if (detail.isArchived) {
    return (
      <p className="desk-warn">
        پروندهٔ این عضو آرشیو (غیرفعال) است. اول از بالا دکمهٔ «فعال‌سازی
        دوباره» را بزنید تا بتوانید اشتراک یا پرداخت ثبت کنید.
      </p>
    );
  }

  return (
    <div className="reception-finance">
      {canSell ? (
        <form className="pay-form" onSubmit={onSell}>
          <h3>فروش اشتراک اول</h3>
          <p className="auth-muted">
            این عضو اشتراک فعالی ندارد. تاریخ شروع فقط امروز یا فردا است و حداقل
            نصف شهریه باید پرداخت شود.
          </p>
          <label className="pay-field">
            <span>پلن</span>
            <select
              className="theme-select"
              value={sellPlanId}
              onChange={(e) => {
                setSellPlanId(e.target.value);
                setSellAmountRaw("");
              }}
              disabled={locked}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="pay-field">
            <span>شروع دوره</span>
            <select
              className="theme-select"
              value={sellStart}
              onChange={(e) =>
                setSellStart(e.target.value === "tomorrow" ? "tomorrow" : "today")
              }
              disabled={locked}
              aria-label="تاریخ شروع اشتراک"
            >
              <option value="today">امروز · {formatJalaliDay(starts.today)}</option>
              <option value="tomorrow">
                فردا · {formatJalaliDay(starts.tomorrow)}
              </option>
            </select>
          </label>
          {sellPlan ? (
            <p className="auth-muted">
              شهریه {formatToman(sellPlan.priceToman)} · حداقل نصف{" "}
              {formatToman(minimumHalfTuition(sellPlan.priceToman))}
            </p>
          ) : null}
          <label className="pay-field">
            <span>مبلغ پرداخت (تومان)</span>
            <input
              value={sellAmountRaw}
              onChange={(e) =>
                setSellAmountRaw(formatTomanInputLive(e.target.value))
              }
              inputMode="numeric"
              dir="ltr"
              className="ltr-isolate"
              placeholder="مثلاً ۳٬۵۰۰٬۰۰۰"
              aria-label="مبلغ فروش اشتراک"
              disabled={locked}
            />
            <p className="pay-amount-words">
              {sellWords ??
                "رقم فارسی یا انگلیسی؛ جداکننده خودکار گذاشته می‌شود."}
            </p>
          </label>
          <label className="pay-field">
            <span>روش</span>
            <select
              className="theme-select"
              value={sellMethod}
              onChange={(e) => setSellMethod(e.target.value as PayMethod)}
              disabled={locked}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="att-actions">
            {sellPlan ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={locked}
                onClick={() =>
                  setSellAmountRaw(
                    formatTomanGrouped(minimumHalfTuition(sellPlan.priceToman)),
                  )
                }
              >
                حداقل نصف
              </button>
            ) : null}
            {sellPlan ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={locked}
                onClick={() =>
                  setSellAmountRaw(formatTomanGrouped(sellPlan.priceToman))
                }
              >
                مبلغ کامل
              </button>
            ) : null}
            <button type="submit" className="btn btn-primary" disabled={locked}>
              ثبت فروش
            </button>
          </div>
          <SectionNotice notice={sellNotice} />
        </form>
      ) : (
        <SectionNotice notice={sellNotice} />
      )}

      {detail.currentSubscription ? (
        <div className="pay-renew-box">
          <h3>قسط / تسویه</h3>
          <p className="auth-muted">
            {detail.currentSubscription.plan.name} · پایان{" "}
            {formatJalaliDay(detail.currentSubscription.endsOn)} · پرداخت‌شده{" "}
            {formatToman(detail.currentSubscription.amountPaidToman)} از{" "}
            {formatToman(detail.currentSubscription.priceToman)}
          </p>
          {debt > 0 ? (
            <p className="desk-warn">
              ماندهٔ شهریه: {formatToman(debt)}
              {blocks
                ? " — از روز ۱۵ دوره گذشته و ورود تا تسویه بسته است"
                : " — تا روز ۱۴ دوره ورود باز است"}
            </p>
          ) : (
            <p className="desk-ok-inline">بدهی شهریه ندارد</p>
          )}
          {debt > 0 ? (
            <form className="pay-form" onSubmit={onPay}>
              <label className="pay-field">
                <span>مبلغ قسط (تومان)</span>
                <input
                  value={payAmountRaw}
                  onChange={(e) =>
                    setPayAmountRaw(formatTomanInputLive(e.target.value))
                  }
                  inputMode="numeric"
                  dir="ltr"
                  className="ltr-isolate"
                  placeholder="مثلاً ۳٬۵۰۰٬۰۰۰"
                  aria-label="مبلغ پرداخت قسط"
                  disabled={locked}
                />
                <p className="pay-amount-words">
                  {payWords ??
                    "رقم فارسی یا انگلیسی؛ جداکننده خودکار گذاشته می‌شود."}
                </p>
              </label>
              <label className="pay-field">
                <span>روش</span>
                <select
                  className="theme-select"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PayMethod)}
                  disabled={locked}
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
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  disabled={locked}
                />
              </label>
              <div className="att-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={locked}
                  onClick={() => setPayAmountRaw(formatTomanGrouped(debt))}
                >
                  کل مانده
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={locked}
                >
                  ثبت قسط
                </button>
              </div>
              <SectionNotice notice={payNotice} />
            </form>
          ) : (
            <SectionNotice notice={payNotice} />
          )}
        </div>
      ) : null}

      {detail.currentSubscription || detail.upcomingSubscription ? (
        <div className="pay-renew-box">
          <h3>تمدید اشتراک</h3>
          {detail.upcomingSubscription ? (
            <p className="desk-ok-inline">
              دورهٔ بعدی از{" "}
              {formatJalaliDay(detail.upcomingSubscription.startsOn)} ثبت شده
              است.
            </p>
          ) : null}
          {renewBlockedByUpcoming ? (
            <p className="desk-warn">
              برای این عضو یک دورهٔ بعدی در صف است؛ تا وقتی آن دوره شروع نشود،
              تمدید جدید ثبت نمی‌شود.
            </p>
          ) : !canRenew || !detail.currentSubscription ? (
            <p className="auth-muted">
              برای تمدید، عضو باید اشتراک فعال داشته باشد و دورهٔ بعدی برایش ثبت
              نشده باشد.
            </p>
          ) : (
            <form className="pay-form" onSubmit={onRenew}>
              <p className="auth-muted">
                تمدید برای دورهٔ ۳۰ روزهٔ بعدی است (جدا از قسط بدهی). اگر اشتراک
                فعلی هنوز تمام نشده باشد، دورهٔ جدید بدون فاصله از فردای پایان
                دورهٔ فعلی شروع می‌شود.
              </p>
              {renewPreview && selectedRenewPlan ? (
                <p className="auth-muted">
                  شهریهٔ این تمدید: {formatToman(renewPreview.priceToman)}
                  {renewPreview.discountPercent > 0
                    ? ` (با ${renewPreview.discountPercent.toLocaleString("fa-IR")}٪ تخفیف تمدید زودتر)`
                    : ""}
                  {" · "}
                  حداقل نصف:{" "}
                  {formatToman(minimumHalfTuition(renewPreview.priceToman))}
                  {" · "}
                  شروع: فردای{" "}
                  {formatJalaliDay(detail.currentSubscription.endsOn)}
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
                  disabled={locked}
                  aria-label="پلن دورهٔ بعد"
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
                  disabled={locked}
                />
                <p className="pay-amount-words">
                  {renewWords ?? "برای شروع دوره باید حداقل نصف شهریه پرداخت شود."}
                </p>
              </label>
              <label className="pay-field">
                <span>روش</span>
                <select
                  className="theme-select"
                  value={renewMethod}
                  onChange={(e) => setRenewMethod(e.target.value as PayMethod)}
                  disabled={locked}
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
                    disabled={locked}
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
                    disabled={locked}
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
                  disabled={locked}
                >
                  ثبت تمدید
                </button>
              </div>
              <SectionNotice notice={renewNotice} />
            </form>
          )}
          {renewBlockedByUpcoming || !canRenew ? (
            <SectionNotice notice={renewNotice} />
          ) : null}
        </div>
      ) : null}

      <h3 className="dash-subhead">سوابق پرداخت این عضو</h3>
      {history.length === 0 ? (
        <p className="auth-muted">هنوز پرداختی برای این عضو ثبت نشده است.</p>
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
                <span className="dash-list-meta">{formatToman(p.amountToman)}</span>
              </li>
            ))}
          </ul>
          <DeskPager
            page={historyPage}
            pageCount={historyPageCount}
            busy={locked}
            onPage={(p) => {
              void refreshHistory(p).catch((err: unknown) => {
                setPayNotice({
                  error:
                    err instanceof Error ? err.message : "سوابق خوانده نشد",
                });
              });
            }}
          />
        </>
      )}
    </div>
  );
}
