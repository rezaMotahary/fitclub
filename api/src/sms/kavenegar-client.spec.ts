import { describe, expect, it, vi } from 'vitest';
import { KavenegarError, sendViaKavenegar } from './kavenegar-client.js';

const KEY = 'abc+def=';
const SENDER = '0018018949161';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('sendViaKavenegar', () => {
  it('sends an English mobile through the account line', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const params = new URLSearchParams(String(init?.body ?? ''));
      expect(params.get('receptor')).toBe('09121234567');
      expect(params.get('sender')).toBe(SENDER);
      expect(params.get('message')).toBe('کد ورود فیت‌کلاب: 123456');
      expect(init?.method).toBe('POST');
      return jsonResponse({
        return: { status: 200, message: 'تایید شد' },
        entries: [{ messageid: 42, status: 1, statustext: 'در صف ارسال' }],
      });
    });

    const result = await sendViaKavenegar(
      {
        apiKey: KEY,
        sender: SENDER,
        receptor: '09121234567',
        message: 'کد ورود فیت‌کلاب: 123456',
      },
      fetchImpl as unknown as typeof fetch,
    );

    expect(result.messageId).toBe(42);
    expect(String(fetchImpl.mock.calls[0]?.[0])).not.toContain(KEY);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(encodeURIComponent(KEY));
  });

  it('accepts a Persian mobile and sends the English form', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const params = new URLSearchParams(String(init?.body ?? ''));
      expect(params.get('receptor')).toBe('09121234567');
      return jsonResponse({
        return: { status: 200, message: 'تایید شد' },
        entries: [{ messageid: 7, status: 5, statustext: 'ارسال به مخابرات' }],
      });
    });

    await sendViaKavenegar(
      {
        apiKey: KEY,
        sender: SENDER,
        receptor: '۰۹۱۲۱۲۳۴۵۶۷',
        message: 'تست',
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('rejects an invalid mobile before calling the provider', async () => {
    const fetchImpl = vi.fn();
    await expect(
      sendViaKavenegar(
        {
          apiKey: KEY,
          sender: SENDER,
          receptor: '۰۸۱۲۱۲۳۴۵۶۷',
          message: 'تست',
        },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toBeInstanceOf(KavenegarError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('hides the api key when the provider rejects the send', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        return: { status: 418, message: 'اعتبار حساب کافی نیست' },
      }),
    );

    await expect(
      sendViaKavenegar(
        {
          apiKey: KEY,
          sender: SENDER,
          receptor: '09121234567',
          message: 'تست',
        },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ status: 418, message: 'اعتبار حساب کافی نیست' });
  });

  it('does not leak the api key from a network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(`connect failed for key ${KEY}`);
    });

    await expect(
      sendViaKavenegar(
        {
          apiKey: KEY,
          sender: SENDER,
          receptor: '09121234567',
          message: 'تست',
        },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/\[redacted\]/);
  });
});
