import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_CLEAR_PATHS,
  sessionCookieOptions,
} from './session-cookie.js';

describe('sessionCookieOptions', () => {
  it('uses the same flags on the site root and on /api', () => {
    const root = sessionCookieOptions('/', 'production', new Date('2026-12-01T00:00:00Z'));
    const api = sessionCookieOptions('/api', 'production');
    expect(root).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });
    expect(api).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/api',
    });
    expect(root.expires?.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('leaves the cookie non-secure outside production', () => {
    expect(sessionCookieOptions('/', 'development').secure).toBe(false);
    expect(sessionCookieOptions('/', undefined).secure).toBe(false);
  });

  it('clears the root cookie and a proxy path of /api', () => {
    expect(SESSION_COOKIE_CLEAR_PATHS).toEqual(['/', '/api', '/api/']);
  });
});
