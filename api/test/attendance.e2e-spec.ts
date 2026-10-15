import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  AttendanceResult,
  PrismaClient,
  SessionGender,
} from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { SAMPLE_STAFF_PASSWORDS } from '../prisma/sample-credentials.js';
import { addIranDays, todayIran } from '../src/common/iran-date.js';
import { weekContaining } from '../src/common/attendance-week.js';
import { iranWallDateTime } from '../src/common/session-schedule.js';

/** Always-open sample schedule so e2e is not clock-dependent. */
const OPEN_ALL_DAY = {
  men: {
    sat: { open: '00:00', close: '23:59' },
    sun: { open: '00:00', close: '23:59' },
    mon: { open: '00:00', close: '23:59' },
    tue: { open: '00:00', close: '23:59' },
    wed: { open: '00:00', close: '23:59' },
    thu: { open: '00:00', close: '23:59' },
    fri: { open: '00:00', close: '23:59' },
  },
  women: {
    sat: { open: '00:00', close: '23:59' },
    sun: { open: '00:00', close: '23:59' },
    mon: { open: '00:00', close: '23:59' },
    tue: { open: '00:00', close: '23:59' },
    wed: { open: '00:00', close: '23:59' },
    thu: { open: '00:00', close: '23:59' },
    fri: { open: '00:00', close: '23:59' },
  },
};

describe('Attendance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let secretaryCookie: string | string[];
  let adminCookie: string | string[];
  let previousSchedule: unknown;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    prisma = new PrismaClient();

    const settings = await prisma.clubSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', sessionSchedule: OPEN_ALL_DAY },
      update: {},
    });
    previousSchedule = settings.sessionSchedule;
    await prisma.clubSettings.update({
      where: { id: 'default' },
      data: { sessionSchedule: OPEN_ALL_DAY },
    });

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
    if (previousSchedule != null) {
      await prisma.clubSettings.update({
        where: { id: 'default' },
        data: { sessionSchedule: previousSchedule as object },
      });
    }
    await app.close();
    await prisma.$disconnect();
  });

  async function memberByCode(code: string) {
    const m = await prisma.member.findUnique({
      where: { membershipCode: code },
      include: { user: true },
    });
    expect(m).toBeTruthy();
    return m!;
  }

  it('secretary can evaluate eligibility; admin can view but not check-in', async () => {
    const sara = await memberByCode('FS-1042');
    // clear any open visit from seed so eligibility is clean
    await prisma.attendance.updateMany({
      where: {
        memberId: sara.id,
        checkOutAt: null,
        voidedAt: null,
        result: AttendanceResult.SUCCESS,
      },
      data: {
        checkOutAt: new Date(),
        durationMinutes: 1,
        closedAutomatically: false,
      },
    });

    const elig = await request(app.getHttpServer())
      .get(`/api/attendance/eligibility/${sara.id}`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(elig.body.eligibility.allowed).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/attendance/eligibility/${sara.id}`)
      .set('Cookie', adminCookie)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/attendance/check-in')
      .set('Cookie', adminCookie)
      .send({ memberId: sara.id })
      .expect(403);
  });

  it('check-in → open → check-out; same-day second visit does not double-count week', async () => {
    const shida = await memberByCode('FS-1047');
    await prisma.attendance.deleteMany({ where: { memberId: shida.id } });

    const in1 = await request(app.getHttpServer())
      .post('/api/attendance/check-in')
      .set('Cookie', secretaryCookie)
      .send({ memberId: shida.id })
      .expect(200);
    expect(in1.body.ok).toBe(true);
    expect(in1.body.attendance.isOpen).toBe(true);

    const out1 = await request(app.getHttpServer())
      .post('/api/attendance/check-out')
      .set('Cookie', secretaryCookie)
      .send({ memberId: shida.id })
      .expect(200);
    expect(out1.body.attendance.checkOutAt).toBeTruthy();

    const afterFirst = await request(app.getHttpServer())
      .get(`/api/attendance/eligibility/${shida.id}`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(afterFirst.body.weekly.countedDays).toHaveLength(1);
    expect(afterFirst.body.eligibility.allowed).toBe(true);

    const in2 = await request(app.getHttpServer())
      .post('/api/attendance/check-in')
      .set('Cookie', secretaryCookie)
      .send({ memberId: shida.id })
      .expect(200);
    expect(in2.body.ok).toBe(true);

    await request(app.getHttpServer())
      .post('/api/attendance/check-out')
      .set('Cookie', secretaryCookie)
      .send({ attendanceId: in2.body.attendance.id })
      .expect(200);

    const afterSecond = await request(app.getHttpServer())
      .get(`/api/attendance/eligibility/${shida.id}`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(afterSecond.body.weekly.countedDays).toHaveLength(1);
  });

  it('rejects debt day-16 member and logs REJECTED_DEBT', async () => {
    const ali = await memberByCode('FS-1046');
    const res = await request(app.getHttpServer())
      .post('/api/attendance/check-in')
      .set('Cookie', secretaryCookie)
      .send({ memberId: ali.id })
      .expect(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.eligibility.denyCode).toBe('DEBT');
    expect(res.body.attendance.result).toBe(AttendanceResult.REJECTED_DEBT);

    const today = await request(app.getHttpServer())
      .get('/api/attendance/today')
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(
      today.body.items.some(
        (i: { membershipCode: string; result: string }) =>
          i.membershipCode === 'FS-1046' &&
          i.result === AttendanceResult.REJECTED_DEBT,
      ),
    ).toBe(true);
  });

  it('rejects archived member', async () => {
    const archived = await memberByCode('FS-1099');
    const res = await request(app.getHttpServer())
      .post('/api/attendance/check-in')
      .set('Cookie', secretaryCookie)
      .send({ memberId: archived.id })
      .expect(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.eligibility.denyCode).toBe('ARCHIVED');
  });

  it('weekly cap blocks when share full and today not counted', async () => {
    const hosein = await memberByCode('FS-1045');
    expect(hosein.sessionGender).toBe(SessionGender.MEN);
    await prisma.attendance.deleteMany({ where: { memberId: hosein.id } });

    const today = todayIran();
    const week = weekContaining(today);
    const past: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addIranDays(week.startDay, i);
      if (d < today) past.push(d);
    }
    // Ensure two past counted days (or skip if week too early)
    if (past.length < 2) {
      return;
    }
    for (const day of past.slice(0, 2)) {
      await prisma.attendance.create({
        data: {
          memberId: hosein.id,
          checkInAt: iranWallDateTime(day, '16:00'),
          checkOutAt: iranWallDateTime(day, '17:00'),
          durationMinutes: 60,
          result: AttendanceResult.SUCCESS,
        },
      });
    }

    const res = await request(app.getHttpServer())
      .post('/api/attendance/check-in')
      .set('Cookie', secretaryCookie)
      .send({ memberId: hosein.id })
      .expect(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.eligibility.denyCode).toBe('WEEKLY_CAP');
  });

  it('void same-day returns weekly share; record stays', async () => {
    const nazanin = await memberByCode('FS-1044');
    await prisma.attendance.deleteMany({ where: { memberId: nazanin.id } });

    const cin = await request(app.getHttpServer())
      .post('/api/attendance/check-in')
      .set('Cookie', secretaryCookie)
      .send({ memberId: nazanin.id })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/attendance/check-out')
      .set('Cookie', secretaryCookie)
      .send({ memberId: nazanin.id })
      .expect(200);

    const before = await request(app.getHttpServer())
      .get(`/api/attendance/eligibility/${nazanin.id}`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(before.body.weekly.countedDays.length).toBe(1);

    const voided = await request(app.getHttpServer())
      .post(`/api/attendance/${cin.body.attendance.id}/void`)
      .set('Cookie', adminCookie)
      .send({ reason: 'اشتباه ثبت شد' })
      .expect(200);
    expect(voided.body.attendance.isVoided).toBe(true);

    const after = await request(app.getHttpServer())
      .get(`/api/attendance/eligibility/${nazanin.id}`)
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(after.body.weekly.countedDays.length).toBe(0);

    const row = await prisma.attendance.findUnique({
      where: { id: cin.body.attendance.id },
    });
    expect(row?.voidedAt).toBeTruthy();
  });

  it('auto-close uses session end time, not wall clock of the job', async () => {
    const pouya = await memberByCode('FS-1048');
    await prisma.attendance.deleteMany({ where: { memberId: pouya.id } });

    const today = todayIran();
    // Narrow today close to 12:00, create open check-in at 10:00, run auto-close at 13:00 via real now
    // by setting schedule close already past relative to real now.
    const closeHm = '00:01';
    await prisma.clubSettings.update({
      where: { id: 'default' },
      data: {
        sessionSchedule: {
          ...OPEN_ALL_DAY,
          men: Object.fromEntries(
            Object.keys(OPEN_ALL_DAY.men).map((k) => [
              k,
              { open: '00:00', close: closeHm },
            ]),
          ),
        },
      },
    });

    const checkInAt = iranWallDateTime(today, '00:00');
    const created = await prisma.attendance.create({
      data: {
        memberId: pouya.id,
        checkInAt,
        result: AttendanceResult.SUCCESS,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/attendance/auto-close')
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(res.body.closedCount).toBeGreaterThanOrEqual(1);

    const row = await prisma.attendance.findUnique({ where: { id: created.id } });
    expect(row?.closedAutomatically).toBe(true);
    expect(row?.checkOutAt?.toISOString()).toBe(
      iranWallDateTime(today, closeHm).toISOString(),
    );

    // restore open-all-day for remaining tests
    await prisma.clubSettings.update({
      where: { id: 'default' },
      data: { sessionSchedule: OPEN_ALL_DAY },
    });
  });

  it('member search accepts Persian and English digits for phone', async () => {
    const en = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: '09121234567' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(
      en.body.some((m: { membershipCode: string }) => m.membershipCode === 'FS-1042'),
    ).toBe(true);

    const fa = await request(app.getHttpServer())
      .get('/api/members')
      .query({ q: '۰۹۱۲۱۲۳۴۵۶۷' })
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(
      fa.body.some((m: { membershipCode: string }) => m.membershipCode === 'FS-1042'),
    ).toBe(true);
  });

  it('today log and inside list are readable for secretary and admin', async () => {
    const today = await request(app.getHttpServer())
      .get('/api/attendance/today')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(today.body).toHaveProperty('day');
    expect(Array.isArray(today.body.items)).toBe(true);

    const inside = await request(app.getHttpServer())
      .get('/api/attendance/inside')
      .set('Cookie', secretaryCookie)
      .expect(200);
    expect(inside.body).toHaveProperty('count');
    expect(Array.isArray(inside.body.items)).toBe(true);
  });
});
