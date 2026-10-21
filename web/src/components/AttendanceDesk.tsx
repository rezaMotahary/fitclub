"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  attendanceCheckIn,
  attendanceCheckOut,
  fetchAttendanceEligibility,
  fetchAttendanceInside,
  fetchAttendanceToday,
  fetchMe,
  logout,
  searchMembers,
  voidAttendance,
} from "@/lib/api";
import { resolveDurationMinutes } from "@/lib/attendance-duration";
import {
  formatClockFa,
  formatElapsed,
  resultLabel,
} from "@/lib/attendance-format";
import { roleLabel, toAsciiDigits } from "@/lib/auth";
import { formatJalaliDay } from "@/lib/jalali-date";
import type {
  AttendanceEligibilityResponse,
  AttendanceInsideResponse,
  AttendanceTodayResponse,
  MemberSummary,
  PublicAuthUser,
} from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

function formatToman(n: number): string {
  return `${n.toLocaleString("fa-IR")} تومان`;
}

function genderLabel(g: "MEN" | "WOMEN"): string {
  return g === "WOMEN" ? "بانوان" : "آقایان";
}

export function AttendanceDesk() {
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AttendanceEligibilityResponse | null>(
    null,
  );
  const [today, setToday] = useState<AttendanceTodayResponse | null>(null);
  const [inside, setInside] = useState<AttendanceInsideResponse | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const isSecretary = user?.role === "SECRETARY";

  const refreshBoards = useCallback(async () => {
    const [t, i] = await Promise.all([
      fetchAttendanceToday(),
      fetchAttendanceInside(),
    ]);
    setToday(t);
    setInside(i);
  }, []);

  const loadEligibility = useCallback(async (memberId: string) => {
    const res = await fetchAttendanceEligibility(memberId);
    setSnapshot(res);
    setSelectedId(memberId);
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
        setUser(me.user);
        const list = await searchMembers("");
        if (cancelled) return;
        setMembers(list);
        await refreshBoards();
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
  }, [refreshBoards]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // silence unused tick lint — drives timer re-render
  void tick;

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const list = await searchMembers(toAsciiDigits(query.trim()));
      setMembers(list);
      setNote(
        list.length === 0
          ? "عضوی پیدا نشد."
          : `${list.length.toLocaleString("fa-IR")} عضو پیدا شد.`,
      );
      if (list.length === 1) {
        await loadEligibility(list[0]!.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "جستجو ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onSelect(m: MemberSummary) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await loadEligibility(m.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "وضعیت عضو خوانده نشد");
    } finally {
      setBusy(false);
    }
  }

  async function onCheckIn() {
    if (!selectedId || !isSecretary) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await attendanceCheckIn(selectedId);
      if (res.ok) {
        setNote(`ورود ${res.member.fullName} ثبت شد.`);
      } else {
        setNote(res.eligibility.denyMessage ?? "ورود رد شد.");
      }
      await loadEligibility(selectedId);
      await refreshBoards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت ورود ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onCheckOut(memberId?: string, attendanceId?: string) {
    if (!isSecretary) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await attendanceCheckOut({ memberId, attendanceId });
      setNote("خروج ثبت شد.");
      if (selectedId) await loadEligibility(selectedId);
      await refreshBoards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت خروج ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onVoid(attendanceId: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await voidAttendance(attendanceId, "ابطال از پنل");
      setNote("حضور باطل شد؛ رکورد در لاگ می‌ماند.");
      if (selectedId) await loadEligibility(selectedId);
      await refreshBoards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ابطال ناموفق بود");
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
          <p className="auth-muted">در حال بارگذاری پنل حضور…</p>
        </div>
      </main>
    );
  }

  const openElapsed =
    snapshot?.openAttendance != null
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(snapshot.openAttendance.checkInAt).getTime()) /
              1000,
          ),
        )
      : 0;

  return (
    <main className="desk-shell desk-shell-wide">
      <header className="desk-top">
        <div>
          <p className="brand-mark">FITCLUB</p>
          <h1>پنل منشی — حضور</h1>
          {user ? (
            <p className="auth-muted">
              {user.fullName} · {roleLabel(user.role)}
              {!isSecretary
                ? " · مشاهده و ابطال (ثبت ورود/خروج فقط منشی)"
                : ""}
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

      {today ? (
        <div className="att-stats">
          <article className="att-stat">
            <div className="label">ورودهای امروز</div>
            <div className="value">
              {today.stats.checkInsToday.toLocaleString("fa-IR")}
            </div>
          </article>
          <article className="att-stat">
            <div className="label">الان داخل سالن</div>
            <div className="value ok">
              {today.stats.insideNow.toLocaleString("fa-IR")}
            </div>
          </article>
          <article className="att-stat">
            <div className="label">رد شده امروز</div>
            <div className="value warn">
              {today.stats.rejectedToday.toLocaleString("fa-IR")}
            </div>
          </article>
        </div>
      ) : null}

      <section className="desk-section att-section">
        <h2>جستجوی عضو و ثبت دستی</h2>
        <p className="auth-muted">
          نام، کد FS- یا موبایل — رقم فارسی و انگلیسی هر دو درست کار می‌کند.
        </p>
        <form className="desk-search" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثلاً سارا یا FS-1042 یا ۰۹۱۲…"
            aria-label="جستجوی عضو برای حضور"
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            جستجو
          </button>
        </form>

        <div className="att-layout">
          <div className="att-member-list">
            {members.length === 0 ? (
              <p className="auth-muted">عضوی برای نمایش نیست.</p>
            ) : (
              members.slice(0, 12).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`att-member-chip${selectedId === m.id ? " active" : ""}`}
                  onClick={() => void onSelect(m)}
                  disabled={busy}
                >
                  <strong>{m.fullName}</strong>
                  <span className="desk-code ltr-isolate" dir="ltr">
                    {m.membershipCode}
                  </span>
                  <span className="auth-muted">
                    {genderLabel(m.sessionGender)}
                    {m.debtAmount > 0 ? " · بدهی" : ""}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="att-result">
            {!snapshot ? (
              <p className="auth-muted">
                یک عضو را از لیست انتخاب کنید یا جستجو کنید.
              </p>
            ) : (
              <>
                <div className="att-result-head">
                  <div>
                    <h3>
                      {snapshot.member.fullName}{" "}
                      <span className="desk-code ltr-isolate" dir="ltr">
                        {snapshot.member.membershipCode}
                      </span>
                    </h3>
                    <p className="auth-muted">
                      {snapshot.member.currentPlanName ?? "بدون اشتراک جاری"}
                      {snapshot.member.subscriptionEndsOn
                        ? ` · پایان: ${formatJalaliDay(snapshot.member.subscriptionEndsOn)}`
                        : ""}{" "}
                      · سانس {genderLabel(snapshot.member.sessionGender)} · مانده
                      هفته{" "}
                      {snapshot.weekly.remaining.toLocaleString("fa-IR")} از{" "}
                      {snapshot.weekly.weeklyCap.toLocaleString("fa-IR")}
                      {snapshot.eligibility.remainingSubscriptionDays != null
                        ? ` · مانده اشتراک ${snapshot.eligibility.remainingSubscriptionDays.toLocaleString("fa-IR")} روز`
                        : ""}
                    </p>
                    {snapshot.member.debtAmount > 0 ? (
                      <p className="desk-warn">
                        مانده شهریه: {formatToman(snapshot.member.debtAmount)}
                      </p>
                    ) : (
                      <p className="desk-ok-inline">بدهی شهریه ندارد</p>
                    )}
                    <div className="att-badges">
                      {snapshot.eligibility.allowed ? (
                        <span className="att-badge ok">مجاز به ورود</span>
                      ) : (
                        <span className="att-badge danger">
                          {snapshot.eligibility.denyMessage ?? "ورود مجاز نیست"}
                        </span>
                      )}
                      {snapshot.openAttendance ? (
                        <span className="att-badge ok">داخل سالن</span>
                      ) : null}
                    </div>
                  </div>
                  {snapshot.openAttendance ? (
                    <div className="att-timer-block">
                      <div className="att-timer" aria-live="polite">
                        {formatElapsed(openElapsed)}
                      </div>
                      <p className="auth-muted">تایمر حضور باز</p>
                      {isSecretary ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            void onCheckOut(
                              snapshot.member.id,
                              snapshot.openAttendance?.id,
                            )
                          }
                        >
                          ثبت خروج
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="cta-row att-actions">
                  {isSecretary &&
                  snapshot.eligibility.allowed &&
                  !snapshot.openAttendance ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => void onCheckIn()}
                    >
                      ثبت ورود و شروع تایمر
                    </button>
                  ) : null}
                  {isSecretary &&
                  !snapshot.eligibility.allowed &&
                  !snapshot.openAttendance ? (
                    <p className="att-deny">
                      دکمه ورود نیست —{" "}
                      {snapshot.eligibility.denyMessage ?? "شرط‌ها برقرار نیست"}
                    </p>
                  ) : null}
                  {!isSecretary ? (
                    <p className="auth-muted">
                      مدیر ورود/خروج ثبت نمی‌کند؛ فقط مشاهده و ابطال همان‌روز.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="att-two-col">
        <section className="desk-section att-section">
          <h2>الان داخل سالن</h2>
          {!inside || inside.items.length === 0 ? (
            <p className="auth-muted">کسی داخل نیست.</p>
          ) : (
            <ul className="att-live">
              {inside.items.map((item) => {
                const elapsed = Math.max(
                  0,
                  Math.floor(
                    (Date.now() -
                      new Date(item.attendance.checkInAt).getTime()) /
                      1000,
                  ),
                );
                return (
                  <li key={item.attendance.id} className="att-live-item">
                    <div>
                      <span className="att-pulse" aria-hidden />
                      {item.member.fullName}
                      <span className="desk-code ltr-isolate" dir="ltr">
                        {" "}
                        {item.member.membershipCode}
                      </span>
                    </div>
                    <div className="att-live-actions">
                      <strong>{formatElapsed(elapsed)}</strong>
                      {isSecretary ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            void onCheckOut(
                              item.member.id,
                              item.attendance.id,
                            )
                          }
                        >
                          خروج
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="desk-section att-section" id="today">
          <h2>
            لاگ امروز
            {today?.day ? (
              <span className="auth-muted">
                {" "}
                · {formatJalaliDay(today.day)}
              </span>
            ) : null}
          </h2>
          {!today || today.items.length === 0 ? (
            <p className="auth-muted">هنوز رکوردی برای امروز نیست.</p>
          ) : (
            <div className="att-log">
              {today.items.map((row) => {
                const visitMinutes = resolveDurationMinutes({
                  checkInAt: row.checkInAt,
                  checkOutAt: row.checkOutAt,
                  storedMinutes: row.durationMinutes,
                });
                return (
                <article key={row.id} className="att-log-row">
                  <div>
                    <strong>
                      {formatClockFa(row.checkInAt)} · {row.memberName}
                    </strong>
                    <p className="auth-muted">
                      <span className="ltr-isolate" dir="ltr">
                        {row.membershipCode}
                      </span>
                      {" · "}
                      {resultLabel(row.result, row.isVoided)}
                      {row.closedAutomatically ? " · بستن خودکار" : ""}
                      {row.rejectReason ? ` · ${row.rejectReason}` : ""}
                      {row.isVoided && row.voidReason
                        ? ` · ${row.voidReason}`
                        : ""}
                      {visitMinutes != null && !row.isVoided
                        ? ` · ${visitMinutes.toLocaleString("fa-IR")} دقیقه`
                        : ""}
                    </p>
                  </div>
                  {row.result === "SUCCESS" && !row.isVoided ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => void onVoid(row.id)}
                    >
                      ابطال
                    </button>
                  ) : null}
                </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
