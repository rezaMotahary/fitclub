import { isValidIranMobile, normalizeIranMobile } from '../common/iran-mobile.js';

const SEND_URL = 'https://api.kavenegar.com/v1';
const REQUEST_TIMEOUT_MS = 20_000;

export class KavenegarError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'KavenegarError';
    this.status = status;
  }
}

export type KavenegarSendResult = {
  messageId: number;
  status: number;
  statusText: string;
};

type SendEntry = {
  messageid?: number;
  status?: number;
  statustext?: string;
};

type AccountEntry = {
  remaincredit?: number;
};

type KavenegarEnvelope = {
  return?: { status?: number; message?: string };
  entries?: SendEntry[] | AccountEntry;
};

function redact(text: string, apiKey: string): string {
  if (!apiKey) return text;
  return text.split(apiKey).join('[redacted]').split(encodeURIComponent(apiKey)).join('[redacted]');
}

async function kavenegarGet(
  apiKey: string,
  methodPath: string,
  fetchImpl: typeof fetch,
): Promise<KavenegarEnvelope> {
  const url = `${SEND_URL}/${encodeURIComponent(apiKey)}/${methodPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await response.text();
    let body: KavenegarEnvelope = {};
    if (text) {
      try {
        body = JSON.parse(text) as KavenegarEnvelope;
      } catch {
        throw new KavenegarError(
          response.status,
          'پاسخ سرویس پیامک قابل خواندن نبود',
        );
      }
    }
    const status = body.return?.status;
    if (!response.ok || status !== 200) {
      throw new KavenegarError(
        status ?? response.status,
        body.return?.message || 'سرویس پیامک درخواست را نپذیرفت',
      );
    }
    return body;
  } catch (error) {
    if (error instanceof KavenegarError) throw error;
    const raw = error instanceof Error ? error.message : 'خطای ناشناخته';
    throw new KavenegarError(0, redact(raw, apiKey));
  } finally {
    clearTimeout(timer);
  }
}

export async function sendViaKavenegar(
  input: {
    apiKey: string;
    sender: string;
    receptor: string;
    message: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<KavenegarSendResult> {
  const apiKey = input.apiKey.trim();
  const sender = input.sender.trim();
  const receptor = normalizeIranMobile(input.receptor);
  const message = input.message.trim();

  if (!apiKey || !sender) {
    throw new KavenegarError(401, 'تنظیمات پیامک کامل نیست');
  }
  if (!isValidIranMobile(receptor)) {
    throw new KavenegarError(411, 'شماره موبایل گیرنده معتبر نیست');
  }
  if (!message || message.length > 1800) {
    throw new KavenegarError(413, 'متن پیامک خالی است یا طولانی‌تر از حد مجاز است');
  }

  const params = new URLSearchParams({
    receptor,
    sender,
    message,
  });
  const url = `${SEND_URL}/${encodeURIComponent(apiKey)}/sms/send.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    });
    const text = await response.text();
    let body: KavenegarEnvelope = {};
    if (text) {
      try {
        body = JSON.parse(text) as KavenegarEnvelope;
      } catch {
        throw new KavenegarError(response.status, 'پاسخ سرویس پیامک قابل خواندن نبود');
      }
    }
    const status = body.return?.status;
    const entry = Array.isArray(body.entries) ? body.entries[0] : undefined;
    if (!response.ok || status !== 200 || !entry?.messageid) {
      throw new KavenegarError(
        status ?? response.status,
        body.return?.message || 'ارسال پیامک پذیرفته نشد',
      );
    }
    return {
      messageId: entry.messageid,
      status: entry.status ?? status,
      statusText: entry.statustext ?? '',
    };
  } catch (error) {
    if (error instanceof KavenegarError) throw error;
    const raw = error instanceof Error ? error.message : 'خطای ناشناخته';
    throw new KavenegarError(0, redact(raw, apiKey));
  } finally {
    clearTimeout(timer);
  }
}

/** Account check only — does not send a message. */
export async function fetchKavenegarCredit(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const body = await kavenegarGet(apiKey.trim(), 'account/info.json', fetchImpl);
  const credit = Array.isArray(body.entries)
    ? undefined
    : body.entries?.remaincredit;
  if (typeof credit !== 'number') {
    throw new KavenegarError(0, 'اعتبار حساب پیامک خوانده نشد');
  }
  return credit;
}
