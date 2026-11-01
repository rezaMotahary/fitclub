import { describe, expect, it } from 'vitest';
import { staffPasswordProblem } from './password-policy.js';
import { SAMPLE_STAFF_PASSWORDS } from './sample-passwords.js';

describe('staffPasswordProblem', () => {
  it('accepts a long password with letters and English digits', () => {
    expect(staffPasswordProblem('Reception-Desk-2026')).toBeNull();
  });

  it('accepts a long password with letters and Persian digits', () => {
    expect(staffPasswordProblem('Reception-Desk-۲۰۲۶')).toBeNull();
    expect(staffPasswordProblem('Reception-Desk-٢٠٢٦')).toBeNull();
  });

  it('rejects short passwords', () => {
    expect(staffPasswordProblem('Short1!')).toMatch(/at least 12/);
  });

  it('rejects passwords without digits or without letters', () => {
    expect(staffPasswordProblem('OnlyLettersHere!')).toMatch(/letters and digits/);
    expect(staffPasswordProblem('123456789012345')).toMatch(/letters and digits/);
    expect(staffPasswordProblem('۱۲۳۴۵۶۷۸۹۰۱۲۳')).toMatch(/letters and digits/);
  });

  it('rejects the published sample passwords', () => {
    expect(staffPasswordProblem(SAMPLE_STAFF_PASSWORDS.secretary)).toMatch(/sample/);
  });

  it('rejects absurdly long passwords', () => {
    expect(staffPasswordProblem(`a1${'x'.repeat(300)}`)).toMatch(/at most 200/);
  });
});
