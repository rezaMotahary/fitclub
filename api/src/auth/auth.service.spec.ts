import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
    },
  };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let service: AuthService;

  beforeEach(() => {
    prisma = mockPrisma();
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'OTP_DEV_CODE') return '123456';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'SESSION_TTL_DAYS') return '7';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new AuthService(prisma as never, config);
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
    prisma.otpChallenge.create.mockResolvedValue({});

    const result = await service.requestMemberOtp('09121234567');
    expect(result.ok).toBe(true);
    expect(prisma.otpChallenge.create).toHaveBeenCalled();
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
