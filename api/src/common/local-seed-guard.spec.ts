import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { localSeedWipeRefusal } from './local-seed-guard.js';

const localUrl = 'postgresql://fitsteel:fitsteel_dev@localhost:5432/fitsteel?schema=public';

describe('localSeedWipeRefusal', () => {
  it('refuses to wipe when NODE_ENV=production even if DEMO_MODE is on', () => {
    const message = localSeedWipeRefusal({
      NODE_ENV: 'production',
      DEMO_MODE: 'true',
      DATABASE_URL: localUrl,
    });
    expect(message).toMatch(/local-only|wipe/i);
    expect(message).toMatch(/DEMO_MODE/);
    expect(message).toMatch(/bootstrap:server/);
  });

  it('refuses to wipe on production when demo mode is off', () => {
    expect(
      localSeedWipeRefusal({
        NODE_ENV: 'production',
        DEMO_MODE: 'false',
        DATABASE_URL: localUrl,
      }),
    ).toBeTruthy();
  });

  it('allows the local wipe seed only against localhost in development', () => {
    expect(
      localSeedWipeRefusal({
        NODE_ENV: 'development',
        DEMO_MODE: 'true',
        DATABASE_URL: localUrl,
      }),
    ).toBeNull();
    expect(
      localSeedWipeRefusal({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://fitsteel:fitsteel_dev@127.0.0.1:5432/fitsteel',
      }),
    ).toBeNull();
  });

  it('refuses to wipe a remote database from a development machine', () => {
    expect(
      localSeedWipeRefusal({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://club:secret@db.example.com:5432/fitclub',
      }),
    ).toMatch(/localhost/);
  });

  it('refuses when the database address is missing', () => {
    expect(localSeedWipeRefusal({ NODE_ENV: 'development' })).toMatch(/localhost|DATABASE_URL/);
  });
});

describe('prisma seed lock', () => {
  it('checks the wipe guard before any deleteMany', () => {
    const src = readFileSync(new URL('../../prisma/seed.ts', import.meta.url), 'utf8');
    const guardAt = src.indexOf('localSeedWipeRefusal');
    const wipeAt = src.indexOf('deleteMany');
    expect(guardAt).toBeGreaterThan(-1);
    expect(wipeAt).toBeGreaterThan(guardAt);
    expect(src).not.toMatch(/unless DEMO_MODE/);
  });
});
