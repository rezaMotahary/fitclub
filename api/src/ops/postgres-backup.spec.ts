import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  backupDumpName,
  parsePostgresUrl,
  pgDumpInvocation,
  runPostgresBackup,
  selectOldDumps,
} from './postgres-backup.js';

describe('parsePostgresUrl', () => {
  it('reads a local url without putting the password in dump arguments', () => {
    const target = parsePostgresUrl(
      'postgresql://fitsteel:fitsteel_dev@localhost:5432/fitsteel?schema=public',
    );
    expect(target).toMatchObject({
      user: 'fitsteel',
      password: 'fitsteel_dev',
      host: 'localhost',
      port: '5432',
      database: 'fitsteel',
    });
    const dump = pgDumpInvocation(
      target,
      path.join('/var/backups/fitclub', 'fitclub-20261101-120000.dump'),
    );
    expect(dump.args.join(' ')).not.toContain('fitsteel_dev');
    expect(dump.args).not.toEqual(expect.arrayContaining(['--clean', '--if-exists']));
    expect(dump.args.join(' ')).not.toMatch(/drop|reset/i);
    expect(dump.env.PGPASSWORD).toBe('fitsteel_dev');
    expect(dump.env.PGDATABASE).toBe('fitsteel');
  });

  it('keeps a strong password that contains an at sign', () => {
    const target = parsePostgresUrl(
      'postgresql://club:p%40ss:word@127.0.0.1:5433/fitclub',
    );
    expect(target.password).toBe('p@ss:word');
    expect(target.host).toBe('127.0.0.1');
    expect(target.port).toBe('5433');
    expect(target.database).toBe('fitclub');
  });
});

describe('backup files', () => {
  it('names dumps so the newest sorts last', () => {
    expect(backupDumpName(new Date('2026-11-01T13:45:09Z'))).toBe(
      'fitclub-20261101-134509.dump',
    );
  });

  it('prunes only old fitclub dumps and keeps the newest files', () => {
    const names = [
      'fitclub-20261101-120000.dump',
      'fitclub-20261103-120000.dump',
      'notes.txt',
      'fitclub-20261102-120000.dump',
      'members.sql',
    ];
    expect(selectOldDumps(names, 2).sort()).toEqual(['fitclub-20261101-120000.dump']);
    expect(selectOldDumps(names, 30)).toEqual([]);
  });
});

describe('runPostgresBackup', () => {
  it('writes one dump and deletes only an older dump file', async () => {
    const removed: string[] = [];
    const dumps: Array<{ args: string[]; env: NodeJS.ProcessEnv }> = [];
    const result = await runPostgresBackup({
      env: {
        DATABASE_URL: 'postgresql://club:Long-Random-Secret@127.0.0.1:5432/fitclub',
        BACKUP_DIR: '/var/backups/fitclub',
        FITCLUB_BACKUP_KEEP: '1',
      },
      now: new Date('2026-11-01T13:45:09Z'),
      mkdir: async () => undefined,
      readdir: async () => [
        'fitclub-20261001-000000.dump',
        'keep-me.txt',
        'fitclub-20261101-134509.dump',
      ],
      unlink: async (file) => {
        removed.push(file);
      },
      dump: async (invocation) => {
        dumps.push(invocation);
      },
    });

    const backupDir = path.join('/var/backups/fitclub');
    expect(result.file).toBe(path.join(backupDir, 'fitclub-20261101-134509.dump'));
    expect(dumps).toHaveLength(1);
    expect(dumps[0]?.args.join(' ')).not.toContain('Long-Random-Secret');
    expect(removed).toEqual([path.join(backupDir, 'fitclub-20261001-000000.dump')]);
  });

  it('requires an absolute backup folder and never invents one', async () => {
    await expect(
      runPostgresBackup({
        env: {
          DATABASE_URL: 'postgresql://club:Long-Random-Secret@127.0.0.1:5432/fitclub',
        },
        now: new Date('2026-11-01T13:45:09Z'),
        mkdir: async () => undefined,
        readdir: async () => [],
        unlink: async () => undefined,
        dump: async () => undefined,
      }),
    ).rejects.toThrow(/BACKUP_DIR/);

    await expect(
      runPostgresBackup({
        env: {
          DATABASE_URL: 'postgresql://club:Long-Random-Secret@127.0.0.1:5432/fitclub',
          BACKUP_DIR: 'backups',
        },
        now: new Date('2026-11-01T13:45:09Z'),
        mkdir: async () => undefined,
        readdir: async () => [],
        unlink: async () => undefined,
        dump: async () => undefined,
      }),
    ).rejects.toThrow(/absolute/);
  });
});
