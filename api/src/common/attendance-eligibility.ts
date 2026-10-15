/**
 * Pure entry-eligibility rules — docs/business-rules.md §3 · §5 · §6 · §7
 */
import { AttendanceResult } from '@prisma/client';
import {
  calendarDayOf,
  debtBlocksEntryForSubscription,
  isUpcomingPeriod,
  remainingDaysInclusive,
} from './subscription-period.js';
import { compareIranDays } from './iran-date.js';
import {
  isInsideSessionWindow,
  sessionCloseAt,
  type SessionGenderKey,
  type SessionSchedule,
} from './session-schedule.js';
import {
  weeklyCapBlocksEntry,
  weeklyRemaining,
  type WeekWindow,
} from './attendance-week.js';

export type EligibilityDenyCode =
  | 'ARCHIVED'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'DEBT'
  | 'ALREADY_INSIDE'
  | 'WEEKLY_CAP'
  | 'OUTSIDE_SESSION'
  | 'NO_SUBSCRIPTION';

export type EligibilityInput = {
  today: string;
  hmNow: string;
  now: Date;
  isArchived: boolean;
  sessionGender: SessionGenderKey;
  schedule: SessionSchedule;
  week: WeekWindow;
  weeklyCap: number;
  countedDays: string[];
  hasOpenAttendance: boolean;
  /** Current subscription window, or null if none covering today / upcoming only. */
  subscription: {
    startsAt: Date;
    endsAt: Date;
    priceToman: number;
    amountPaidToman: number;
  } | null;
  /** Upcoming-only (starts in future) when no current. */
  upcomingStartsOn?: string | null;
};

export type EligibilityOk = {
  allowed: true;
  denyCode: null;
  denyMessage: null;
  attendanceResult: null;
  weeklyCap: number;
  countedDaysThisWeek: number;
  remainingWeekDays: number;
  todayAlreadyCounted: boolean;
  subscriptionEndsOn: string | null;
  remainingSubscriptionDays: number | null;
  debtBlocks: boolean;
  insideSession: boolean;
  hasOpenAttendance: boolean;
};

export type EligibilityDenied = {
  allowed: false;
  denyCode: EligibilityDenyCode;
  denyMessage: string;
  attendanceResult: AttendanceResult;
  weeklyCap: number;
  countedDaysThisWeek: number;
  remainingWeekDays: number;
  todayAlreadyCounted: boolean;
  subscriptionEndsOn: string | null;
  remainingSubscriptionDays: number | null;
  debtBlocks: boolean;
  insideSession: boolean;
  hasOpenAttendance: boolean;
};

export type EligibilityResult = EligibilityOk | EligibilityDenied;

const MESSAGES: Record<EligibilityDenyCode, string> = {
  ARCHIVED: 'عضو آرشیو است؛ ورود مجاز نیست',
  NOT_STARTED: 'تاریخ شروع دوره هنوز نرسیده؛ ورود بسته است',
  EXPIRED: 'اشتراک منقضی شده؛ نیاز به تمدید',
  DEBT: 'از روز ۱۵ ماندهٔ شهریه تسویه نشده؛ ورود بسته است',
  ALREADY_INSIDE: 'عضو همین حالا داخل سالن است؛ اول خروج ثبت شود',
  WEEKLY_CAP: 'سقف این هفته پر است و امروز هنوز شمرده نشده',
  OUTSIDE_SESSION: 'الان بیرون از ساعت سانس جنس این عضو است',
  NO_SUBSCRIPTION: 'اشتراک فعالی برای امروز نیست؛ نیاز به فروش یا تمدید',
};

function deny(
  code: EligibilityDenyCode,
  result: AttendanceResult,
  base: Omit<
    EligibilityOk,
    'allowed' | 'denyCode' | 'denyMessage' | 'attendanceResult'
  >,
): EligibilityDenied {
  return {
    ...base,
    allowed: false,
    denyCode: code,
    denyMessage: MESSAGES[code],
    attendanceResult: result,
  };
}

/**
 * Evaluate check-in permission. Order matches user-flows + business-rules.
 */
export function evaluateEntryEligibility(
  input: EligibilityInput,
): EligibilityResult {
  const todayAlreadyCounted = input.countedDays.includes(input.today);
  const remainingWeekDays = weeklyRemaining(
    input.weeklyCap,
    input.countedDays,
  );
  const insideSession = isInsideSessionWindow(
    input.schedule,
    input.sessionGender,
    input.today,
    input.hmNow,
  );

  let subscriptionEndsOn: string | null = null;
  let remainingSubscriptionDays: number | null = null;
  let debtBlocks = false;

  if (input.subscription) {
    subscriptionEndsOn = calendarDayOf(input.subscription.endsAt);
    remainingSubscriptionDays = remainingDaysInclusive(
      subscriptionEndsOn,
      input.today,
    );
    debtBlocks = debtBlocksEntryForSubscription(
      input.subscription,
      input.today,
    );
  }

  const base = {
    weeklyCap: input.weeklyCap,
    countedDaysThisWeek: input.countedDays.length,
    remainingWeekDays,
    todayAlreadyCounted,
    subscriptionEndsOn,
    remainingSubscriptionDays,
    debtBlocks,
    insideSession,
    hasOpenAttendance: input.hasOpenAttendance,
  };

  if (input.isArchived) {
    return deny('ARCHIVED', AttendanceResult.REJECTED_ARCHIVED, base);
  }

  if (!input.subscription) {
    if (input.upcomingStartsOn) {
      return deny('NOT_STARTED', AttendanceResult.REJECTED_NOT_STARTED, base);
    }
    return deny('NO_SUBSCRIPTION', AttendanceResult.REJECTED_EXPIRED, base);
  }

  const startsOn = calendarDayOf(input.subscription.startsAt);
  const endsOn = calendarDayOf(input.subscription.endsAt);

  if (isUpcomingPeriod(startsOn, input.today)) {
    return deny('NOT_STARTED', AttendanceResult.REJECTED_NOT_STARTED, base);
  }

  if (compareIranDays(input.today, endsOn) > 0) {
    return deny('EXPIRED', AttendanceResult.REJECTED_EXPIRED, base);
  }

  // Day 30: after that day's session close → expired
  if (compareIranDays(input.today, endsOn) === 0) {
    const closeAt = sessionCloseAt(
      input.schedule,
      input.sessionGender,
      input.today,
    );
    if (closeAt && input.now.getTime() >= closeAt.getTime()) {
      return deny('EXPIRED', AttendanceResult.REJECTED_EXPIRED, {
        ...base,
        remainingSubscriptionDays: 0,
      });
    }
  }

  if (debtBlocks) {
    return deny('DEBT', AttendanceResult.REJECTED_DEBT, base);
  }

  if (input.hasOpenAttendance) {
    return deny(
      'ALREADY_INSIDE',
      AttendanceResult.REJECTED_ALREADY_INSIDE,
      base,
    );
  }

  if (
    weeklyCapBlocksEntry({
      weeklyCap: input.weeklyCap,
      countedDays: input.countedDays,
      today: input.today,
    })
  ) {
    return deny('WEEKLY_CAP', AttendanceResult.REJECTED_WEEKLY_CAP, base);
  }

  if (!insideSession) {
    return deny(
      'OUTSIDE_SESSION',
      AttendanceResult.REJECTED_OUTSIDE_SESSION,
      base,
    );
  }

  return {
    ...base,
    allowed: true,
    denyCode: null,
    denyMessage: null,
    attendanceResult: null,
  };
}

export { MESSAGES as ELIGIBILITY_MESSAGES };
