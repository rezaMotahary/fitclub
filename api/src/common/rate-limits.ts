function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** Read at request time so tests and servers can tune limits through env. */
export const rateLimits = {
  apiPerMinute: () => envInt('RATE_LIMIT_API_PER_MIN', 300),
  staffLoginPerMinute: () => envInt('RATE_LIMIT_STAFF_LOGIN_PER_MIN', 10),
  otpRequestPerMinute: () => envInt('RATE_LIMIT_OTP_REQUEST_PER_MIN', 5),
  otpVerifyPerMinute: () => envInt('RATE_LIMIT_OTP_VERIFY_PER_MIN', 10),
  otpResendCooldownSec: () => envInt('OTP_RESEND_COOLDOWN_SEC', 60),
  otpMaxPerPhonePerHour: () =>
    envInt(
      'OTP_MAX_PER_PHONE_PER_HOUR',
      process.env.NODE_ENV === 'production' ? 5 : 30,
    ),
};

export const RATE_LIMIT_MESSAGE =
  'تعداد درخواست‌ها زیاد است. چند دقیقه بعد دوباره تلاش کنید.';
