import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  SAMPLE_ARCHIVED_MEMBER_PHONE,
  SAMPLE_MEMBER_PHONE,
  SAMPLE_OTP_DEV_CODE,
  SAMPLE_STAFF_PASSWORDS,
} from '../prisma/sample-credentials.js';

describe('Auth (e2e)', () => {
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

  it('staff login succeeds with sample admin credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({
        identifier: 'admin@fitclub.local',
        password: SAMPLE_STAFF_PASSWORDS.admin,
      })
      .expect(200);

    expect(res.body.user.role).toBe('ADMIN');
    expect(res.headers['set-cookie']).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', res.headers['set-cookie'])
      .expect(200);
    expect(me.body.user.email).toBe('admin@fitclub.local');
  });

  it('staff login fails with wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({
        identifier: 'admin@fitclub.local',
        password: 'wrong-password',
      })
      .expect(401);
  });

  it('RBAC: secretary cannot hit admin ping', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({
        identifier: 'secretary@fitclub.local',
        password: SAMPLE_STAFF_PASSWORDS.secretary,
      })
      .expect(200);

    const cookie = login.headers['set-cookie'];

    await request(app.getHttpServer())
      .get('/api/auth/staff/ping')
      .set('Cookie', cookie)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/auth/admin/ping')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('member OTP skeleton: request + verify with dev code', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/member/otp/request')
      .send({ phone: SAMPLE_MEMBER_PHONE })
      .expect(200);

    const verify = await request(app.getHttpServer())
      .post('/api/auth/member/otp/verify')
      .send({ phone: SAMPLE_MEMBER_PHONE, code: SAMPLE_OTP_DEV_CODE })
      .expect(200);

    expect(verify.body.user.role).toBe('MEMBER');
    expect(verify.body.user.membershipCode).toBe('FS-1042');
    expect(verify.headers['set-cookie']).toBeDefined();
  });

  it('archived member cannot request OTP login', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/member/otp/request')
      .send({ phone: SAMPLE_ARCHIVED_MEMBER_PHONE })
      .expect(403);
  });

  it('wrong OTP fails', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/member/otp/request')
      .send({ phone: SAMPLE_MEMBER_PHONE })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/member/otp/verify')
      .send({ phone: SAMPLE_MEMBER_PHONE, code: '000000' })
      .expect(401);
  });

  it('does not let a shared cache store who is signed in', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(String(res.headers['cache-control'])).toMatch(/no-store/i);
    expect(res.headers.etag).toBeUndefined();
  });

  it.each([
    ['secretary', 'secretary@fitclub.local', SAMPLE_STAFF_PASSWORDS.secretary],
    ['admin', 'admin@fitclub.local', SAMPLE_STAFF_PASSWORDS.admin],
  ])('logout ends the %s session even if a proxy stored the cookie on /api', async (_role, identifier, password) => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({ identifier, password })
      .expect(200);

    const cookie = login.headers['set-cookie'];
    expect(cookiePaths(cookie)).toContain('/');

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    const logout = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    expect(cookiePaths(logout.headers['set-cookie'])).toEqual(
      expect.arrayContaining(['/', '/api']),
    );
    for (const header of cookieHeaders(logout.headers['set-cookie'])) {
      expect(header).toMatch(/HttpOnly/i);
      expect(header).toMatch(/SameSite=Lax/i);
      expect(header).toMatch(/Expires=Thu, 01 Jan 1970/i);
      expect(header).not.toMatch(/;\s*Secure/i);
    }

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('logout ends the member session', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/member/otp/request')
      .send({ phone: SAMPLE_MEMBER_PHONE })
      .expect(200);

    const verify = await request(app.getHttpServer())
      .post('/api/auth/member/otp/verify')
      .send({ phone: SAMPLE_MEMBER_PHONE, code: SAMPLE_OTP_DEV_CODE })
      .expect(200);

    const cookie = verify.headers['set-cookie'];
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });
});

function cookieHeaders(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function cookiePaths(raw: string | string[] | undefined): string[] {
  return cookieHeaders(raw).map((header) => {
    const match = header.match(/(?:^|;\s*)Path=([^;]*)/i);
    return match?.[1] ?? '';
  });
}
