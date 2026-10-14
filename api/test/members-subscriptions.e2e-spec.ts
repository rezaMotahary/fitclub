import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PaymentMethod, PrismaClient, Role } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { SAMPLE_STAFF_PASSWORDS } from '../prisma/sample-credentials.js';
import {
  addIranDays,
  todayIran,
  tomorrowIran,
} from '../src/common/iran-date.js';
import { earlyRenewalStartDay } from '../src/common/subscription-period.js';

describe('Members + Plans + Subscriptions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let secretaryCookie: string | string[];
  let adminCookie: string | string[];

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
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

  it('lists sample plans with readable prices for staff', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Cookie', secretaryCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    expect(res.body[0]).toMatchObject({
      daysPerWeek: expect.any(Number),
      priceToman: expect.any(Number),
      priceLabel: expect.stringContaining('تومان'),
    });
  });

  it('secretary cannot change plan price; admin can', async () => {
    const plans = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Cookie', adminCookie)
      .expect(200);
    const plan = plans.body.find(
      (p: { daysPerWeek: number }) => p.daysPerWeek === 2,
    );
    expect(plan).toBeTruthy();
    const original = plan.priceToman as number;

    await request(app.getHttpServer())
      .patch(`/api/plans/${plan.id}`)
      .set('Cookie', secretaryCookie)
      .send({ priceToman: original + 1000 })
      .expect(403);

    const updated = await request(app.getHttpServer())
      .patch(`/api/plans/${plan.id}`)
      .set('Cookie', adminCookie)
      .send({ priceToman: original })
      .expect(200);
    expect(updated.body.priceToman).toBe(original);
  });

  it('searches members by name, FS- code, and phone', async () => {
    const byName = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: 'سارا' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(byName.body.some((m: { membershipCode: string }) => m.membershipCode === 'FS-1042')).toBe(
      true,
    );

    const byCode = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: 'FS-1045' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(byCode.body[0].membershipCode).toBe('FS-1045');

    const byPhone = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: '09121234567' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(byPhone.body[0].membershipCode).toBe('FS-1042');
  });

  it('member detail exposes half-paid day~10 open vs day~16 blocked debt flags', async () => {
    const openDebt = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: 'FS-1045' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    const openId = openDebt.body[0].id as string;
    const openDetail = await request(app.getHttpServer())
      .get(`/api/members/${openId}`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(openDetail.body.currentSubscription.debtBlocksEntry).toBe(false);
    expect(openDetail.body.currentSubscription.debtToman).toBeGreaterThan(0);

    const closedDebt = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: 'FS-1046' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    const closedId = closedDebt.body[0].id as string;
    const closedDetail = await request(app.getHttpServer())
      .get(`/api/members/${closedId}`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(closedDetail.body.currentSubscription.debtBlocksEntry).toBe(true);
  });

  it('archives and reactivates a member (secretary)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/members')
      .set('Cookie', secretaryCookie)
      .send({
        fullName: 'تست آرشیو موقت',
        phone: '09128887766',
        sessionGender: 'MEN',
      })
      .expect(201);

    const id = created.body.id as string;
    expect(created.body.membershipCode).toMatch(/^FS-\d+$/);

    const archived = await request(app.getHttpServer())
      .post(`/api/members/${id}/archive`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(archived.body.isArchived).toBe(true);

    const activated = await request(app.getHttpServer())
      .post(`/api/members/${id}/activate`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(activated.body.isArchived).toBe(false);

    // cleanup user/member for re-runs
    await prisma.member.delete({ where: { id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { phone: '09128887766' } });
  });

  it('rejects sell below half tuition', async () => {
    const member = await request(app.getHttpServer())
      .post('/api/members')
      .set('Cookie', adminCookie)
      .send({
        fullName: 'عضو فروش تست',
        phone: '09127776655',
        sessionGender: 'WOMEN',
      })
      .expect(201);

    const plans = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Cookie', adminCookie)
      .expect(200);
    const plan = plans.body.find(
      (p: { daysPerWeek: number }) => p.daysPerWeek === 3,
    );

    await request(app.getHttpServer())
      .post('/api/subscriptions/sell')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.body.id,
        planId: plan.id,
        amountPaidToman: 100_000,
        paymentMethod: PaymentMethod.CASH,
      })
      .expect(400);

    await prisma.member.delete({ where: { id: member.body.id } });
    await prisma.user.deleteMany({ where: { phone: '09127776655' } });
  });

  it('sells a full subscription starting today and rejects past start', async () => {
    const phone = '09126665544';
    const member = await request(app.getHttpServer())
      .post('/api/members')
      .set('Cookie', adminCookie)
      .send({
        fullName: 'عضو فروش کامل',
        phone,
        sessionGender: 'MEN',
      })
      .expect(201);

    const plans = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Cookie', adminCookie)
      .expect(200);
    const plan = plans.body.find(
      (p: { daysPerWeek: number }) => p.daysPerWeek === 2,
    );

    const today = todayIran();
    await request(app.getHttpServer())
      .post('/api/subscriptions/sell')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.body.id,
        planId: plan.id,
        startsOn: addIranDays(today, -1),
        amountPaidToman: plan.priceToman,
      })
      .expect(400);

    const sold = await request(app.getHttpServer())
      .post('/api/subscriptions/sell')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.body.id,
        planId: plan.id,
        startsOn: today,
        amountPaidToman: plan.priceToman,
        paymentMethod: PaymentMethod.CARD_READER,
      })
      .expect(201);

    expect(sold.body.subscription.startsOn).toBe(today);
    expect(sold.body.subscription.debtToman).toBe(0);

    // second sell while current exists → must fail
    await request(app.getHttpServer())
      .post('/api/subscriptions/sell')
      .set('Cookie', secretaryCookie)
      .send({
        memberId: member.body.id,
        planId: plan.id,
        amountPaidToman: plan.priceToman,
      })
      .expect(400);

    await prisma.payment.deleteMany({ where: { memberId: member.body.id } });
    await prisma.subscription.deleteMany({
      where: { memberId: member.body.id },
    });
    await prisma.member.delete({ where: { id: member.body.id } });
    await prisma.user.deleteMany({ where: { phone } });
  });

  it('early renew starts day after end, applies settings discount, blocks second upcoming', async () => {
    const phone = '09125554433';
    await prisma.user.deleteMany({ where: { phone } });

    const member = await request(app.getHttpServer())
      .post('/api/members')
      .set('Cookie', adminCookie)
      .send({
        fullName: 'عضو تمدید زودتر',
        phone,
        sessionGender: 'WOMEN',
      })
      .expect(201);

    const plans = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Cookie', adminCookie)
      .expect(200);
    const plan3 = plans.body.find(
      (p: { daysPerWeek: number }) => p.daysPerWeek === 3,
    );
    const plan4 = plans.body.find(
      (p: { daysPerWeek: number }) => p.daysPerWeek === 4,
    );

    const today = todayIran();
    await request(app.getHttpServer())
      .post('/api/subscriptions/sell')
      .set('Cookie', adminCookie)
      .send({
        memberId: member.body.id,
        planId: plan3.id,
        startsOn: today,
        amountPaidToman: plan3.priceToman,
      })
      .expect(201);

    const settings = await prisma.clubSettings.findUniqueOrThrow({
      where: { id: 'default' },
    });
    const expectedPrice = Math.round(
      plan4.priceToman * (1 - settings.earlyRenewalDiscountPercent / 100),
    );

    const renewed = await request(app.getHttpServer())
      .post('/api/subscriptions/renew')
      .set('Cookie', adminCookie)
      .send({
        memberId: member.body.id,
        planId: plan4.id,
        amountPaidToman: expectedPrice,
        // attempt to force a gap — must be ignored / rejected if different
        startsOn: tomorrowIran(today),
      })
      .expect(400);

    expect(renewed.body.message).toBeTruthy();

    const detailBefore = await request(app.getHttpServer())
      .get(`/api/members/${member.body.id}`)
      .set('Cookie', adminCookie)
      .expect(200);
    const currentEndsOn = detailBefore.body.currentSubscription
      .endsOn as string;
    const expectedStart = earlyRenewalStartDay(currentEndsOn);

    const okRenew = await request(app.getHttpServer())
      .post('/api/subscriptions/renew')
      .set('Cookie', adminCookie)
      .send({
        memberId: member.body.id,
        planId: plan4.id,
        amountPaidToman: expectedPrice,
      })
      .expect(201);

    expect(okRenew.body.subscription.startsOn).toBe(expectedStart);
    expect(okRenew.body.subscription.discountPercentApplied).toBe(
      settings.earlyRenewalDiscountPercent,
    );
    expect(okRenew.body.subscription.priceToman).toBe(expectedPrice);

    await request(app.getHttpServer())
      .post('/api/subscriptions/renew')
      .set('Cookie', adminCookie)
      .send({
        memberId: member.body.id,
        planId: plan3.id,
        amountPaidToman: plan3.priceToman,
      })
      .expect(400);

    await prisma.payment.deleteMany({ where: { memberId: member.body.id } });
    await prisma.subscription.deleteMany({
      where: { memberId: member.body.id },
    });
    await prisma.member.delete({ where: { id: member.body.id } });
    await prisma.user.deleteMany({ where: { phone } });
  });

  it('member role cannot access members API', async () => {
    await request(app.getHttpServer())
      .get('/api/members')
      .expect(401);
  });

  it('seed archived member is searchable when includeArchived=true', async () => {
    const hidden = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: 'FS-1099' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(hidden.body.length).toBe(0);

    const shown = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: 'FS-1099', includeArchived: 'true' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(shown.body[0]?.isArchived).toBe(true);
  });
});
