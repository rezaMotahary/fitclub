import { describe, expect, it } from 'vitest';
import { productionConfigProblems } from './production-config.js';

const safeLive = {
  NODE_ENV: 'production',
  WEB_ORIGIN: 'https://fitclub.example',
  DATABASE_URL: 'postgresql://club:Long-Random-Secret@db:5432/fitclub',
};

describe('productionConfigProblems', () => {
  it('ignores local development settings', () => {
    expect(
      productionConfigProblems({ NODE_ENV: 'development', OTP_DEV_CODE: '123456' }),
    ).toEqual([]);
  });

  it('passes a safe live configuration', () => {
    expect(productionConfigProblems(safeLive)).toEqual([]);
  });

  it('blocks the fixed member login code on a live server', () => {
    const problems = productionConfigProblems({ ...safeLive, OTP_DEV_CODE: '123456' });
    expect(problems.join(' ')).toMatch(/OTP_DEV_CODE/);
  });

  it('allows the fixed member code on a demo server, but keeps the other checks', () => {
    expect(
      productionConfigProblems({ ...safeLive, OTP_DEV_CODE: '123456', DEMO_MODE: 'true' }),
    ).toEqual([]);
    expect(
      productionConfigProblems({
        ...safeLive,
        OTP_DEV_CODE: '123456',
        DEMO_MODE: 'true',
        WEB_ORIGIN: 'http://demo.example',
      }).join(' '),
    ).toMatch(/WEB_ORIGIN/);
  });

  it('requires an https site address', () => {
    expect(
      productionConfigProblems({ ...safeLive, WEB_ORIGIN: 'http://fitclub.example' }).join(' '),
    ).toMatch(/WEB_ORIGIN/);
    expect(
      productionConfigProblems({ ...safeLive, WEB_ORIGIN: undefined }).join(' '),
    ).toMatch(/WEB_ORIGIN/);
  });

  it('blocks the local sample database password', () => {
    expect(
      productionConfigProblems({
        ...safeLive,
        DATABASE_URL: 'postgresql://fitsteel:fitsteel_dev@localhost:5432/fitsteel',
      }).join(' '),
    ).toMatch(/sample database password/);
  });
});
