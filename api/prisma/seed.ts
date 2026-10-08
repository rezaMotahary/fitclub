/**
 * Sample seed for FitClub — prototype prices & people only (not official tariffs).
 * Run: npx prisma db seed
 */
import {
  PrismaClient,
  Role,
  SessionGender,
  SubscriptionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

/** Prototype sample prices from prototype/index.html (toman, 30-day plans). */
const SAMPLE_PLANS = [
  { name: '۲ روز در هفته', daysPerWeek: 2, priceToman: 890_000, sortOrder: 1 },
  { name: '۳ روز در هفته', daysPerWeek: 3, priceToman: 1_190_000, sortOrder: 2 },
  { name: '۴ روز در هفته', daysPerWeek: 4, priceToman: 1_450_000, sortOrder: 3 },
  { name: 'هر روز در هفته', daysPerWeek: 7, priceToman: 1_790_000, sortOrder: 4 },
] as const;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  // Idempotent: clear domain tables in FK-safe order
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.member.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();

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

  const admin = await prisma.user.create({
    data: {
      fullName: 'کاوه احمدی',
      phone: '09120000001',
      email: 'admin@fitclub.local',
      role: Role.ADMIN,
      staffProfile: { create: { shiftLabel: 'مدیریت' } },
    },
  });

  const secretary = await prisma.user.create({
    data: {
      fullName: 'مریم صالحی',
      phone: '09120000002',
      email: 'secretary@fitclub.local',
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
  ];

  for (const m of members) {
    const plan = planByDays[m.daysPerWeek];
    const startsAt = daysFromNow(m.startsOffsetDays);
    const endsAt = daysFromNow(m.startsOffsetDays + 29);

    await prisma.user.create({
      data: {
        fullName: m.fullName,
        phone: m.phone,
        role: Role.MEMBER,
        member: {
          create: {
            membershipCode: m.code,
            sessionGender: m.gender,
            debtAmount: m.debtAmount,
            coachName: m.coachName,
            subscriptions: {
              create: {
                planId: plan.id,
                status: SubscriptionStatus.ACTIVE,
                startsAt,
                endsAt,
              },
            },
          },
        },
      },
    });
  }

  console.log('FitClub seed complete:', {
    plans: plans.length,
    admin: admin.fullName,
    secretary: secretary.fullName,
    members: members.length,
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
