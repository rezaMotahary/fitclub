import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { verifySecret } from '../auth/auth-crypto.js';
import { SAMPLE_STAFF_PASSWORDS } from '../auth/sample-passwords.js';
import { bootstrapServer } from './server-bootstrap.js';

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  passwordHash: string | null;
  fullName: string;
};

type MemberRow = {
  id: string;
  userId: string;
  membershipCode: string;
  debtAmount: number;
  sessionGender: string;
};

type PlanRow = {
  id: string;
  name: string;
  daysPerWeek: number;
  priceToman: number;
  sortOrder: number;
  durationDays: number;
};

type SettingsRow = {
  id: string;
  earlyRenewalDiscountPercent?: number;
};

function forbidden(name: string) {
  return async () => {
    throw new Error(`server bootstrap must not call ${name}`);
  };
}

function createDb(seed?: {
  users?: UserRow[];
  members?: MemberRow[];
  plans?: PlanRow[];
  settings?: SettingsRow[];
}) {
  const users = [...(seed?.users ?? [])];
  const members = [...(seed?.members ?? [])];
  const plans = [...(seed?.plans ?? [])];
  const settings = [...(seed?.settings ?? [])];
  let seq = 1;

  const db = {
    users,
    members,
    plans,
    settings,
    clubSettings: {
      upsert: async (args: {
        where: { id: string };
        create: SettingsRow;
        update: Partial<SettingsRow>;
      }) => {
        const existing = settings.find((row) => row.id === args.where.id);
        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }
        settings.push({ ...args.create });
        return args.create;
      },
      deleteMany: forbidden('clubSettings.deleteMany'),
      update: forbidden('clubSettings.update'),
    },
    plan: {
      findFirst: async (args: { where: { daysPerWeek: number } }) =>
        plans.find((plan) => plan.daysPerWeek === args.where.daysPerWeek) ?? null,
      create: async (args: { data: Omit<PlanRow, 'id'> }) => {
        const row: PlanRow = { id: `plan-${seq++}`, ...args.data };
        plans.push(row);
        return row;
      },
      deleteMany: forbidden('plan.deleteMany'),
      update: forbidden('plan.update'),
    },
    user: {
      findUnique: async (args: { where: { email: string } | { phone: string } }) => {
        if ('email' in args.where) {
          return users.find((user) => user.email === args.where.email) ?? null;
        }
        return users.find((user) => user.phone === args.where.phone) ?? null;
      },
      create: async (args: {
        data: {
          fullName: string;
          phone?: string | null;
          email?: string | null;
          passwordHash?: string | null;
          role: string;
          isActive?: boolean;
          member?: { create: Omit<MemberRow, 'id' | 'userId'> };
          staffProfile?: { create: { shiftLabel?: string } };
        };
      }) => {
        const id = `user-${seq++}`;
        users.push({
          id,
          email: args.data.email ?? null,
          phone: args.data.phone ?? null,
          role: args.data.role,
          passwordHash: args.data.passwordHash ?? null,
          fullName: args.data.fullName,
        });
        if (args.data.member?.create) {
          members.push({
            id: `member-${seq++}`,
            userId: id,
            membershipCode: args.data.member.create.membershipCode,
            debtAmount: args.data.member.create.debtAmount,
            sessionGender: args.data.member.create.sessionGender,
          });
        }
        return { id };
      },
      deleteMany: forbidden('user.deleteMany'),
      update: forbidden('user.update'),
    },
    member: {
      count: async () => members.length,
      findUnique: async (args: { where: { membershipCode: string } }) =>
        members.find((member) => member.membershipCode === args.where.membershipCode) ?? null,
      deleteMany: forbidden('member.deleteMany'),
      update: forbidden('member.update'),
    },
    attendance: { deleteMany: forbidden('attendance.deleteMany'), create: forbidden('attendance.create') },
    payment: { deleteMany: forbidden('payment.deleteMany'), create: forbidden('payment.create') },
    subscription: {
      deleteMany: forbidden('subscription.deleteMany'),
      create: forbidden('subscription.create'),
    },
  };

  return db;
}

describe('bootstrapServer', () => {
  it('fills an empty database once and does not shrink it on the second run', async () => {
    const previousEnv = process.env.NODE_ENV;
    const previousDemo = process.env.DEMO_MODE;
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';
    try {
      const db = createDb();
      const first = await bootstrapServer(db);
      expect(first.membersBefore).toBe(0);
      expect(first.membersAfter).toBe(1);
      expect(first.plansCreated).toBe(4);
      expect(first.admin).toBe('created');
      expect(first.secretary).toBe('created');
      expect(first.testMember).toBe('created');
      expect(db.plans.map((plan) => plan.daysPerWeek).sort((a, b) => a - b)).toEqual([2, 3, 4, 7]);
      expect(db.members).toHaveLength(1);
      expect(db.members[0]).toMatchObject({
        membershipCode: 'FS-1001',
        debtAmount: 0,
      });
      const testUser = db.users.find((user) => user.phone === '09121234567');
      expect(testUser).toMatchObject({ fullName: 'عضو تست', role: 'MEMBER', passwordHash: null });
      const admin = db.users.find((user) => user.email === 'admin@fitclub.local');
      expect(admin?.passwordHash).toBeTruthy();
      expect(await verifySecret(SAMPLE_STAFF_PASSWORDS.admin, admin!.passwordHash!)).toBe(true);

      const snapshot = {
        members: db.members.map((member) => ({ ...member })),
        passwords: db.users.map((user) => user.passwordHash),
        prices: db.plans.map((plan) => plan.priceToman),
      };
      const second = await bootstrapServer(db);
      expect(second.membersBefore).toBe(1);
      expect(second.membersAfter).toBe(1);
      expect(second.plansCreated).toBe(0);
      expect(second.admin).toBe('kept');
      expect(second.secretary).toBe('kept');
      expect(second.testMember).toBe('kept');
      expect(db.members).toEqual(snapshot.members);
      expect(db.users.map((user) => user.passwordHash)).toEqual(snapshot.passwords);
      expect(db.plans.map((plan) => plan.priceToman)).toEqual(snapshot.prices);
    } finally {
      process.env.NODE_ENV = previousEnv;
      process.env.DEMO_MODE = previousDemo;
    }
  });

  it('keeps existing members and their debt when run twice', async () => {
    const db = createDb({
      users: [
        {
          id: 'u-sara',
          email: null,
          phone: '09121234567',
          role: 'MEMBER',
          passwordHash: null,
          fullName: 'سارا کریمی',
        },
        {
          id: 'u-ali',
          email: null,
          phone: '09121234571',
          role: 'MEMBER',
          passwordHash: null,
          fullName: 'علی رضایی',
        },
      ],
      members: [
        {
          id: 'm-sara',
          userId: 'u-sara',
          membershipCode: 'FS-1042',
          debtAmount: 0,
          sessionGender: 'WOMEN',
        },
        {
          id: 'm-ali',
          userId: 'u-ali',
          membershipCode: 'FS-1046',
          debtAmount: 725_000,
          sessionGender: 'MEN',
        },
      ],
      plans: [
        {
          id: 'p3',
          name: 'تعرفهٔ خود باشگاه',
          daysPerWeek: 3,
          priceToman: 3_000_000,
          sortOrder: 2,
          durationDays: 30,
        },
      ],
      settings: [{ id: 'default', earlyRenewalDiscountPercent: 25 }],
    });

    const before = await db.member.count();
    await bootstrapServer(db);
    await bootstrapServer(db);
    expect(await db.member.count()).toBe(before);
    expect(db.members.find((member) => member.membershipCode === 'FS-1046')?.debtAmount).toBe(
      725_000,
    );
    expect(db.users.find((user) => user.id === 'u-sara')?.fullName).toBe('سارا کریمی');
    expect(db.plans.find((plan) => plan.daysPerWeek === 3)).toMatchObject({
      name: 'تعرفهٔ خود باشگاه',
      priceToman: 3_000_000,
    });
    expect(db.plans).toHaveLength(4);
    expect(db.settings[0]?.earlyRenewalDiscountPercent).toBe(25);
    expect(db.users.some((user) => user.email === 'admin@fitclub.local')).toBe(true);
    expect(db.users.some((user) => user.email === 'secretary@fitclub.local')).toBe(true);
  });

  it('does not copy local demo stories or wipe tables', () => {
    const src = readFileSync(new URL('./server-bootstrap.ts', import.meta.url), 'utf8');
    const cli = readFileSync(new URL('../../prisma/bootstrap-server.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/deleteMany|سارا|علی رضایی|FS-1046|FS-1042/);
    expect(cli).not.toMatch(/deleteMany|seed\.ts/);
  });
});
