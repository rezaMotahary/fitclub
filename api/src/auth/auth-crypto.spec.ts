import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  generateOtpCode,
  hashSecret,
  hashSessionToken,
  verifySecret,
} from './auth-crypto.js';

describe('auth-crypto', () => {
  it('hashes and verifies secrets', async () => {
    const hash = await hashSecret('FitClubAdmin1!');
    expect(hash).toContain(':');
    expect(await verifySecret('FitClubAdmin1!', hash)).toBe(true);
    expect(await verifySecret('wrong', hash)).toBe(false);
  });

  it('session token hashes are deterministic lookups', () => {
    const token = createSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(hashSessionToken(createSessionToken()));
  });

  it('OTP codes are 6 digits', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});
