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
      message:
        'الان اشتراک فعالی ندارید. برای خرید یا تمدید اشتراک به پذیرش باشگاه مراجعه کنید.',
    });
    return notices;
  }

  if (params.remainingDays === 0) {
    notices.push({
      type: 'expired',
      message:
        'اشتراک شما تمام شده است. برای تمدید به پذیرش باشگاه مراجعه کنید.',
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
          ? 'امروز آخرین روز اشتراک شماست (تا پایان سانس امروز وقت دارید). تمدید خودکار نیست؛ برای تمدید به پذیرش باشگاه مراجعه کنید.'
          : `${days.toLocaleString('fa-IR')} روز تا پایان اشتراک شما مانده است. تمدید خودکار نیست؛ برای تمدید به پذیرش باشگاه مراجعه کنید.`,
    });
  }

  if (params.debtToman > 0) {
    notices.push({
      type: 'debt',
      message: params.debtBlocksEntry
        ? `از روز ۱۵ اشتراک گذشته و به‌خاطر ماندهٔ شهریه (${params.debtToman.toLocaleString('fa-IR')} تومان) ورود بسته است. برای تسویه به پذیرش مراجعه کنید.`
        : `ماندهٔ شهریهٔ شما ${params.debtToman.toLocaleString('fa-IR')} تومان است. تا روز ۱۴ اشتراک ورود باز است، اما از روز ۱۵ تا زمان تسویه بسته می‌شود.`,
    });
  }

  if (
    params.weeklyCap > 0 &&
    params.remainingWeekDays === 0 &&
    !params.todayAlreadyCounted
  ) {
    notices.push({
      type: 'weekly_cap',
      message:
        'سهم تمرین این هفتهٔ شما تمام شده است. از شنبه دوباره می‌توانید وارد شوید.',
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
