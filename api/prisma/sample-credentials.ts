/**
 * Local sample credentials only — never use in production.
 * Documented in docs/.env.example and docs/sample-data.md.
 */
export const SAMPLE_STAFF_PASSWORDS = {
  admin: 'FitClubAdmin1!',
  secretary: 'FitClubSecretary1!',
} as const;

/** Used when OTP_DEV_CODE is unset in development. */
export const SAMPLE_OTP_DEV_CODE = '123456';

export const SAMPLE_MEMBER_PHONE = '09121234567';
export const SAMPLE_ARCHIVED_MEMBER_PHONE = '09129990000';
