import { config } from 'dotenv';
import { resolve } from 'node:path';
import { sendViaKavenegar } from '../src/sms/kavenegar-client.js';

config({ path: resolve(import.meta.dirname, '../.env') });

const phone = process.argv[2] ?? '';
const message =
  process.argv[3] ?? 'این یک پیامک آزمایشی از فیت‌کلاب است.';

const apiKey = process.env.KAVENEGAR_API_KEY?.trim() ?? '';
const sender = process.env.KAVENEGAR_SENDER?.trim() ?? '';

if (!apiKey || !sender || !phone) {
  console.error('شماره موبایل، یا تنظیمات پیامک، کامل نیست.');
  process.exit(1);
}

const result = await sendViaKavenegar({
  apiKey,
  sender,
  receptor: phone,
  message,
});

console.log(
  JSON.stringify({
    queued: true,
    messageId: result.messageId,
    status: result.status,
    statusText: result.statusText,
  }),
);
