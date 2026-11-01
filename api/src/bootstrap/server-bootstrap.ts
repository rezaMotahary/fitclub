import { Role, SessionGender } from '@prisma/client';
import { hashSecret } from '../auth/auth-crypto.js';
import { SAMPLE_STAFF_PASSWORDS } from '../auth/sample-passwords.js';

/**
 * First-run accounts for the teaching server.
 * Adds missing starter tariffs and the three test logins.
 * Never deletes rows and never changes an account that already exists.
 */
export const SERVER_ADMIN_EMAIL = 'admin@fitclub.local';
export const SERVER_SECRETARY_EMAIL = 'secretary@fitclub.local';
export const SERVER_TEST_MEMBER_PHONE = '09121234567';
export const SERVER_TEST_MEMBER_CODE = 'FS-1001';

const STARTER_PLANS = [
  { name: '۲ روز در هفته', daysPerWeek: 2, priceToman: 890_000, sortOrder: 1 },
  { name: '۳ روز در هفته', daysPerWeek: 3, priceToman: 1_190_000, sortOrder: 2 },
  { name: '۴ روز در هفته', daysPerWeek: 4, priceToman: 1_450_000, sortOrder: 3 },
  { name: 'هر روز در هفته', daysPerWeek: 7, priceToman: 1_790_000, sortOrder: 4 },
] as const;

export type AccountStatus = 'created' | 'kept';

export type ServerBootstrapResult = {
  membersBefore: number;
  membersAfter: number;
  plansCreated: number;
  admin: AccountStatus;
  secretary: AccountStatus;
  testMember: AccountStatus;
};

type PlanShape = {
  id: string;
  name: string;
  daysPerWeek: number;
  priceToman: number;
};

export type ServerBootstrapDb = {
  clubSettings: {
    upsert(args: {
      where: { id: string };
      create: { id: string };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
  plan: {
    findFirst(args: { where: { daysPerWeek: number } }): Promise<PlanShape | null>;
    create(args: {
      data: {
        name: string;
        daysPerWeek: number;
        priceToman: number;
        sortOrder: number;
        durationDays: number;
      };
    }): Promise<unknown>;
  };
  user: {
    findUnique(args: {
      where: { email: string } | { phone: string };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        fullName: string;
        phone?: string | null;
        email?: string | null;
        passwordHash?: string | null;
        role: Role;
        isActive?: boolean;
        staffProfile?: { create: { shiftLabel?: string } };
        member?: {
          create: {
            membershipCode: string;
            sessionGender: SessionGender;
            debtAmount: number;
          };
        };
      };
    }): Promise<{ id: string }>;
  };
  member: {
    count(): Promise<number>;
    findUnique(args: { where: { membershipCode: string } }): Promise<{ id: string } | null>;
  };
};

async function ensureStaff(
  db: ServerBootstrapDb,
  account: {
    email: string;
    phone: string;
    fullName: string;
    role: Role;
    password: string;
    shiftLabel: string;
  },
): Promise<AccountStatus> {
  const byEmail = await db.user.findUnique({ where: { email: account.email } });
  if (byEmail) return 'kept';
  const byPhone = await db.user.findUnique({ where: { phone: account.phone } });
  if (byPhone) {
    throw new Error(
      `Refusing to change the existing account that already uses phone ${account.phone}.`,
    );
  }
  const passwordHash = await hashSecret(account.password);
  await db.user.create({
    data: {
      fullName: account.fullName,
      phone: account.phone,
      email: account.email,
      passwordHash,
      role: account.role,
      staffProfile: { create: { shiftLabel: account.shiftLabel } },
    },
  });
  return 'created';
}

async function ensureTestMember(db: ServerBootstrapDb): Promise<AccountStatus> {
  const byPhone = await db.user.findUnique({ where: { phone: SERVER_TEST_MEMBER_PHONE } });
  if (byPhone) return 'kept';
  const byCode = await db.member.findUnique({
    where: { membershipCode: SERVER_TEST_MEMBER_CODE },
  });
  if (byCode) return 'kept';
  await db.user.create({
    data: {
      fullName: 'عضو تست',
      phone: SERVER_TEST_MEMBER_PHONE,
      role: Role.MEMBER,
      isActive: true,
      member: {
        create: {
          membershipCode: SERVER_TEST_MEMBER_CODE,
          sessionGender: SessionGender.WOMEN,
          debtAmount: 0,
        },
      },
    },
  });
  return 'created';
}

export async function bootstrapServer(db: ServerBootstrapDb): Promise<ServerBootstrapResult> {
  const membersBefore = await db.member.count();

  await db.clubSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });

  let plansCreated = 0;
  for (const plan of STARTER_PLANS) {
    const existing = await db.plan.findFirst({ where: { daysPerWeek: plan.daysPerWeek } });
    if (existing) continue;
    await db.plan.create({
      data: {
        name: plan.name,
        daysPerWeek: plan.daysPerWeek,
        priceToman: plan.priceToman,
        sortOrder: plan.sortOrder,
        durationDays: 30,
      },
    });
    plansCreated += 1;
  }

  const admin = await ensureStaff(db, {
    email: SERVER_ADMIN_EMAIL,
    phone: '09120000001',
    fullName: 'مدیر تست',
    role: Role.ADMIN,
    password: SAMPLE_STAFF_PASSWORDS.admin,
    shiftLabel: 'مدیریت',
  });
  const secretary = await ensureStaff(db, {
    email: SERVER_SECRETARY_EMAIL,
    phone: '09120000002',
    fullName: 'منشی تست',
    role: Role.SECRETARY,
    password: SAMPLE_STAFF_PASSWORDS.secretary,
    shiftLabel: 'پذیرش',
  });
  const testMember = await ensureTestMember(db);

  const membersAfter = await db.member.count();
  if (membersAfter < membersBefore) {
    throw new Error(
      `Refusing server bootstrap: member count fell from ${membersBefore} to ${membersAfter}.`,
    );
  }

  return {
    membersBefore,
    membersAfter,
    plansCreated,
    admin,
    secretary,
    testMember,
  };
}
