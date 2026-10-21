"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  fetchMe,
  fetchMember,
  listPayments,
  logout,
  recordReceptionPayment,
  searchMembers,
} from "@/lib/api";
import { clampTomanInput, parseTomanInput } from "@/lib/amount-input";
import { roleLabel, toAsciiDigits } from "@/lib/auth";
import {
  formatToman,
  paymentMethodLabel,
} from "@/lib/dashboard-format";
import { formatJalaliDateTime, formatJalaliDay } from "@/lib/jalali-date";
import type {
  MemberDetail,
  MemberSummary,
  PaymentPublic,
  PublicAuthUser,
} from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type PayMethod = "CASH" | "CARD_READER" | "CARD_TRANSFER";

const METHODS: { value: PayMethod; label: string }[] = [
  { value: "CASH", label: "نقد" },
  { value: "CARD_READER", label: "کارت‌خوان" },
  { value: "CARD_TRANSFER", label: "کارت‌به‌کارت" },
];

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
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [history, setHistory] = useState<PaymentPublic[]>([]);
  const [recent, setRecent] = useState<PaymentPublic[]>([]);
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [amountRaw, setAmountRaw] = useState("");
  const [method, setMethod] = useState<PayMethod>("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    const list = await listPayments({
      method: filterMethod || undefined,
      limit: 25,
    });
    setRecent(list);
  }, [filterMethod]);

  const selectMember = useCallback(async (id: string) => {
    const [detail, pays] = await Promise.all([
      fetchMember(id),
      listPayments({ memberId: id, limit: 30 }),
    ]);
    setSelected(detail);
    setHistory(pays);
    setAmountRaw("");
    setNote("");
  }, []);

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
        const [list] = await Promise.all([
          searchMembers(""),
          loadRecent(),
        ]);
        if (cancelled) return;
        setMembers(list);
        // بدهکار نمونه برای پر بودن صفحه
        const debtor = list.find((m) => m.debtAmount > 0);
        if (debtor) {
          await selectMember(debtor.id);
        }
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
  }, [loadRecent, panel, selectMember]);

  useEffect(() => {
    void loadRecent().catch(() => {
      /* ignore until boot */
    });
  }, [loadRecent]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const list = await searchMembers(toAsciiDigits(query.trim()));
      setMembers(list);
      setOk("نتیجه جستجو به‌روز شد.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "جستجو ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amount = parseTomanInput(amountRaw);
    if (amount == null || amount < 1) {
      setError("مبلغ را با رقم فارسی یا انگلیسی وارد کنید.");
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
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
      setOk(
        res.fullySettled
          ? `تسویه کامل شد. ورود از نظر شهریه باز است.`
          : `قسط ثبت شد. مانده: ${formatToman(res.subscription.debtToman)}`,
      );
      const [pays, list] = await Promise.all([
        listPayments({ memberId: selected.id, limit: 30 }),
        searchMembers(toAsciiDigits(query.trim())),
        loadRecent(),
      ]);
      setHistory(pays);
      setMembers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت پرداخت ناموفق بود");
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

  const debt =
    selected?.currentSubscription?.debtToman ?? selected?.debtAmount ?? 0;
  const blocks = selected?.currentSubscription?.debtBlocksEntry ?? false;

  if (!user && !error) {
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
            فقط نقد / کارت‌خوان / کارت‌به‌کارت — بدون درگاه آنلاین.
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

      {error ? <p className="auth-error desk-banner">{error}</p> : null}
      {ok ? <p className="desk-ok desk-banner">{ok}</p> : null}

      <div className="att-layout">
        <section className="desk-section desk-section-first">
          <h2>پیدا کردن عضو</h2>
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
                  <span className="auth-muted">
                    {m.debtAmount > 0
                      ? `بدهی ${formatToman(m.debtAmount)}`
                      : "بدون بدهی شهریه"}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="desk-section desk-section-first">
          <h2>ثبت پرداخت</h2>
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
                    <span>مبلغ (تومان)</span>
                    <input
                      value={amountRaw}
                      onChange={(e) =>
                        setAmountRaw(clampTomanInput(e.target.value))
                      }
                      inputMode="numeric"
                      dir="ltr"
                      className="ltr-isolate"
                      placeholder="مثلاً ۴۴۵۰۰۰ یا 445000"
                      aria-label="مبلغ پرداخت"
                      disabled={busy}
                    />
                  </label>
                  <label className="pay-field">
                    <span>روش</span>
                    <select
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
                      onClick={() =>
                        setAmountRaw(String(debt))
                      }
                    >
                      کل مانده
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={busy}
                    >
                      ثبت پرداخت
                    </button>
                  </div>
                </form>
              ) : null}

              <h3 className="dash-subhead">سوابق این عضو</h3>
              {history.length === 0 ? (
                <p className="auth-muted">پرداختی در پرونده نیست.</p>
              ) : (
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
        )}
      </section>
    </main>
  );
}
