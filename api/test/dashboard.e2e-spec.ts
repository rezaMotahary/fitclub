import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  SAMPLE_MEMBER_PHONE,
  SAMPLE_OTP_DEV_CODE,
  SAMPLE_STAFF_PASSWORDS,
} from '../prisma/sample-credentials.js';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.OTP_DEV_CODE = SAMPLE_OTP_DEV_CODE;
    process.env.NODE_ENV = 'development';

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
  });

  afterAll(async () => {
    await app.close();
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

  async function staffCookie(
    email: string,
    password: string,
  ): Promise<string | string[]> {
    const login = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({ identifier: email, password })
      .expect(200);
    return login.headers['set-cookie'] as string | string[];
  }

  it('member dashboard returns own plan, weekly share, notices, history', async () => {
    const cookie = await memberCookie();
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.profile.membershipCode).toBe('FS-1042');
    expect(res.body.subscription).toBeTruthy();
    expect(res.body.subscription.planName).toContain('۳');
    expect(res.body.weekly.weeklyCap).toBe(3);
    expect(res.body.weekly.calendar).toHaveLength(7);
    expect(res.body.weekly.calendar[0].weekdayLabel).toBe('شنبه');
    expect(Array.isArray(res.body.recentAttendance)).toBe(true);
    expect(Array.isArray(res.body.payments)).toBe(true);
    expect(res.body.payments.length).toBeGreaterThan(0);
    expect(
      res.body.notices.some(
        (n: { type: string }) => n.type === 'expiry' || n.type === 'debt',
      ),
    ).toBe(true);
  });

  it('member cannot access admin overview', async () => {
    const cookie = await memberCookie();
    await request(app.getHttpServer())
      .get('/api/dashboard/admin')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('secretary cannot access member or admin dashboard', async () => {
    const cookie = await staffCookie(
      'secretary@fitclub.local',
      SAMPLE_STAFF_PASSWORDS.secretary,
    );
    await request(app.getHttpServer())
      .get('/api/dashboard/me')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/dashboard/admin')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('admin overview returns active members, today, expiry, revenue', async () => {
    const cookie = await staffCookie(
      'admin@fitclub.local',
      SAMPLE_STAFF_PASSWORDS.admin,
    );
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/admin')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.activeMembers).toBeGreaterThanOrEqual(5);
    expect(res.body.attendanceToday).toBeTruthy();
    expect(typeof res.body.attendanceToday.checkInsToday).toBe('number');
    expect(Array.isArray(res.body.expiringSoon)).toBe(true);
    expect(res.body.receptionRevenueThisMonth.amountToman).toBeGreaterThan(0);
    expect(res.body.receptionRevenueThisMonth.monthLabel.length).toBeGreaterThan(
      2,
    );
  });
});
