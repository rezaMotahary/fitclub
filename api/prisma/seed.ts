/**
 * Sample seed for FitClub — prototype prices & people only (not official tariffs).
 * Run: npx prisma db seed
 *
 * Sample staff passwords / OTP: see prisma/sample-credentials.ts and docs/.env.example
 */
import {
  PrismaClient,
  Role,
  SessionGender,
  SubscriptionStatus,
} from '@prisma/client';
import { hashSecret } from '../src/auth/auth-crypto.js';
import {
  addIranDays,
  dayStringToUtcNoon,
  todayIran,
} from '../src/common/iran-date.js';
import {
  SAMPLE_ARCHIVED_MEMBER_PHONE,
  SAMPLE_STAFF_PASSWORDS,
} from './sample-credentials.js';

const prisma = new PrismaClient();

/** Prototype sample prices from prototype/index.html (toman, 30-day plans). */
const SAMPLE_PLANS = [
  { name: '۲ روز در هفته', daysPerWeek: 2, priceToman: 890_000, sortOrder: 1 },
  { name: '۳ روز در هفته', daysPerWeek: 3, priceToman: 1_190_000, sortOrder: 2 },
  { name: '۴ روز در هفته', daysPerWeek: 4, priceToman: 1_450_000, sortOrder: 3 },
  { name: 'هر روز در هفته', daysPerWeek: 7, priceToman: 1_790_000, sortOrder: 4 },
] as const;

function dayFromToday(offsetDays: number): Date {
  return dayStringToUtcNoon(addIranDays(todayIran(), offsetDays));
}

async function main() {
  // Idempotent: clear domain tables in FK-safe order
  await prisma.otpChallenge.deleteMany();
  await prisma.session.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.member.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();

  await prisma.clubSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });

  const plans = await Promise.all(
    SAMPLE_PLANS.map((p) =>
      prisma.plan.create({
        data: {
          name: p.name,
          daysPerWeek: p.daysPerWeek,
          priceToman: p.priceToman,
          durationDays: 30,
          sortOrder: p.sortOrder,
        },
      }),
    ),
  );

  const planByDays = Object.fromEntries(
    plans.map((p) => [p.daysPerWeek, p]),
  ) as Record<number, (typeof plans)[number]>;

  const adminPasswordHash = await hashSecret(SAMPLE_STAFF_PASSWORDS.admin);
  const secretaryPasswordHash = await hashSecret(
    SAMPLE_STAFF_PASSWORDS.secretary,
  );

  const admin = await prisma.user.create({
    data: {
      fullName: 'کاوه احمدی',
      phone: '09120000001',
      email: 'admin@fitclub.local',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      staffProfile: { create: { shiftLabel: 'مدیریت' } },
    },
  });

  const secretary = await prisma.user.create({
    data: {
      fullName: 'مریم صالحی',
      phone: '09120000002',
      email: 'secretary@fitclub.local',
      passwordHash: secretaryPasswordHash,
      role: Role.SECRETARY,
      staffProfile: { create: { shiftLabel: 'صبح بانوان' } },
    },
  });

  type MemberSeed = {
    code: string;
    fullName: string;
    phone: string;
    gender: SessionGender;
    daysPerWeek: number;
    startsOffsetDays: number;
    debtAmount: number;
    coachName?: string;
    isArchived?: boolean;
  };

  const members: MemberSeed[] = [
    {
      code: 'FS-1042',
      fullName: 'سارا کریمی',
      phone: '09121234567',
      gender: SessionGender.WOMEN,
      daysPerWeek: 3,
      startsOffsetDays: -12,
      debtAmount: 0,
      coachName: 'نیلوفر کاظمی',
    },
    {
      code: 'FS-1043',
      fullName: 'مریم احمدی',
      phone: '09121234568',
      gender: SessionGender.WOMEN,
      daysPerWeek: 7,
      startsOffsetDays: -8,
      debtAmount: 0,
    },
    {
      code: 'FS-1044',
      fullName: 'نازنین موسوی',
      phone: '09121234569',
      gender: SessionGender.WOMEN,
      daysPerWeek: 4,
      startsOffsetDays: -19,
      debtAmount: 0,
    },
    {
      // day ~10 of period, half paid → entry still open for debt rule
      code: 'FS-1045',
      fullName: 'حسین نوری',
      phone: '09121234570',
      gender: SessionGender.MEN,
      daysPerWeek: 2,
      startsOffsetDays: -9,
      debtAmount: 445_000,
    },
    {
      // day ~16 of period, half unpaid → entry closed for debt rule
      code: 'FS-1046',
      fullName: 'علی رضایی',
      phone: '09121234571',
      gender: SessionGender.MEN,
      daysPerWeek: 4,
      startsOffsetDays: -15,
      debtAmount: 725_000,
    },
    {
      code: 'FS-1047',
      fullName: 'شیدا رستمی',
      phone: '09121234572',
      gender: SessionGender.WOMEN,
      daysPerWeek: 3,
      startsOffsetDays: -5,
      debtAmount: 0,
    },
    {
      code: 'FS-1048',
      fullName: 'پویا کامرانی',
      phone: '09121234573',
      gender: SessionGender.MEN,
      daysPerWeek: 7,
      startsOffsetDays: -3,
      debtAmount: 0,
    },
    {
      // Archived — must not be able to OTP-login to member panel
      code: 'FS-1099',
      fullName: 'عضو آرشیو نمونه',
      phone: SAMPLE_ARCHIVED_MEMBER_PHONE,
      gender: SessionGender.WOMEN,
      daysPerWeek: 3,
      startsOffsetDays: -20,
      debtAmount: 0,
      isArchived: true,
    },
  ];

  for (const m of members) {
    const plan = planByDays[m.daysPerWeek];
    const startsAt = dayFromToday(m.startsOffsetDays);
    const endsAt = dayFromToday(m.startsOffsetDays + 29);

    await prisma.user.create({
      data: {
        fullName: m.fullName,
        phone: m.phone,
        role: Role.MEMBER,
        isActive: !m.isArchived,
        member: {
          create: {
            membershipCode: m.code,
            sessionGender: m.gender,
            debtAmount: m.debtAmount,
            coachName: m.coachName,
            isArchived: m.isArchived ?? false,
            subscriptions: {
              create: {
                planId: plan.id,
                status: SubscriptionStatus.ACTIVE,
                startsAt,
                endsAt,
                priceToman: plan.priceToman,
                amountPaidToman:
                  m.debtAmount > 0
                    ? Math.max(0, plan.priceToman - m.debtAmount)
                    : plan.priceToman,
              },
            },
          },
        },
      },
    });
  }

  console.log('FitClub seed complete:', {
    plans: plans.length,
    admin: { name: admin.fullName, email: 'admin@fitclub.local' },
    secretary: {
      name: secretary.fullName,
      email: 'secretary@fitclub.local',
    },
    members: members.length,
    note: 'Sample passwords in prisma/sample-credentials.ts (local only)',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
