import { describe, expect, it } from 'vitest';
import {
  compareHm,
  iranWallDateTime,
  iranWeekdayIndex,
  isInsideSessionWindow,
  parseSessionSchedule,
  sessionCloseAt,
  weekdayKeyForDay,
} from './session-schedule.js';

const SAMPLE = parseSessionSchedule({
  men: {
    sat: { open: '15:00', close: '23:00' },
    sun: { open: '15:00', close: '23:00' },
    mon: { open: '15:00', close: '23:00' },
    tue: { open: '15:00', close: '23:00' },
    wed: { open: '15:00', close: '23:00' },
    thu: { open: '15:00', close: '22:00' },
    fri: { open: '16:00', close: '21:00' },
  },
  women: {
    sat: { open: '07:00', close: '14:30' },
    sun: { open: '07:00', close: '14:30' },
    mon: { open: '07:00', close: '14:30' },
    tue: { open: '07:00', close: '14:30' },
    wed: { open: '07:00', close: '14:30' },
    thu: { open: '07:00', close: '13:30' },
    fri: { open: null, close: null },
  },
});

describe('session-schedule', () => {
  it('maps Iran weekdays and compares HH:mm', () => {
    // 2026-10-17 is Saturday
    expect(weekdayKeyForDay('2026-10-17')).toBe('sat');
    expect(iranWeekdayIndex('2026-10-17')).toBe(6);
    expect(compareHm('07:00', '14:30')).toBe(-1);
    expect(compareHm('14:30', '14:30')).toBe(0);
  });

  it('women Friday has no session; men Friday is open in sample', () => {
    expect(isInsideSessionWindow(SAMPLE, 'WOMEN', '2026-10-16', '10:00')).toBe(
      false,
    ); // Friday
    expect(isInsideSessionWindow(SAMPLE, 'MEN', '2026-10-16', '17:00')).toBe(
      true,
    );
  });

  it('entry closed at exact session end; open at start', () => {
    expect(isInsideSessionWindow(SAMPLE, 'WOMEN', '2026-10-17', '07:00')).toBe(
      true,
    );
    expect(isInsideSessionWindow(SAMPLE, 'WOMEN', '2026-10-17', '14:29')).toBe(
      true,
    );
    expect(isInsideSessionWindow(SAMPLE, 'WOMEN', '2026-10-17', '14:30')).toBe(
      false,
    );
    expect(isInsideSessionWindow(SAMPLE, 'WOMEN', '2026-10-17', '16:00')).toBe(
      false,
    );
  });

  it('men session does not admit women outside their hours', () => {
    // Thursday afternoon men open, women already closed
    expect(isInsideSessionWindow(SAMPLE, 'WOMEN', '2026-10-15', '16:00')).toBe(
      false,
    );
    expect(isInsideSessionWindow(SAMPLE, 'MEN', '2026-10-15', '16:00')).toBe(
      true,
    );
  });

  it('builds session close instant in Iran offset', () => {
    const close = sessionCloseAt(SAMPLE, 'WOMEN', '2026-10-17');
    expect(close).toEqual(iranWallDateTime('2026-10-17', '14:30'));
  });
});
