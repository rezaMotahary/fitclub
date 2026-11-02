"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  activateMember,
  archiveMember,
  attendanceCheckIn,
  attendanceCheckOut,
  createMember,
  fetchAttendanceEligibility,
  fetchAttendanceInside,
  fetchAttendanceToday,
  fetchMe,
  searchMembers,
  voidAttendance,
} from "@/lib/api";
import { logoutAndLeave } from "@/lib/logout-and-leave";
import { resolveDurationMinutes } from "@/lib/attendance-duration";
import {
  formatClockFa,
  formatElapsed,
  resultLabel,
} from "@/lib/attendance-format";
import {
  clampIranMobileInput,
  isValidIranMobile,
  normalizeIranMobile,
  roleLabel,
  toAsciiDigits,
} from "@/lib/auth";
import type { StaffPanelPaths } from "@/lib/staff-paths";
import { formatToman } from "@/lib/dashboard-format";
import { formatJalaliDay } from "@/lib/jalali-date";
import {
  RECEPTION_INSIDE_PAGE_SIZE,
  RECEPTION_LOG_PAGE_SIZE,
  RECEPTION_MEMBER_PAGE_SIZE,
  memberSearchNotice,
  slicePage,
} from "@/lib/reception-list";
import type {
  AttendanceEligibilityResponse,
  AttendanceInsideResponse,
  AttendanceTodayResponse,
  MemberSummary,
  PublicAuthUser,
} from "@/lib/types";
import { DeskPager } from "./DeskPager";
import { MemberFinance } from "./MemberFinance";
import { PanelFrame } from "./PanelFrame";
import { SectionNotice, type SectionNoticeState } from "./SectionNotice";
import { ThemeToggle } from "./ThemeToggle";

function genderLabel(g: "MEN" | "WOMEN"): string {
  return g === "WOMEN" ? "بانوان" : "آقایان";
}

export function AttendanceDesk({ paths }: { paths: StaffPanelPaths }) {
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageCount, setMemberPageCount] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AttendanceEligibilityResponse | null>(
    null,
  );
  const [today, setToday] = useState<AttendanceTodayResponse | null>(null);
  const [inside, setInside] = useState<AttendanceInsideResponse | null>(null);
  const [logPage, setLogPage] = useState(1);
  const [insidePage, setInsidePage] = useState(1);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<SectionNoticeState | null>(
    null,
  );
  const [pickNotice, setPickNotice] = useState<SectionNoticeState | null>(null);
  const [cardNotice, setCardNotice] = useState<SectionNoticeState | null>(null);
  const [archiveNotice, setArchiveNotice] = useState<SectionNoticeState | null>(
    null,
  );
  const [insideNotice, setInsideNotice] = useState<
    { id: string; notice: SectionNoticeState } | null
  >(null);
  const [voidNotice, setVoidNotice] = useState<
    { id: string; notice: SectionNoticeState } | null
  >(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGender, setNewGender] = useState<"MEN" | "WOMEN">("WOMEN");
  const [createNotice, setCreateNotice] = useState<SectionNoticeState | null>(
    null,
  );

  const isSecretary = user?.role === "SECRETARY";

  const refreshBoards = useCallback(async () => {
    const [t, i] = await Promise.all([
      fetchAttendanceToday(),
      fetchAttendanceInside(),
    ]);
    setToday(t);
    setInside(i);
  }, []);

  const loadMembers = useCallback(
    async (q: string, page: number, archived: boolean) => {
      const list = await searchMembers(
        toAsciiDigits(q.trim()),
        archived,
        page,
        RECEPTION_MEMBER_PAGE_SIZE,
      );
      setMembers(list.items);
      setMemberPage(list.page);
      setMemberPageCount(list.pageCount);
      return list;
    },
    [],
  );

  const loadEligibility = useCallback(async (memberId: string) => {
    const res = await fetchAttendanceEligibility(memberId);
    setSnapshot(res);
    setSelectedId(memberId);
    return res;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me.user.role !== "SECRETARY") {
          setBootError("این در برای این حساب نیست.");
          return;
        }
        setUser(me.user);
        await loadMembers("", 1, false);
        if (cancelled) return;
        await refreshBoards();
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
  }, [loadMembers, paths.home, refreshBoards]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  void tick;

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSearchNotice(null);
    setPickNotice(null);
    try {
      const list = await loadMembers(query, 1, includeArchived);
      setSearchNotice(memberSearchNotice(list.total));
      if (list.items.length === 1) {
        setCardNotice(null);
        setArchiveNotice(null);
        await loadEligibility(list.items[0]!.id);
      }
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
      const list = await loadMembers(query, page, includeArchived);
      setSearchNotice(memberSearchNotice(list.total));
    } catch (err) {
      setSearchNotice({
        error: err instanceof Error ? err.message : "جستجو ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onToggleArchived(next: boolean) {
    setIncludeArchived(next);
    setBusy(true);
    setSearchNotice(null);
    setPickNotice(null);
    try {
      const list = await loadMembers(query, 1, next);
      setSearchNotice(memberSearchNotice(list.total));
    } catch (err) {
      setSearchNotice({
        error: err instanceof Error ? err.message : "جستجو ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onSelect(m: MemberSummary) {
    setBusy(true);
    setPickNotice(null);
    setCardNotice(null);
    setArchiveNotice(null);
    try {
      await loadEligibility(m.id);
    } catch (err) {
      setPickNotice({
        error: err instanceof Error ? err.message : "وضعیت عضو خوانده نشد",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onCheckIn() {
    if (!selectedId || !isSecretary) return;
    setBusy(true);
    setCardNotice(null);
    try {
      const res = await attendanceCheckIn(selectedId);
      if (res.ok) {
        setCardNotice({ ok: `ورود ${res.member.fullName} ثبت شد.` });
      } else {
        setCardNotice({
          error: res.eligibility.denyMessage ?? "ورود رد شد.",
        });
      }
      await loadEligibility(selectedId);
      await refreshBoards();
    } catch (err) {
      setCardNotice({
        error: err instanceof Error ? err.message : "ثبت ورود ناموفق بود",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onCheckOut(
    where: "card" | "inside",
    memberId?: string,
    attendanceId?: string,
  ) {
    if (!isSecretary) return;
    setBusy(true);
    if (where === "card") setCardNotice(null);
    if (where === "inside" && attendanceId) {
      setInsideNotice(null);
    }
    try {
      await attendanceCheckOut({ memberId, attendanceId });
      const notice = { ok: "خروج ثبت شد." };
      if (where === "inside" && attendanceId) {
        setInsideNotice({ id: attendanceId, notice });
      } else {
        setCardNotice(notice);
      }
      if (selectedId) await loadEligibility(selectedId);
      await refreshBoards();
    } catch (err) {
      const notice = {
        error: err instanceof Error ? err.message : "ثبت خروج ناموفق بود",
      };
      if (where === "inside" && attendanceId) {
        setInsideNotice({ id: attendanceId, notice });
      } else {
        setCardNotice(notice);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onVoid(attendanceId: string) {
    setBusy(true);
    setVoidNotice(null);
    try {
      await voidAttendance(attendanceId, "ابطال از پنل");
      setVoidNotice({
        id: attendanceId,
        notice: {
          ok: "این حضور باطل شد (در فهرست امروز با علامت باطل‌شده می‌ماند و سهم هفته برمی‌گردد).",
        },
      });
      if (selectedId) await loadEligibility(selectedId);
      await refreshBoards();
    } catch (err) {
      setVoidNotice({
        id: attendanceId,
        notice: {
          error: err instanceof Error ? err.message : "ابطال انجام نشد",
        },
      });
    } finally {
      setBusy(false);
    }
  }

  async function onArchiveToggle() {
    if (!snapshot) return;
    const memberId = snapshot.member.id;
    const archived = snapshot.member.isArchived;
    setBusy(true);
    setArchiveNotice(null);
    try {
      if (archived) {
        await activateMember(memberId);
        setArchiveNotice({ ok: `${snapshot.member.fullName} دوباره فعال شد.` });
      } else {
        await archiveMember(memberId);
        setArchiveNotice({
          ok: `${snapshot.member.fullName} آرشیو شد (حذف نشده و همهٔ سوابق حفظ می‌شود).`,
        });
      }
      await loadEligibility(memberId);
      await loadMembers(query, memberPage, includeArchived);
    } catch (err) {
      setArchiveNotice({
        error: err instanceof Error ? err.message : "تغییر وضعیت عضو انجام نشد",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const fullName = newName.trim();
    const phone = normalizeIranMobile(newPhone);
    if (!fullName) {
      setCreateNotice({ error: "نام و نام خانوادگی عضو را بنویسید." });
      return;
    }
    if (!isValidIranMobile(phone)) {
      setCreateNotice({
        error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود (رقم فارسی یا انگلیسی).",
      });
      return;
    }
    setBusy(true);
    setCreateNotice(null);
    try {
      const created = await createMember({
        fullName,
        phone,
        sessionGender: newGender,
      });
      setNewName("");
      setNewPhone("");
      setCreateNotice({
        ok: `${created.fullName} ثبت شد. کد عضویت: \u2066${created.membershipCode}\u2069`,
      });
      setQuery(created.membershipCode);
      setCardNotice(null);
      setArchiveNotice(null);
      await loadMembers(created.membershipCode, 1, includeArchived);
      setSearchNotice({ ok: "عضو جدید ثبت و انتخاب شد." });
      await loadEligibility(created.id);
      await refreshBoards();
    } catch (err) {
      setCreateNotice({
        error: err instanceof Error ? err.message : "ثبت عضو انجام نشد",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onMoneyChanged() {
    if (selectedId) {
      try {
        await loadEligibility(selectedId);
      } catch {
        // payment message stays on its own form
      }
    }
    try {
      await refreshBoards();
    } catch {
      // boards refresh on the next successful action
    }
    try {
      await loadMembers(query, memberPage, includeArchived);
    } catch {
      // list refresh is secondary
    }
  }

  function onLogout() {
    void logoutAndLeave(paths.home);
  }

  if (!user && !bootError) {
    return (
      <main className="auth-shell">
        <ThemeToggle className="theme-toggle-float" />
        <div className="auth-card">
          <p className="auth-muted">در حال بارگذاری پذیرش…</p>
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

  const logSlice = slicePage(today?.items ?? [], logPage, RECEPTION_LOG_PAGE_SIZE);
  const insideSlice = slicePage(
    inside?.items ?? [],
    insidePage,
    RECEPTION_INSIDE_PAGE_SIZE,
  );
  const voidOnPage = logSlice.items.some((row) => row.id === voidNotice?.id);
  const insideOnPage = insideSlice.items.some(
    (row) => row.attendance.id === insideNotice?.id,
  );

  return (
    <PanelFrame
      title="پنل منشی — پذیرش"
      lede={
        user ? (
          <>
            {user.fullName} · {roleLabel(user.role)}
            {!isSecretary
              ? " · مشاهده و ابطال (ثبت ورود و خروج فقط منشی)"
              : ""}
          </>
        ) : null
      }
      nav={[
        { href: paths.home, label: "خانه پذیرش", exact: true },
        { href: paths.payments, label: "پرداخت پذیرش" },
      ]}
      onLogout={onLogout}
    >

      {bootError ? <p className="auth-error desk-banner">{bootError}</p> : null}

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
        <h2>پیدا کردن عضو</h2>
        <p className="auth-muted">
          جستجو با نام، کد عضویت (
          <span className="ltr-isolate" dir="ltr">
            FS-
          </span>
          ) یا موبایل. برای تست فروش اول، «کیان مرادی» (
          <span className="ltr-isolate" dir="ltr">
            FS-1050
          </span>
          ) هنوز اشتراک ندارد.
        </p>
        <form className="desk-search" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثلاً سارا یا FS-1042 یا ۰۹۱۲…"
            aria-label="جستجوی عضو برای پذیرش"
          />
          <label className="desk-check">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => void onToggleArchived(e.target.checked)}
            />
            نمایش اعضای آرشیوشده
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            جستجو
          </button>
        </form>
        <SectionNotice notice={searchNotice} />

        <div className="att-layout">
          <div className="member-pick">
            <div className="member-pick-list">
              {members.length === 0 ? (
                <p className="auth-muted">عضوی برای نمایش نیست.</p>
              ) : (
                members.map((m) => (
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
                      {m.isArchived ? " · آرشیو" : ""}
                      {m.currentPlanName ? ` · ${m.currentPlanName}` : " · بدون اشتراک"}
                      {m.debtAmount > 0 ? " · بدهی" : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
            <DeskPager
              page={memberPage}
              pageCount={memberPageCount}
              busy={busy}
              onPage={(p) => void onMemberPage(p)}
            />
          </div>

          <div className="att-result">
            <SectionNotice notice={pickNotice} />
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
                      {snapshot.member.isArchived ? " · آرشیو" : ""}
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
                              "card",
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
                      امکان ثبت ورود نیست:{" "}
                      {snapshot.eligibility.denyMessage ?? "شرایط ورود برقرار نیست"}
                    </p>
                  ) : null}
                  {!isSecretary ? (
                    <p className="auth-muted">
                      ثبت ورود و خروج فقط با منشی است؛ مدیر می‌تواند وضعیت را
                      ببیند یا حضور امروز را باطل کند.
                    </p>
                  ) : null}
                </div>
                <SectionNotice notice={cardNotice} />

                <div className="reception-archive">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void onArchiveToggle()}
                  >
                    {snapshot.member.isArchived ? "فعال‌سازی دوباره" : "آرشیو عضو"}
                  </button>
                  <SectionNotice notice={archiveNotice} />
                </div>
              </>
            )}
          </div>
        </div>

        {snapshot ? (
          <div className="reception-work">
            <h3>
              فروش، قسط و تمدید — {snapshot.member.fullName}
            </h3>
            <MemberFinance
              key={snapshot.member.id}
              memberId={snapshot.member.id}
              busy={busy}
              onChanged={onMoneyChanged}
            />
          </div>
        ) : null}
      </section>

      <div className="reception-floor">
      <section className="desk-section att-section reception-create">
        <h2>ثبت عضو جدید</h2>
        <p className="auth-muted">
          نام، موبایل و سانس عضو را وارد کنید. کد عضویت خودکار ساخته می‌شود و
          بلافاصله می‌توانید اشتراک او را ثبت کنید.
        </p>
        <form className="pay-form" onSubmit={onCreate}>
          <label className="pay-field">
            <span>نام</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="نام عضو جدید"
              disabled={busy}
            />
          </label>
          <label className="pay-field">
            <span>موبایل</span>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(clampIranMobileInput(e.target.value))}
              inputMode="numeric"
              dir="ltr"
              className="ltr-isolate"
              placeholder="۰۹۱۲…"
              aria-label="موبایل عضو جدید"
              disabled={busy}
            />
          </label>
          <label className="pay-field">
            <span>سانس</span>
            <select
              className="theme-select"
              value={newGender}
              onChange={(e) =>
                setNewGender(e.target.value === "MEN" ? "MEN" : "WOMEN")
              }
              disabled={busy}
              aria-label="سانس عضو جدید"
            >
              <option value="WOMEN">بانوان</option>
              <option value="MEN">آقایان</option>
            </select>
          </label>
          <div className="att-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              ثبت عضو
            </button>
          </div>
          <SectionNotice notice={createNotice} />
        </form>
      </section>

        <section className="desk-section att-section">
          <h2>الان داخل سالن</h2>
          {insideNotice && !insideOnPage ? (
            <SectionNotice notice={insideNotice.notice} />
          ) : null}
          {insideSlice.items.length === 0 ? (
            <p className="auth-muted">الان کسی داخل سالن نیست.</p>
          ) : (
            <ul className="att-live">
              {insideSlice.items.map((item) => {
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
                      {insideNotice?.id === item.attendance.id ? (
                        <SectionNotice notice={insideNotice.notice} />
                      ) : null}
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
                              "inside",
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
          <DeskPager
            page={insideSlice.page}
            pageCount={insideSlice.pageCount}
            busy={busy}
            onPage={setInsidePage}
          />
        </section>

        <section className="desk-section att-section" id="today">
          <h2>
            ورود و خروج‌های امروز
            {today?.day ? (
              <span className="auth-muted">
                {" "}
                · {formatJalaliDay(today.day)}
              </span>
            ) : null}
          </h2>
          {voidNotice && !voidOnPage ? (
            <SectionNotice notice={voidNotice.notice} />
          ) : null}
          {logSlice.items.length === 0 ? (
            <p className="auth-muted">امروز هنوز ورود یا خروجی ثبت نشده است.</p>
          ) : (
            <div className="att-log">
              {logSlice.items.map((row) => {
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
                        {row.closedAutomatically ? " · خروج خودکار آخر سانس" : ""}
                        {row.rejectReason ? ` · ${row.rejectReason}` : ""}
                        {row.isVoided && row.voidReason
                          ? ` · ${row.voidReason}`
                          : ""}
                        {visitMinutes != null && !row.isVoided
                          ? ` · ${visitMinutes.toLocaleString("fa-IR")} دقیقه`
                          : ""}
                      </p>
                      {voidNotice?.id === row.id ? (
                        <SectionNotice notice={voidNotice.notice} />
                      ) : null}
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
          <DeskPager
            page={logSlice.page}
            pageCount={logSlice.pageCount}
            busy={busy}
            onPage={setLogPage}
          />
        </section>
      </div>
    </PanelFrame>
  );
}
