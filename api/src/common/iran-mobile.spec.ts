import { describe, expect, it } from 'vitest';
import {
  clampIranMobileInput,
  isValidIranMobile,
  normalizeIranMobile,
  toAsciiDigits,
} from './iran-mobile.js';

describe('toAsciiDigits', () => {
  it('converts Persian and Arabic-Indic digits', () => {
    expect(toAsciiDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(toAsciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });
});

describe('normalizeIranMobile', () => {
  it('accepts English digits and common prefixes', () => {
    expect(normalizeIranMobile('0912 123 4567')).toBe('09121234567');
    expect(normalizeIranMobile('9121234567')).toBe('09121234567');
    expect(normalizeIranMobile('+98 912 123 4567')).toBe('09121234567');
    expect(normalizeIranMobile('989121234567')).toBe('09121234567');
  });

  it('accepts Persian digits', () => {
    expect(normalizeIranMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
    expect(normalizeIranMobile('+۹۸ ۹۱۲ ۱۲۳ ۴۵۶۷')).toBe('09121234567');
  });

  it('handles long paste by digit extraction then shape rules', () => {
    const long = '091212345678901234567890';
    expect(normalizeIranMobile(long)).toBe(long.replace(/\D/g, ''));
    expect(isValidIranMobile(normalizeIranMobile(long))).toBe(false);
  });
});

describe('clampIranMobileInput', () => {
  it('stops local 09… numbers at 11 digits', () => {
    expect(clampIranMobileInput('0912123456789012345')).toBe('09121234567');
    expect(clampIranMobileInput('۰۹۱۲۱۲۳۴۵۶۷۸۹۰۱۲')).toBe('۰۹۱۲۱۲۳۴۵۶۷');
  });

  it('allows 12 digits only for 98… / +98…', () => {
    expect(clampIranMobileInput('98912123456789')).toBe('989121234567');
    expect(clampIranMobileInput('+98 912 123 4567')).toBe('+98 912 123 4567');
  });
});

describe('isValidIranMobile', () => {
  it('requires standard 09xxxxxxxxx', () => {
    expect(isValidIranMobile('09121234567')).toBe(true);
    expect(isValidIranMobile('0912123456')).toBe(false);
    expect(isValidIranMobile('08121234567')).toBe(false);
    expect(isValidIranMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe(false);
  });
});
