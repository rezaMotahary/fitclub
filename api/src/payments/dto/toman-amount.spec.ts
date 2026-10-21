import { describe, expect, it } from 'vitest';
import { parseTomanAmount } from './toman-amount.js';

describe('parseTomanAmount', () => {
  it('accepts English digit strings and numbers', () => {
    expect(parseTomanAmount(445_000)).toBe(445_000);
    expect(parseTomanAmount('445000')).toBe(445_000);
    expect(parseTomanAmount('445,000')).toBe(445_000);
  });

  it('accepts Persian digit strings', () => {
    expect(parseTomanAmount('۴۴۵۰۰۰')).toBe(445_000);
    expect(parseTomanAmount('۴۴۵٬۰۰۰')).toBe(445_000);
  });

  it('returns null for invalid', () => {
    expect(parseTomanAmount('')).toBeNull();
    expect(parseTomanAmount('abc')).toBeNull();
    expect(parseTomanAmount(1.5)).toBeNull();
  });
});
