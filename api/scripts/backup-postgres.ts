/**
 * Dump the club database. Never deletes members or payments.
 *
 *   BACKUP_DIR=D:\fitclub-backups npm run backup:db
 *
 * BACKUP_DIR must be an absolute folder outside this project.
 * Older fitclub-*.dump files beyond FITCLUB_BACKUP_KEEP (default 30) are removed.
 * Other files in that folder are left alone.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { runPostgresBackup } from '../src/ops/postgres-backup.js';

function dump(invocation: { args: string[]; env: NodeJS.ProcessEnv }): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pg_dump', invocation.args, {
      env: { ...process.env, ...invocation.env },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        reject(new Error('pg_dump was not found. Install the PostgreSQL client tools on this machine.'));
        return;
      }
      reject(error);
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited with code ${code ?? 'unknown'}.`));
    });
  });
}

try {
  const result = await runPostgresBackup({
    env: process.env,
    now: new Date(),
    mkdir: async (dir) => {
      await mkdir(dir, { recursive: true });
    },
    readdir,
    unlink,
    dump,
  });
  console.log(`FitClub database backup written: ${result.file}`);
  if (result.pruned.length > 0) {
    console.log(`Removed ${result.pruned.length} older dump file(s). Club data was not touched.`);
  }
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
