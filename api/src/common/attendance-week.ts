/**
 * Attendance week = Saturday 00:00 → Friday (Iran). docs/business-rules.md §1–3
 */
import { addIranDays, iranDayString } from './iran-date.js';
import { iranWeekdayIndex } from './session-schedule.js';

export type WeekWindow = {
  startDay: string;
  endDay: string;
};

/**
 * Saturday–Friday window containing `day` (YYYY-MM-DD Iran calendar).
 * JS weekday: 0=Sun … 6=Sat → days since Saturday = (weekday + 1) % 7
 */
export function weekContaining(day: string): WeekWindow {
  const weekday = iranWeekdayIndex(day);
  const daysSinceSaturday = (weekday + 1) % 7;
  const startDay = addIranDays(day, -daysSinceSaturday);
  const endDay = addIranDays(startDay, 6);
  return { startDay, endDay };
}

export function weekContainingInstant(now: Date = new Date()): WeekWindow {
  return weekContaining(iranDayString(now));
}

/**
 * Distinct Iran calendar days that count toward the weekly cap.
 * A day counts when there is at least one non-voided SUCCESS attendance
 * with check-out recorded (manual or automatic).
 */
export function countedDaysFromAttendances(
  attendances: Array<{
    checkInAt: Date;
    checkOutAt: Date | null;
    result: string;
    voidedAt: Date | null;
  }>,
  week: WeekWindow,
): string[] {
  const set = new Set<string>();
  for (const a of attendances) {
    if (a.result !== 'SUCCESS') continue;
    if (a.voidedAt) continue;
    if (!a.checkOutAt) continue;
    const day = iranDayString(a.checkInAt);
    if (day < week.startDay || day > week.endDay) continue;
    set.add(day);
  }
  return [...set].sort();
}

export function weeklyRemaining(
  weeklyCap: number,
  countedDays: string[],
): number {
  return Math.max(0, weeklyCap - countedDays.length);
}

/**
 * Cap blocks a *new* day only when today is not already counted
 * and countedDays.length >= weeklyCap.
 */
export function weeklyCapBlocksEntry(params: {
  weeklyCap: number;
  countedDays: string[];
  today: string;
}): boolean {
  const { weeklyCap, countedDays, today } = params;
  if (countedDays.includes(today)) return false;
  return countedDays.length >= weeklyCap;
}
