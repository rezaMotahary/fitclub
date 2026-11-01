import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, type User } from '@prisma/client';
import {
  isValidIranMobile,
  normalizeIranMobile,
  normalizeOtpCode,
} from '../common/iran-mobile.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createSessionToken,
  generateOtpCode,
  hashSecret,
  hashSessionToken,
  verifySecret,
} from './auth-crypto.js';
import {
  DEFAULT_OTP_DEV_CODE,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MINUTES,
  SESSION_TTL_DAYS,
} from './auth.constants.js';
import type { AuthUser, PublicAuthUser } from './auth.types.js';
import { SAMPLE_STAFF_PASSWORD_LIST } from './sample-passwords.js';
import { SmsService } from '../sms/sms.service.js';
import { rateLimits } from '../common/rate-limits.js';
import { isDemoMode } from '../common/demo-mode.js';

type UserWithMember = User & {
  member: {
    id: string;
    membershipCode: string;
    isArchived: boolean;
  } | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private timingDummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  toPublicUser(user: AuthUser): PublicAuthUser {
    return {
      id: user.id,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      memberId: user.memberId,
      membershipCode: user.membershipCode,
    };
  }

  private toAuthUser(user: UserWithMember): AuthUser {
    return {
      id: user.id,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      memberId: user.member?.id ?? null,
      membershipCode: user.member?.membershipCode ?? null,
      isArchived: user.member?.isArchived ?? false,
    };
  }

  private sessionExpiresAt(from = new Date()): Date {
    const days = Number(
      this.config.get('SESSION_TTL_DAYS') ?? SESSION_TTL_DAYS,
    );
    return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  }

  async createSession(userId: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = this.sessionExpiresAt();

    await this.prisma.session.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async destroySession(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashSessionToken(rawToken);
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }

  async resolveSessionUser(
    rawToken: string | undefined,
  ): Promise<AuthUser | null> {
    if (!rawToken) return null;

    const tokenHash = hashSessionToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { member: true } },
      },
    });

    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    const authUser = this.toAuthUser(session.user);
    if (!session.user.isActive || authUser.isArchived) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return authUser;
  }

  async loginStaff(
    identifier: string,
    password: string,
  ): Promise<{ user: PublicAuthUser; token: string; expiresAt: Date }> {
    const trimmed = identifier.trim();
    const phoneCandidate = normalizeIranMobile(trimmed);
    const phone = isValidIranMobile(phoneCandidate) ? phoneCandidate : trimmed;
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: trimmed }, { phone }],
        role: { in: [Role.SECRETARY, Role.ADMIN] },
      },
      include: { member: true },
    });

    if (!user?.passwordHash || !user.isActive) {
      // Same hashing cost as a real check, so response time does not reveal which accounts exist.
      this.timingDummyHash ??= hashSecret('fitclub-timing-equalizer');
      await verifySecret(password, await this.timingDummyHash);
      throw new UnauthorizedException('ایمیل/موبایل یا رمز عبور اشتباه است');
    }

    const ok = await verifySecret(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('ایمیل/موبایل یا رمز عبور اشتباه است');
    }

    const { token, expiresAt } = await this.createSession(user.id);
    return {
      user: this.toPublicUser(this.toAuthUser(user)),
      token,
      expiresAt,
    };
  }

  private isProduction(): boolean {
    return (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';
  }

  /** Fixed login code for local testing only; a live server never accepts it. */
  private isDemo(): boolean {
    return isDemoMode({ DEMO_MODE: this.config.get<string>('DEMO_MODE') });
  }

  private resolveDevOtpCode(): string | null {
    if (this.isProduction() && !this.isDemo()) return null;
    const fromEnv = this.config.get<string>('OTP_DEV_CODE');
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();
    return DEFAULT_OTP_DEV_CODE;
  }

  /** Staff accounts that still open with a published sample password. */
  async findStaffUsingSamplePasswords(): Promise<string[]> {
    const staff = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.SECRETARY, Role.ADMIN] },
        isActive: true,
        passwordHash: { not: null },
      },
      select: { email: true, phone: true, passwordHash: true },
    });

    const weak: string[] = [];
    for (const user of staff) {
      for (const sample of SAMPLE_STAFF_PASSWORD_LIST) {
        if (await verifySecret(sample, user.passwordHash ?? '')) {
          weak.push(user.email ?? user.phone ?? 'unknown');
          break;
        }
      }
    }
    return weak;
  }

  private async assertOtpRequestAllowed(phone: string): Promise<void> {
    const now = Date.now();
    const recent = await this.prisma.otpChallenge.findMany({
      where: { phone, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const cooldownMs = rateLimits.otpResendCooldownSec() * 1000;
    const latest = recent[0];
    if (latest && now - latest.createdAt.getTime() < cooldownMs) {
      throw new HttpException(
        'کد قبلی همین الان فرستاده شد. یک دقیقه صبر کنید و دوباره درخواست بدهید.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recent.length >= rateLimits.otpMaxPerPhonePerHour()) {
      throw new HttpException(
        'برای این شماره کد زیادی درخواست شده است. یک ساعت بعد دوباره تلاش کنید.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async requestMemberOtp(
    rawPhone: string,
  ): Promise<{ ok: true; expiresInSec: number; sentBySms: boolean }> {
    const phone = normalizeIranMobile(rawPhone);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { member: true },
    });

    if (!user || user.role !== Role.MEMBER || !user.member) {
      // Do not reveal whether the phone exists.
      return {
        ok: true,
        expiresInSec: OTP_TTL_MINUTES * 60,
        sentBySms: false,
      };
    }

    if (!user.isActive || user.member.isArchived) {
      throw new ForbiddenException(
        'پروندهٔ شما غیرفعال (آرشیو) است. برای فعال‌سازی با پذیرش باشگاه تماس بگیرید.',
      );
    }

    const sentBySms = !this.isDemo() && this.sms.isConfigured();
    const devCode = sentBySms ? null : this.resolveDevOtpCode();
    if (!sentBySms && !devCode) {
      this.logger.error('[OTP] member login requested but SMS is switched off');
      throw new ServiceUnavailableException(
        'ورود اعضا با پیامک فعلاً در دسترس نیست. لطفاً با پذیرش باشگاه تماس بگیرید.',
      );
    }

    await this.assertOtpRequestAllowed(phone);

    const code = devCode ?? generateOtpCode();
    const codeHash = await hashSecret(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        phone,
        codeHash,
        expiresAt,
      },
    });

    if (sentBySms) {
      try {
        await this.sms.sendText(
          phone,
          `کد ورود فیت‌کلاب: ${code}\nاین کد تا ${OTP_TTL_MINUTES} دقیقه معتبر است.`,
        );
      } catch (error) {
        await this.prisma.otpChallenge.delete({ where: { id: challenge.id } });
        const detail = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`[OTP] sms failed phone=${phone} detail=${detail}`);
        throw new ServiceUnavailableException(
          'ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید.',
        );
      }
      this.logger.log(`[OTP] sms queued phone=${phone}`);
    } else {
      this.logger.log(`[OTP:dev] phone=${phone} code=${code}`);
    }

    return { ok: true, expiresInSec: OTP_TTL_MINUTES * 60, sentBySms };
  }

  async verifyMemberOtp(
    rawPhone: string,
    rawCode: string,
  ): Promise<{ user: PublicAuthUser; token: string; expiresAt: Date }> {
    const phone = normalizeIranMobile(rawPhone);
    const code = normalizeOtpCode(rawCode);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { member: true },
    });

    if (!user || user.role !== Role.MEMBER || !user.member) {
      throw new UnauthorizedException('کد تأیید نادرست است');
    }

    if (!user.isActive || user.member.isArchived) {
      throw new ForbiddenException(
        'پروندهٔ شما غیرفعال (آرشیو) است. برای فعال‌سازی با پذیرش باشگاه تماس بگیرید.',
      );
    }

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException(
        'کد تأیید منقضی شده یا معتبر نیست. دوباره درخواست کد بدهید.',
      );
    }

    // Count the attempt before checking, atomically, so parallel guesses cannot exceed the limit.
    const counted = await this.prisma.otpChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        attempts: { lt: OTP_MAX_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw new UnauthorizedException(
        'تعداد تلاش‌های اشتباه زیاد بود. لطفاً دوباره درخواست کد بدهید.',
      );
    }

    const ok = await verifySecret(code, challenge.codeHash);
    if (!ok) {
      throw new UnauthorizedException('کد تأیید نادرست است');
    }

    const consumed = await this.prisma.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new UnauthorizedException(
        'کد تأیید منقضی شده یا معتبر نیست. دوباره درخواست کد بدهید.',
      );
    }

    const { token, expiresAt } = await this.createSession(user.id);
    return {
      user: this.toPublicUser(this.toAuthUser(user)),
      token,
      expiresAt,
    };
  }
}
