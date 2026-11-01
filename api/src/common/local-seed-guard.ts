const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** Host from a postgres URL. The last @ separates the password from the host. */
export function databaseHost(databaseUrl: string): string | null {
  const trimmed = databaseUrl.trim();
  if (!trimmed) return null;
  const rest = trimmed.replace(/^postgres(?:ql)?:\/\//i, '');
  const at = rest.lastIndexOf('@');
  if (at < 0) return null;
  const hostPort = rest.slice(at + 1).split('?')[0]?.split('/')[0] ?? '';
  if (!hostPort) return null;
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    return end > 1 ? hostPort.slice(1, end) : null;
  }
  const colon = hostPort.lastIndexOf(':');
  if (colon > 0 && /^\d+$/.test(hostPort.slice(colon + 1))) {
    return hostPort.slice(0, colon);
  }
  return hostPort;
}

/**
 * The local sample seed deletes every club row. It may run only on the
 * programmer's machine. DEMO_MODE does not unlock it.
 * Returns an error message, or null when the wipe is allowed.
 */
export function localSeedWipeRefusal(env: NodeJS.ProcessEnv): string | null {
  const nodeEnv = (env.NODE_ENV ?? 'development').trim() || 'development';
  if (nodeEnv === 'production') {
    return 'Refusing to wipe the database. prisma db seed is local-only and deletes every member, payment, and attendance. DEMO_MODE does not allow this. On the server run npm run bootstrap:server, which only adds missing accounts.';
  }
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    return `Refusing to wipe the database. NODE_ENV=${nodeEnv} is not local development. On the server run npm run bootstrap:server.`;
  }
  const host = databaseHost(env.DATABASE_URL ?? '');
  if (!host || !LOCAL_HOSTS.has(host.toLowerCase())) {
    return `Refusing to wipe the database. The seed only runs against localhost. DATABASE_URL host is "${host ?? 'missing'}".`;
  }
  return null;
}
