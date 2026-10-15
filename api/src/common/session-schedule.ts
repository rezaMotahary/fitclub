/**
 * Club session hours from ClubSettings.sessionSchedule (sample until owner sets real times).
 * docs/business-rules.md §3 · §9
 */
import { IRAN_TIME_ZONE, parseDayString } from './iran-date.js';

export type SessionGenderKey = 'MEN' | 'WOMEN';

export type DaySlot = {
  open: string | null;
  close: string | null;
};

export type WeekdayKey = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export type GenderSchedule = Record<WeekdayKey, DaySlot>;

export type SessionSchedule = {
  men: GenderSchedule;
  women: GenderSchedule;
};

const WEEKDAY_KEYS: WeekdayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

/** Iran has no DST; fixed offset for building local wall times. */
export const IRAN_OFFSET = '+03:30';

const HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHm(value: string | null | undefined): value is string {
  return typeof value === 'string' && HM_RE.test(value);
}

export function compareHm(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Instant for an Iran calendar day + HH:mm wall clock.
 */
export function iranWallDateTime(day: string, hm: string): Date {
  const { year, month, day: d } = parseDayString(day);
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return new Date(`${y}-${m}-${dd}T${hm}:00${IRAN_OFFSET}`);
}

/** HH:mm in Asia/Tehran for an instant. */
export function iranHm(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IRAN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

/**
 * JS weekday 0=Sun…6=Sat for an abstract Iran calendar day.
 */
export function iranWeekdayIndex(day: string): number {
  const instant = iranWallDateTime(day, '12:00');
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: IRAN_TIME_ZONE,
    weekday: 'short',
  }).format(instant);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const idx = map[short];
  if (idx === undefined) {
    throw new Error(`Unexpected weekday: ${short}`);
  }
  return idx;
}

export function weekdayKeyForDay(day: string): WeekdayKey {
  return WEEKDAY_KEYS[iranWeekdayIndex(day)]!;
}

function asDaySlot(raw: unknown): DaySlot {
  if (!raw || typeof raw !== 'object') {
    return { open: null, close: null };
  }
  const rec = raw as Record<string, unknown>;
  const open = typeof rec.open === 'string' ? rec.open : null;
  const close = typeof rec.close === 'string' ? rec.close : null;
  return {
    open: isValidHm(open) ? open : null,
    close: isValidHm(close) ? close : null,
  };
}

function asGenderSchedule(raw: unknown): GenderSchedule {
  const empty: DaySlot = { open: null, close: null };
  const base = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    sat: asDaySlot(base.sat) ?? empty,
    sun: asDaySlot(base.sun) ?? empty,
    mon: asDaySlot(base.mon) ?? empty,
    tue: asDaySlot(base.tue) ?? empty,
    wed: asDaySlot(base.wed) ?? empty,
    thu: asDaySlot(base.thu) ?? empty,
    fri: asDaySlot(base.fri) ?? empty,
  };
}

/** Parse JSON from ClubSettings; tolerate missing keys. */
export function parseSessionSchedule(raw: unknown): SessionSchedule {
  const root =
    typeof raw === 'string'
      ? (JSON.parse(raw) as unknown)
      : raw && typeof raw === 'object'
        ? raw
        : {};
  const rec = root as Record<string, unknown>;
  return {
    men: asGenderSchedule(rec.men),
    women: asGenderSchedule(rec.women),
  };
}

export function slotFor(
  schedule: SessionSchedule,
  gender: SessionGenderKey,
  day: string,
): DaySlot {
  const genderKey = gender === 'MEN' ? 'men' : 'women';
  const weekKey = weekdayKeyForDay(day);
  return schedule[genderKey][weekKey];
}

export function hasSessionOnDay(
  schedule: SessionSchedule,
  gender: SessionGenderKey,
  day: string,
): boolean {
  const slot = slotFor(schedule, gender, day);
  return isValidHm(slot.open) && isValidHm(slot.close);
}

/**
 * Entry is allowed while open <= now < close (exact close = closed).
 */
export function isInsideSessionWindow(
  schedule: SessionSchedule,
  gender: SessionGenderKey,
  day: string,
  hmNow: string,
): boolean {
  const slot = slotFor(schedule, gender, day);
  if (!isValidHm(slot.open) || !isValidHm(slot.close)) return false;
  return (
    compareHm(hmNow, slot.open) >= 0 && compareHm(hmNow, slot.close) < 0
  );
}

/** Instant of configured session close for that gender/day, or null if no session. */
export function sessionCloseAt(
  schedule: SessionSchedule,
  gender: SessionGenderKey,
  day: string,
): Date | null {
  const slot = slotFor(schedule, gender, day);
  if (!isValidHm(slot.close)) return null;
  return iranWallDateTime(day, slot.close);
}

export function sessionOpenAt(
  schedule: SessionSchedule,
  gender: SessionGenderKey,
  day: string,
): Date | null {
  const slot = slotFor(schedule, gender, day);
  if (!isValidHm(slot.open)) return null;
  return iranWallDateTime(day, slot.open);
}
