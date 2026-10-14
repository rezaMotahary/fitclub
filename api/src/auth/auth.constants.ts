export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? 'fitclub_session';

export const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 7);

export const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES ?? 5);

export const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);

/** Fallback when OTP_DEV_CODE is unset (dev only). Keep in sync with prisma/sample-credentials. */
export const DEFAULT_OTP_DEV_CODE = '123456';

export const ROLES_KEY = 'roles';
