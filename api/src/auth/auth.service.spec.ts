import {
  ForbiddenException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { hashSecret, hashSessionToken, verifySecret } from './auth-crypto.js';

function mockPrisma() {
  return {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
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
      findMany: vi.fn(async () => [] as { createdAt: Date }[]),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
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
      get: vi.fn((_key: string) => undefined),
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

  describe('security hardening', () => {
    const activeMember = {
      id: 'm1',
      role: Role.MEMBER,
      fullName: 'سارا کریمی',
      phone: '09121234567',
      email: null,
      isActive: true,
      member: { id: 'mem1', membershipCode: 'FS-1042', isArchived: false },
    };

    function productionService(smsOn: boolean) {
      sms = mockSms(smsOn);
      const config = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'OTP_DEV_CODE') return '123456';
          return undefined;
        }),
      } as unknown as ConfigService;
      return new AuthService(prisma as never, config, sms as never);
    }

    it('never issues the fixed code on a live server, even if OTP_DEV_CODE is set', async () => {
      const live = productionService(false);
      prisma.user.findUnique.mockResolvedValue(activeMember);

      await expect(live.requestMemberOtp('09121234567')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(live.requestMemberOtp('۰۹۱۲۱۲۳۴۵۶۷')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(prisma.otpChallenge.create).not.toHaveBeenCalled();
    });

    it('texts a random code (not the fixed one) on a live server with SMS on', async () => {
      const live = productionService(true);
      prisma.user.findUnique.mockResolvedValue(activeMember);
      prisma.otpChallenge.create.mockResolvedValue({ id: 'otp-live' });

      await live.requestMemberOtp('09121234567');
      const [, message] = sms.sendText.mock.calls[0] ?? [];
      const sent = /(\d{6})/.exec(String(message))?.[1];
      expect(sent).toMatch(/^\d{6}$/);
      const { codeHash } = prisma.otpChallenge.create.mock.calls[0][0].data;
      expect(await verifySecret(sent ?? '', codeHash)).toBe(true);
    });

    it('asks to wait when a code was just sent to the same phone (Persian and English digits)', async () => {
      prisma.user.findUnique.mockResolvedValue(activeMember);
      prisma.otpChallenge.findMany.mockResolvedValue([
        { createdAt: new Date(Date.now() - 5_000) },
      ]);

      for (const phone of ['09121234567', '۰۹۱۲۱۲۳۴۵۶۷']) {
        await expect(service.requestMemberOtp(phone)).rejects.toMatchObject({
          status: HttpStatus.TOO_MANY_REQUESTS,
        });
      }
      expect(prisma.otpChallenge.create).not.toHaveBeenCalled();
    });

    it('caps how many codes one phone can request per hour', async () => {
      prisma.user.findUnique.mockResolvedValue(activeMember);
      const old = new Date(Date.now() - 10 * 60_000);
      prisma.otpChallenge.findMany.mockResolvedValue(
        Array.from({ length: 30 }, () => ({ createdAt: old })),
      );

      await expect(service.requestMemberOtp('09121234567')).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('rejects a guess once the attempt budget is used up, even with the right code', async () => {
      prisma.user.findUnique.mockResolvedValue(activeMember);
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'otp1',
        codeHash: await hashSecret('123456'),
        attempts: 5,
      });
      prisma.otpChallenge.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.verifyMemberOtp('09121234567', '۱۲۳۴۵۶'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('rejects a code that a parallel request already used', async () => {
      prisma.user.findUnique.mockResolvedValue(activeMember);
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'otp1',
        codeHash: await hashSecret('123456'),
        attempts: 0,
      });
      prisma.otpChallenge.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await expect(
        service.verifyMemberOtp('09121234567', '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('still hashes when the staff account does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.loginStaff('nobody@fitclub.local', 'whatever-pass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lists staff accounts that still use a sample password', async () => {
      prisma.user.findMany.mockResolvedValue([
        { email: 'admin@fitclub.local', phone: null, passwordHash: await hashSecret('FitClubAdmin1!') },
        { email: 'real@club.ir', phone: null, passwordHash: await hashSecret('Strong-pass-2026') },
      ]);

      await expect(service.findStaffUsingSamplePasswords()).resolves.toEqual([
        'admin@fitclub.local',
      ]);
    });
  });
});
