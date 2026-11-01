import { describe, expect, it } from 'vitest';
import { KeyedMutex } from './keyed-mutex.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('KeyedMutex', () => {
  it('runs work for the same key one after another', async () => {
    const mutex = new KeyedMutex();
    const events: string[] = [];
    const job = (name: string) =>
      mutex.run('member-1', async () => {
        events.push(`${name}:start`);
        await tick();
        events.push(`${name}:end`);
        return name;
      });

    const results = await Promise.all([job('a'), job('b'), job('c')]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(events).toEqual([
      'a:start',
      'a:end',
      'b:start',
      'b:end',
      'c:start',
      'c:end',
    ]);
    expect(mutex.pendingKeys).toBe(0);
  });

  it('lets different keys run at the same time', async () => {
    const mutex = new KeyedMutex();
    let running = 0;
    let peak = 0;
    const job = (key: string) =>
      mutex.run(key, async () => {
        running += 1;
        peak = Math.max(peak, running);
        await tick();
        running -= 1;
      });

    await Promise.all([job('x'), job('y')]);
    expect(peak).toBe(2);
  });

  it('keeps going after a failed job', async () => {
    const mutex = new KeyedMutex();
    const failed = mutex.run('k', async () => {
      throw new Error('boom');
    });
    const next = mutex.run('k', async () => 'ok');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
    expect(mutex.pendingKeys).toBe(0);
  });
});
