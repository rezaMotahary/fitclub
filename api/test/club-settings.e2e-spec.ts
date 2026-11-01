import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { SAMPLE_STAFF_PASSWORDS } from '../prisma/sample-credentials.js';

describe('Club settings (e2e)', () => {
  let app: INestApplication<App>;
  let originalPercent: number;

  beforeAll(async () => {
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

  async function staffCookie(email: string, password: string) {
    const login = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({ identifier: email, password })
      .expect(200);
    return login.headers['set-cookie'] as string | string[];
  }

  it('admin reads and updates early-renewal discount; zero means none; Persian digits work', async () => {
    const admin = await staffCookie(
      'admin@fitclub.local',
      SAMPLE_STAFF_PASSWORDS.admin,
    );
    const secretary = await staffCookie(
      'secretary@fitclub.local',
      SAMPLE_STAFF_PASSWORDS.secretary,
    );

    const initial = await request(app.getHttpServer())
      .get('/api/club-settings')
      .set('Cookie', admin)
      .expect(200);
    expect(typeof initial.body.earlyRenewalDiscountPercent).toBe('number');
    originalPercent = initial.body.earlyRenewalDiscountPercent;

    const secretaryRead = await request(app.getHttpServer())
      .get('/api/club-settings')
      .set('Cookie', secretary)
      .expect(200);
    expect(secretaryRead.body.earlyRenewalDiscountPercent).toBe(originalPercent);

    await request(app.getHttpServer())
      .patch('/api/club-settings')
      .set('Cookie', secretary)
      .send({ earlyRenewalDiscountPercent: 20 })
      .expect(403);

    const zero = await request(app.getHttpServer())
      .patch('/api/club-settings')
      .set('Cookie', admin)
      .send({ earlyRenewalDiscountPercent: 0 })
      .expect(200);
    expect(zero.body.earlyRenewalDiscountPercent).toBe(0);

    const persian = await request(app.getHttpServer())
      .patch('/api/club-settings')
      .set('Cookie', admin)
      .send({ earlyRenewalDiscountPercent: '۱۵' })
      .expect(200);
    expect(persian.body.earlyRenewalDiscountPercent).toBe(15);

    await request(app.getHttpServer())
      .patch('/api/club-settings')
      .set('Cookie', admin)
      .send({ earlyRenewalDiscountPercent: 101 })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/club-settings')
      .set('Cookie', admin)
      .send({ earlyRenewalDiscountPercent: originalPercent })
      .expect(200);
  });
});
