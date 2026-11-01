import path from 'node:path';

export type PgTarget = {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
};

/** Read a postgres URL. A password may contain @ or : if it is URL-encoded. */
export function parsePostgresUrl(databaseUrl: string): PgTarget {
  const trimmed = databaseUrl.trim();
  if (!/^postgres(?:ql)?:\/\//i.test(trimmed)) {
    throw new Error('DATABASE_URL must start with postgresql://');
  }
  const withoutScheme = trimmed.replace(/^postgres(?:ql)?:\/\//i, '');
  const at = withoutScheme.lastIndexOf('@');
  if (at <= 0) throw new Error('DATABASE_URL must include a user and a host.');
  const userinfo = withoutScheme.slice(0, at);
  const hostAndPath = withoutScheme.slice(at + 1).split('?')[0] ?? '';
  const slash = hostAndPath.indexOf('/');
  if (slash <= 0) throw new Error('DATABASE_URL must include a database name.');
  const hostPort = hostAndPath.slice(0, slash);
  const database = decodeURIComponent(hostAndPath.slice(slash + 1));
  const colon = userinfo.indexOf(':');
  if (colon <= 0) throw new Error('DATABASE_URL must include a password.');
  const user = decodeURIComponent(userinfo.slice(0, colon));
  const password = decodeURIComponent(userinfo.slice(colon + 1));

  let host = hostPort;
  let port = '5432';
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end < 2) throw new Error('DATABASE_URL host is invalid.');
    host = hostPort.slice(1, end);
    const rest = hostPort.slice(end + 1);
    if (rest.startsWith(':') && rest.length > 1) port = rest.slice(1);
  } else {
    const portColon = hostPort.lastIndexOf(':');
    if (portColon > 0 && /^\d+$/.test(hostPort.slice(portColon + 1))) {
      host = hostPort.slice(0, portColon);
      port = hostPort.slice(portColon + 1);
    }
  }

  if (!user || !password || !host || !database) {
    throw new Error('DATABASE_URL is incomplete.');
  }
  return { user, password, host, port, database };
}

/** UTC timestamp so newer dump names sort after older ones. */
export function backupDumpName(now: Date): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  return `fitclub-${stamp}.dump`;
}

const DUMP_NAME = /^fitclub-\d{8}-\d{6}\.dump$/;

/** Oldest dump names beyond `keep`. Never returns other files. */
export function selectOldDumps(fileNames: string[], keep: number): string[] {
  const dumps = fileNames.filter((name) => DUMP_NAME.test(name)).sort();
  const safeKeep = Math.max(1, keep);
  return dumps.slice(0, Math.max(0, dumps.length - safeKeep));
}

export function pgDumpInvocation(
  target: PgTarget,
  filePath: string,
): { args: string[]; env: NodeJS.ProcessEnv } {
  return {
    args: ['--format=custom', '--file', filePath, '--no-owner', '--no-acl'],
    env: {
      PGUSER: target.user,
      PGPASSWORD: target.password,
      PGHOST: target.host,
      PGPORT: target.port,
      PGDATABASE: target.database,
    },
  };
}

export type BackupIo = {
  env: NodeJS.ProcessEnv;
  now: Date;
  mkdir: (dir: string) => Promise<void>;
  readdir: (dir: string) => Promise<string[]>;
  unlink: (file: string) => Promise<void>;
  dump: (invocation: { args: string[]; env: NodeJS.ProcessEnv }) => Promise<void>;
};

export async function runPostgresBackup(
  io: BackupIo,
): Promise<{ file: string; pruned: string[] }> {
  const databaseUrl = io.env.DATABASE_URL?.trim() ?? '';
  if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
  const backupDir = io.env.BACKUP_DIR?.trim() ?? '';
  if (!backupDir) {
    throw new Error(
      'BACKUP_DIR is required. Choose an absolute folder outside the project. No default folder is guessed.',
    );
  }
  if (!path.isAbsolute(backupDir)) {
    throw new Error('BACKUP_DIR must be an absolute folder outside the project.');
  }

  const keepRaw = Number(io.env.FITCLUB_BACKUP_KEEP ?? '30');
  const keep = Number.isInteger(keepRaw) && keepRaw > 0 ? keepRaw : 30;
  const target = parsePostgresUrl(databaseUrl);
  await io.mkdir(backupDir);
  const file = path.join(backupDir, backupDumpName(io.now));
  await io.dump(pgDumpInvocation(target, file));

  const pruned = selectOldDumps(await io.readdir(backupDir), keep).map((name) =>
    path.join(backupDir, name),
  );
  for (const old of pruned) {
    if (path.resolve(old) === path.resolve(file)) continue;
    await io.unlink(old);
  }
  return { file, pruned };
}
