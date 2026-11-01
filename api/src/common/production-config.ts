/** Settings that must never reach a live server. Empty list = safe to start. */
export function productionConfigProblems(env: NodeJS.ProcessEnv): string[] {
  if ((env.NODE_ENV ?? 'development') !== 'production') return [];

  const problems: string[] = [];

  if (env.OTP_DEV_CODE?.trim()) {
    problems.push(
      'OTP_DEV_CODE is set: anyone could log in as any member with the fixed code. Remove it.',
    );
  }

  const webOrigin = env.WEB_ORIGIN?.trim() ?? '';
  if (!webOrigin.startsWith('https://')) {
    problems.push('WEB_ORIGIN must be the real https:// address of the site.');
  }

  const databaseUrl = env.DATABASE_URL?.trim() ?? '';
  if (!databaseUrl) {
    problems.push('DATABASE_URL is missing.');
  } else if (databaseUrl.includes('fitsteel_dev')) {
    problems.push('DATABASE_URL still uses the local sample database password.');
  }

  return problems;
}
