import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, type User } from '@prisma/client';
import {
  isValidIranMobile,
  normalizeIranMobile,
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
      throw new UnauthorizedException('شناسه یا رمز نادرست است');
    }

    const ok = await verifySecret(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('شناسه یا رمز نادرست است');
    }

    const { token, expiresAt } = await this.createSession(user.id);
    return {
      user: this.toPublicUser(this.toAuthUser(user)),
      token,
      expiresAt,
    };
  }

  private resolveDevOtpCode(): string | null {
    const fromEnv = this.config.get<string>('OTP_DEV_CODE');
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    if (nodeEnv !== 'production') return DEFAULT_OTP_DEV_CODE;
    return null;
  }

  async requestMemberOtp(rawPhone: string): Promise<{ ok: true; expiresInSec: number }> {
    const phone = normalizeIranMobile(rawPhone);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { member: true },
    });

    if (!user || user.role !== Role.MEMBER || !user.member) {
      // Do not reveal whether the phone exists.
      return { ok: true, expiresInSec: OTP_TTL_MINUTES * 60 };
    }

    if (!user.isActive || user.member.isArchived) {
      throw new ForbiddenException(
        'این عضویت آرشیو شده و ورود به پنل مجاز نیست',
      );
    }

    const devCode = this.resolveDevOtpCode();
    const code = devCode ?? generateOtpCode();
    const codeHash = await hashSecret(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpChallenge.create({
      data: {
        phone,
        codeHash,
        expiresAt,
      },
    });

    // No real SMS provider in MVP skeleton.
    if (devCode) {
      this.logger.log(`[OTP:dev] phone=${phone} code=${code}`);
    } else {
      this.logger.log(`[OTP] code issued for phone=${phone} (SMS provider not wired)`);
    }

    return { ok: true, expiresInSec: OTP_TTL_MINUTES * 60 };
  }

  async verifyMemberOtp(
    rawPhone: string,
    code: string,
  ): Promise<{ user: PublicAuthUser; token: string; expiresAt: Date }> {
    const phone = normalizeIranMobile(rawPhone);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { member: true },
    });

    if (!user || user.role !== Role.MEMBER || !user.member) {
      throw new UnauthorizedException('کد تأیید نادرست است');
    }

    if (!user.isActive || user.member.isArchived) {
      throw new ForbiddenException(
        'این عضویت آرشیو شده و ورود به پنل مجاز نیست',
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
      throw new UnauthorizedException('کد تأیید منقضی یا نامعتبر است');
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('تعداد تلاش بیش از حد مجاز است');
    }

    const ok = await verifySecret(code, challenge.codeHash);
    if (!ok) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('کد تأیید نادرست است');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    const { token, expiresAt } = await this.createSession(user.id);
    return {
      user: this.toPublicUser(this.toAuthUser(user)),
      token,
      expiresAt,
    };
  }
}
