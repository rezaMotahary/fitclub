/**
 * Member/admin dashboard notice helpers — docs/business-rules.md §5 · §8
 * Expiry reminder from 14 remaining days; no auto-renew wording.
 */

export type MemberNoticeType = 'expiry' | 'expired' | 'debt' | 'weekly_cap' | 'no_subscription';

export type MemberNotice = {
  type: MemberNoticeType;
  message: string;
};

/** True when remaining inclusive days are in 1…14 and no next period is queued. */
export function shouldShowExpiryNotice(params: {
  remainingDays: number | null;
  hasUpcomingRenewal: boolean;
}): boolean {
  const { remainingDays, hasUpcomingRenewal } = params;
  if (remainingDays == null) return false;
  if (hasUpcomingRenewal) return false;
  return remainingDays >= 1 && remainingDays <= 14;
}

export function buildMemberNotices(params: {
  hasCurrentSubscription: boolean;
  remainingDays: number | null;
  hasUpcomingRenewal: boolean;
  debtToman: number;
  debtBlocksEntry: boolean;
  weeklyCap: number;
  remainingWeekDays: number;
  todayAlreadyCounted: boolean;
}): MemberNotice[] {
  const notices: MemberNotice[] = [];

  if (!params.hasCurrentSubscription) {
    notices.push({
      type: 'no_subscription',
      message: 'اشتراک جاری ندارید. برای تمدید به پذیرش مراجعه کنید.',
    });
    return notices;
  }

  if (params.remainingDays === 0) {
    notices.push({
      type: 'expired',
      message: 'دورهٔ اشتراک تمام شده است. برای تمدید به پذیرش مراجعه کنید.',
    });
  } else if (
    shouldShowExpiryNotice({
      remainingDays: params.remainingDays,
      hasUpcomingRenewal: params.hasUpcomingRenewal,
    })
  ) {
    const days = params.remainingDays!;
    notices.push({
      type: 'expiry',
      message:
        days === 1
          ? 'امروز آخرین روز اشتراک است. تمدید خودکار نیست؛ برای ادامه به پذیرش مراجعه کنید.'
          : `${days.toLocaleString('fa-IR')} روز تا پایان اشتراک مانده. تمدید خودکار نیست؛ برای تمدید به پذیرش مراجعه کنید.`,
    });
  }

  if (params.debtToman > 0) {
    notices.push({
      type: 'debt',
      message: params.debtBlocksEntry
        ? `ماندهٔ شهریه ${params.debtToman.toLocaleString('fa-IR')} تومان است و فعلاً ورود به‌خاطر بدهی بسته است.`
        : `ماندهٔ شهریه ${params.debtToman.toLocaleString('fa-IR')} تومان — تا روز ۱۴ ورود باز است؛ از روز ۱۵ تا تسویه بسته می‌شود.`,
    });
  }

  if (
    params.weeklyCap > 0 &&
    params.remainingWeekDays === 0 &&
    !params.todayAlreadyCounted
  ) {
    notices.push({
      type: 'weekly_cap',
      message: 'سقف هفته پر شده است. سهم هفته شنبه بعد صفر می‌شود.',
    });
  }

  return notices;
}

export const WEEKDAY_LABELS_FA = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

export function weekCalendarDays(params: {
  startDay: string;
  countedDays: string[];
  today: string;
  addIranDays: (day: string, delta: number) => string;
}): Array<{
  day: string;
  weekdayLabel: string;
  counted: boolean;
  isToday: boolean;
}> {
  const counted = new Set(params.countedDays);
  return Array.from({ length: 7 }, (_, i) => {
    const day = params.addIranDays(params.startDay, i);
    return {
      day,
      weekdayLabel: WEEKDAY_LABELS_FA[i]!,
      counted: counted.has(day),
      isToday: day === params.today,
    };
  });
}
