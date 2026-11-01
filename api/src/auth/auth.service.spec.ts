import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { hashSecret, hashSessionToken } from './auth-crypto.js';

function mockPrisma() {
  return {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    otpChallenge: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function mockSms(configured = false) {
  return {
    isConfigured: vi.fn(() => configured),
    sendText: vi.fn(async () => undefined),
  };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let sms: ReturnType<typeof mockSms>;
  let service: AuthService;

  beforeEach(() => {
    prisma = mockPrisma();
    sms = mockSms(false);
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'OTP_DEV_CODE') return '123456';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'SESSION_TTL_DAYS') return '7';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new AuthService(prisma as never, config, sms as never);
  });

  it('rejects staff login with bad password', async () => {
    const passwordHash = await hashSecret('FitClubAdmin1!');
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      role: Role.ADMIN,
      fullName: 'Admin',
      phone: null,
      email: 'admin@fitclub.local',
      isActive: true,
      passwordHash,
      member: null,
    });

    await expect(
      service.loginStaff('admin@fitclub.local', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in staff with correct password and creates session', async () => {
    const passwordHash = await hashSecret('FitClubAdmin1!');
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      role: Role.ADMIN,
      fullName: 'کاوه احمدی',
      phone: '09120000001',
      email: 'admin@fitclub.local',
      isActive: true,
      passwordHash,
      member: null,
    });
    prisma.session.create.mockResolvedValue({});

    const result = await service.loginStaff(
      'admin@fitclub.local',
      'FitClubAdmin1!',
    );
    expect(result.user.role).toBe(Role.ADMIN);
    expect(result.token).toBeTruthy();
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        tokenHash: hashSessionToken(result.token),
      }),
    });
  });

  it('blocks OTP request for archived member', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'm1',
      role: Role.MEMBER,
      isActive: false,
      member: { id: 'mem1', membershipCode: 'FS-1099', isArchived: true },
    });

    await expect(
      service.requestMemberOtp('09129990000'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('issues OTP for active member (dev code)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'm1',
      role: Role.MEMBER,
      isActive: true,
      member: { id: 'mem1', membershipCode: 'FS-1042', isArchived: false },
    });
    prisma.otpChallenge.create.mockResolvedValue({ id: 'otp1' });

    const result = await service.requestMemberOtp('09121234567');
    expect(result.ok).toBe(true);
    expect(result.sentBySms).toBe(false);
    expect(prisma.otpChallenge.create).toHaveBeenCalled();
    expect(sms.sendText).not.toHaveBeenCalled();
  });

  it('texts a real code for Persian and English mobiles when SMS is on', async () => {
    sms = mockSms(true);
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'OTP_DEV_CODE') return '123456';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new AuthService(prisma as never, config, sms as never);
    prisma.user.findUnique.mockResolvedValue({
      id: 'm1',
      role: Role.MEMBER,
      isActive: true,
      member: { id: 'mem1', membershipCode: 'FS-1042', isArchived: false },
    });
    prisma.otpChallenge.create.mockResolvedValue({ id: 'otp-fa' });

    const result = await service.requestMemberOtp('۰۹۱۲۱۲۳۴۵۶۷');
    expect(result.sentBySms).toBe(true);
    expect(sms.sendText).toHaveBeenCalledOnce();
    const [phone, message] = sms.sendText.mock.calls[0] ?? [];
    expect(phone).toBe('09121234567');
    expect(String(message)).toMatch(/کد ورود فیت‌کلاب: \d{6}/);
  });

  it('drops the code when the text message fails', async () => {
    sms = mockSms(true);
    sms.sendText.mockRejectedValue(new Error('provider down'));
    const config = {
      get: vi.fn(() => undefined),
    } as unknown as ConfigService;
    service = new AuthService(prisma as never, config, sms as never);
    prisma.user.findUnique.mockResolvedValue({
      id: 'm1',
      role: Role.MEMBER,
      isActive: true,
      member: { id: 'mem1', membershipCode: 'FS-1042', isArchived: false },
    });
    prisma.otpChallenge.create.mockResolvedValue({ id: 'otp-fail' });
    prisma.otpChallenge.delete.mockResolvedValue({});

    await expect(service.requestMemberOtp('09121234567')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.otpChallenge.delete).toHaveBeenCalledWith({
      where: { id: 'otp-fail' },
    });
  });

  it('verifies OTP and creates session', async () => {
    const codeHash = await hashSecret('123456');
    prisma.user.findUnique.mockResolvedValue({
      id: 'm1',
      role: Role.MEMBER,
      fullName: 'سارا کریمی',
      phone: '09121234567',
      email: null,
      isActive: true,
      member: { id: 'mem1', membershipCode: 'FS-1042', isArchived: false },
    });
    prisma.otpChallenge.findFirst.mockResolvedValue({
      id: 'otp1',
      codeHash,
      attempts: 0,
    });
    prisma.otpChallenge.update.mockResolvedValue({});
    prisma.session.create.mockResolvedValue({});

    const result = await service.verifyMemberOtp('09121234567', '123456');
    expect(result.user.membershipCode).toBe('FS-1042');
    expect(result.token).toBeTruthy();
  });
});
