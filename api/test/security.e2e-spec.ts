import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import {
  SAMPLE_OTP_DEV_CODE,
  SAMPLE_STAFF_PASSWORDS,
} from '../prisma/sample-credentials.js';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toPersianDigits = (value: string | number) =>
  String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);

function randomMobile(): string {
  const tail = String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0');
  return `0935${tail}`;
}

describe('Security hardening (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let secretaryCookie: string | string[];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.OTP_DEV_CODE = SAMPLE_OTP_DEV_CODE;
    prisma = new PrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({
        identifier: 'secretary@fitclub.local',
        password: SAMPLE_STAFF_PASSWORDS.secretary,
      })
      .expect(200);
    secretaryCookie = login.headers['set-cookie'];
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  async function createMember(phone: string) {
    const res = await request(app.getHttpServer())
      .post('/api/members')
      .set('Cookie', secretaryCookie)
      .send({ fullName: 'عضو تست امنیت', phone, sessionGender: 'MEN' })
      .expect(201);
    const member = await prisma.member.findUniqueOrThrow({
      where: { id: res.body.id },
    });
    createdUserIds.push(member.userId);
    return member;
  }

  it('records only one of two simultaneous full settlements (Persian and English amounts)', async () => {
    const member = await createMember(randomMobile());
    const plan = await prisma.plan.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const firstPayment = Math.ceil(plan.priceToman / 2);

    await request(app.getHttpServer())
      .post('/api/subscriptions/sell')
      .set('Cookie', secretaryCookie)
      .send({ memberId: member.id, planId: plan.id, amountPaidToman: firstPayment })
      .expect(201);

    const debt = plan.priceToman - firstPayment;
    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/payments')
        .set('Cookie', secretaryCookie)
        .send({ memberId: member.id, amountToman: debt, method: 'CASH' }),
      request(app.getHttpServer())
        .post('/api/payments')
        .set('Cookie', secretaryCookie)
        .send({ memberId: member.id, amountToman: toPersianDigits(debt), method: 'CASH' }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses[0]).toBe(201);
    expect(statuses[1]).toBeGreaterThanOrEqual(400);

    const sub = await prisma.subscription.findFirstOrThrow({
      where: { memberId: member.id },
    });
    expect(sub.amountPaidToman).toBe(plan.priceToman);
    const payments = await prisma.payment.findMany({ where: { memberId: member.id } });
    expect(payments.reduce((sum, p) => sum + p.amountToman, 0)).toBe(plan.priceToman);
  });

  it('rejects absurd amounts with a clear 400 instead of a server error', async () => {
    const member = await createMember(randomMobile());
    for (const amountToman of [99_999_999_999, '۹۹۹۹۹۹۹۹۹۹۹']) {
      await request(app.getHttpServer())
        .post('/api/payments')
        .set('Cookie', secretaryCookie)
        .send({ memberId: member.id, amountToman, method: 'CASH' })
        .expect(400);
    }
  });

  it('makes a member wait before asking for another login code (Persian and English digits)', async () => {
    const phone = randomMobile();
    await createMember(phone);
    const previous = process.env.OTP_RESEND_COOLDOWN_SEC;
    process.env.OTP_RESEND_COOLDOWN_SEC = '60';
    try {
      await request(app.getHttpServer())
        .post('/api/auth/member/otp/request')
        .send({ phone })
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/auth/member/otp/request')
        .send({ phone: toPersianDigits(phone) })
        .expect(429);
    } finally {
      process.env.OTP_RESEND_COOLDOWN_SEC = previous;
    }
  });

  it('blocks repeated staff login attempts from the same visitor', async () => {
    const previous = process.env.RATE_LIMIT_STAFF_LOGIN_PER_MIN;
    process.env.RATE_LIMIT_STAFF_LOGIN_PER_MIN = '3';
    try {
      const attempt = () =>
        request(app.getHttpServer())
          .post('/api/auth/staff/login')
          .send({ identifier: 'admin@fitclub.local', password: 'wrong-password' });

      for (let i = 0; i < 2; i += 1) {
        expect((await attempt()).status).toBe(401);
      }
      const statuses: number[] = [];
      for (let i = 0; i < 3; i += 1) {
        statuses.push((await attempt()).status);
      }
      expect(statuses).toContain(429);

      const blocked = await request(app.getHttpServer())
        .post('/api/auth/staff/login')
        .send({
          identifier: 'admin@fitclub.local',
          password: SAMPLE_STAFF_PASSWORDS.admin,
        });
      expect(blocked.status).toBe(429);
    } finally {
      process.env.RATE_LIMIT_STAFF_LOGIN_PER_MIN = previous;
    }
  });
});
