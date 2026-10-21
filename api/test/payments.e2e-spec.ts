import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PaymentMethod, PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import {
  SAMPLE_MEMBER_PHONE,
  SAMPLE_OTP_DEV_CODE,
  SAMPLE_STAFF_PASSWORDS,
} from '../prisma/sample-credentials.js';

describe('Payments — reception manual (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let secretaryCookie: string | string[];
  let adminCookie: string | string[];

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

    const secretaryLogin = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({
        identifier: 'secretary@fitclub.local',
        password: SAMPLE_STAFF_PASSWORDS.secretary,
      })
      .expect(200);
    secretaryCookie = secretaryLogin.headers['set-cookie'];

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({
        identifier: 'admin@fitclub.local',
        password: SAMPLE_STAFF_PASSWORDS.admin,
      })
      .expect(200);
    adminCookie = adminLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  async function memberCookie(): Promise<string | string[]> {
    await request(app.getHttpServer())
      .post('/api/auth/member/otp/request')
      .send({ phone: SAMPLE_MEMBER_PHONE })
      .expect(200);
    const verify = await request(app.getHttpServer())
      .post('/api/auth/member/otp/verify')
      .send({ phone: SAMPLE_MEMBER_PHONE, code: SAMPLE_OTP_DEV_CODE })
      .expect(200);
    return verify.headers['set-cookie'] as string | string[];
  }

  async function debtorDay16() {
    const member = await prisma.member.findUniqueOrThrow({
      where: { membershipCode: 'FS-1046' },
      include: { subscriptions: { include: { plan: true } } },
    });
    const sub = member.subscriptions[0];
    expect(sub).toBeTruthy();
    const remaining = sub.priceToman - sub.amountPaidToman;
    expect(remaining).toBeGreaterThan(0);
    return { member, sub, remaining };
  }

  it('member cannot record payment; can list own history via /payments/me', async () => {
    const cookie = await memberCookie();
    const { member } = await debtorDay16();

    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', cookie)
      .send({
        memberId: member.id,
        amountToman: 10_000,
        method: PaymentMethod.CASH,
      })
      .expect(403);

    const mine = await request(app.getHttpServer())
      .get('/api/payments/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(Array.isArray(mine.body)).toBe(true);
    expect(mine.body.length).toBeGreaterThan(0);
    const sara = await prisma.member.findUniqueOrThrow({
      where: { membershipCode: 'FS-1042' },
    });
    expect(mine.body.every((p: { memberId: string }) => p.memberId === sara.id)).toBe(
      true,
    );
  });

  it('secretary lists payments with simple q filter (Persian phone digits)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/payments')
      .query({ q: '۰۹۱۲۱۲۳۴۵۷۱' })
      .set('Cookie', secretaryCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].member.membershipCode).toBe('FS-1046');
  });

  it('rejects invalid amount and OTHER method', async () => {
    const { member } = await debtorDay16();

    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.id,
        amountToman: 0,
        method: PaymentMethod.CASH,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.id,
        amountToman: 50_000,
        method: PaymentMethod.OTHER,
      })
      .expect(400);
  });

  it('rejects over-remaining; accepts Persian digit amount string for partial', async () => {
    const { member, remaining } = await debtorDay16();

    await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.id,
        amountToman: remaining + 1,
        method: PaymentMethod.CASH,
      })
      .expect(400);

    const partial = Math.min(50_000, remaining - 1);
    expect(partial).toBeGreaterThan(0);

    // Persian digits as string — DTO Transform → int
    const persianAmount = String(partial)
      .split('')
      .map((d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
      .join('');

    const beforePaid = (
      await prisma.subscription.findFirstOrThrow({
        where: { memberId: member.id },
        orderBy: { startsAt: 'desc' },
      })
    ).amountPaidToman;

    const paid = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.id,
        amountToman: persianAmount,
        method: PaymentMethod.CARD_TRANSFER,
        note: 'قسط تست e2e',
      })
      .expect(201);

    expect(paid.body.payment.amountToman).toBe(partial);
    expect(paid.body.payment.method).toBe(PaymentMethod.CARD_TRANSFER);
    expect(paid.body.fullySettled).toBe(false);
    expect(paid.body.subscription.amountPaidToman).toBe(beforePaid + partial);
    expect(paid.body.subscription.debtToman).toBe(
      remaining - partial,
    );
  });

  it('full settlement clears debt and unblocks tuition entry flag', async () => {
    const { member, remaining } = await debtorDay16();
    // may have been partially paid by previous test — re-read
    const sub = await prisma.subscription.findFirstOrThrow({
      where: { memberId: member.id },
      orderBy: { startsAt: 'desc' },
    });
    const left = sub.priceToman - sub.amountPaidToman;
    expect(left).toBeGreaterThan(0);

    const detailBefore = await request(app.getHttpServer())
      .get(`/api/members/${member.id}`)
      .set('Cookie', adminCookie)
      .expect(200);
    expect(detailBefore.body.currentSubscription.debtBlocksEntry).toBe(true);

    const settled = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', adminCookie)
      .send({
        memberId: member.id,
        amountToman: left,
        method: PaymentMethod.CARD_READER,
      })
      .expect(201);

    expect(settled.body.fullySettled).toBe(true);
    expect(settled.body.subscription.debtToman).toBe(0);
    expect(settled.body.debtBlocksEntry).toBe(false);
    expect(settled.body.payment.title).toContain('تسویه');

    const detailAfter = await request(app.getHttpServer())
      .get(`/api/members/${member.id}`)
      .set('Cookie', adminCookie)
      .expect(200);
    expect(detailAfter.body.currentSubscription.debtToman).toBe(0);
    expect(detailAfter.body.currentSubscription.debtBlocksEntry).toBe(false);
    expect(detailAfter.body.debtAmount).toBe(0);

    // restore half-paid state so attendance e2e debt scenario stays valid
    const half = Math.ceil(sub.priceToman / 2);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { amountPaidToman: half },
    });
    await prisma.member.update({
      where: { id: member.id },
      data: { debtAmount: sub.priceToman - half },
    });
  });

  it('admin reception revenue includes newly recorded payment', async () => {
    const day10 = await prisma.member.findUniqueOrThrow({
      where: { membershipCode: 'FS-1045' },
      include: { subscriptions: true },
    });
    const sub = day10.subscriptions[0];
    const left = sub.priceToman - sub.amountPaidToman;
    const pay = Math.min(25_000, left);
    expect(pay).toBeGreaterThan(0);

    const recorded = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', adminCookie)
      .send({
        memberId: day10.id,
        amountToman: pay,
        method: PaymentMethod.CASH,
      })
      .expect(201);

    const paymentId = recorded.body.payment.id as string;
    expect(recorded.body.payment.amountToman).toBe(pay);

    const after = await request(app.getHttpServer())
      .get('/api/dashboard/admin')
      .set('Cookie', adminCookie)
      .expect(200);

    // درآمد پذیرش از همان Paymentهای تأییدشده است
    expect(after.body.receptionRevenueThisMonth.paymentCount).toBeGreaterThan(0);
    expect(after.body.receptionRevenueThisMonth.amountToman).toBeGreaterThanOrEqual(
      pay,
    );

    const listed = await request(app.getHttpServer())
      .get('/api/payments')
      .query({ memberId: day10.id })
      .set('Cookie', adminCookie)
      .expect(200);
    expect(listed.body.some((p: { id: string }) => p.id === paymentId)).toBe(
      true,
    );

    // restore FS-1045 half-paid for attendance weekly-cap sample
    const half = Math.ceil(sub.priceToman / 2);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { amountPaidToman: half },
    });
    await prisma.member.update({
      where: { id: day10.id },
      data: { debtAmount: sub.priceToman - half },
    });
  });

  it('still forbids below-half when completing a start payment on debt below half', async () => {
    // Temporary fixture: create a tiny under-half paid sub on archived-safe spare —
    // use FS-1047, snapshot and restore.
    const m = await prisma.member.findUniqueOrThrow({
      where: { membershipCode: 'FS-1047' },
      include: { subscriptions: { include: { plan: true } } },
    });
    const sub = m.subscriptions[0];
    const snap = {
      amountPaidToman: sub.amountPaidToman,
      debtAmount: m.debtAmount,
    };

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { amountPaidToman: 50_000 },
    });
    await prisma.member.update({
      where: { id: m.id },
      data: { debtAmount: sub.priceToman - 50_000 },
    });

    const below = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: m.id,
        amountToman: 10_000,
        method: PaymentMethod.CASH,
      })
      .expect(400);
    expect(below.body.code === 'BELOW_HALF_TUITION' || below.body.message).toBeTruthy();

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { amountPaidToman: snap.amountPaidToman },
    });
    await prisma.member.update({
      where: { id: m.id },
      data: { debtAmount: snap.debtAmount },
    });
  });
});
