/** Shared flags so setting and clearing the session cookie match. */
export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  expires?: Date;
};

/**
 * Paths a browser may have stored.
 * `/` is what the API sets. `/api` is what a reverse proxy sometimes rewrites it to.
 */
export const SESSION_COOKIE_CLEAR_PATHS = ['/', '/api', '/api/'] as const;

export function sessionCookieOptions(
  path: string,
  nodeEnv: string | undefined,
  expires?: Date,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: (nodeEnv ?? 'development') === 'production',
    path,
    ...(expires ? { expires } : {}),
  };
}
