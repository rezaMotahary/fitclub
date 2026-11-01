/** Keep automated tests on the fixed dev code. Never spend live SMS credit. */
process.env.KAVENEGAR_API_KEY = '';
process.env.KAVENEGAR_SENDER = '';

/** e2e suites log in many times in a row; real limits are covered by their own tests. */
process.env.RATE_LIMIT_API_PER_MIN ??= '100000';
process.env.RATE_LIMIT_STAFF_LOGIN_PER_MIN ??= '100000';
process.env.RATE_LIMIT_OTP_REQUEST_PER_MIN ??= '100000';
process.env.RATE_LIMIT_OTP_VERIFY_PER_MIN ??= '100000';
process.env.OTP_RESEND_COOLDOWN_SEC ??= '0';
process.env.OTP_MAX_PER_PHONE_PER_HOUR ??= '100000';
