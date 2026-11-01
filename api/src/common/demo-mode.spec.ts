import { describe, expect, it } from 'vitest';
import { isDemoMode } from './demo-mode.js';

describe('isDemoMode', () => {
  it('is off unless explicitly switched on', () => {
    expect(isDemoMode({})).toBe(false);
    expect(isDemoMode({ DEMO_MODE: '' })).toBe(false);
    expect(isDemoMode({ DEMO_MODE: 'false' })).toBe(false);
  });

  it('accepts true / 1 / yes', () => {
    expect(isDemoMode({ DEMO_MODE: 'true' })).toBe(true);
    expect(isDemoMode({ DEMO_MODE: ' TRUE ' })).toBe(true);
    expect(isDemoMode({ DEMO_MODE: '1' })).toBe(true);
    expect(isDemoMode({ DEMO_MODE: 'yes' })).toBe(true);
  });
});
