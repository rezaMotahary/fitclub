import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KavenegarError, sendViaKavenegar } from './kavenegar-client.js';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey() && this.sender());
  }

  async sendText(receptor: string, message: string): Promise<void> {
    const apiKey = this.apiKey();
    const sender = this.sender();
    if (!apiKey || !sender) {
      throw new KavenegarError(401, 'تنظیمات پیامک کامل نیست');
    }

    const result = await sendViaKavenegar({
      apiKey,
      sender,
      receptor,
      message,
    });
    this.logger.log(
      `SMS queued messageId=${result.messageId} status=${result.status}`,
    );
  }

  private apiKey(): string {
    return this.config.get<string>('KAVENEGAR_API_KEY')?.trim() ?? '';
  }

  private sender(): string {
    return this.config.get<string>('KAVENEGAR_SENDER')?.trim() ?? '';
  }
}
