import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { SmsService } from './sms.service.js';

function serviceWith(values: Record<string, string | undefined>): SmsService {
  const config = {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  return new SmsService(config);
}

describe('SmsService.isConfigured', () => {
  const account = {
    KAVENEGAR_API_KEY: 'test-key',
    KAVENEGAR_SENDER: '10004346',
  };

  it('stays off while the switch is false, even if the account is saved', () => {
    const sms = serviceWith({ ...account, KAVENEGAR_ENABLED: 'false' });
    expect(sms.isConfigured()).toBe(false);
  });

  it('turns on only when the switch is true and the account is complete', () => {
    expect(serviceWith({ ...account, KAVENEGAR_ENABLED: 'true' }).isConfigured()).toBe(true);
    expect(serviceWith({ ...account, KAVENEGAR_ENABLED: 'yes' }).isConfigured()).toBe(true);
    expect(serviceWith({ KAVENEGAR_ENABLED: 'true', KAVENEGAR_SENDER: '10004346' }).isConfigured()).toBe(false);
  });
});
