/**
 * Create or update a real staff account (admin / secretary) and sign out its old sessions.
 *
 *   STAFF_EMAIL=... STAFF_ROLE=ADMIN|SECRETARY STAFF_NAME="..." STAFF_PASSWORD=... npm run staff:set
 *
 * Optional: STAFF_PHONE=09... · STAFF_DISABLE=true (deactivate instead of setting a password).
 */
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { hashSecret } from '../src/auth/auth-crypto.js';
import { staffPasswordProblem } from '../src/auth/password-policy.js';
import {
  isValidIranMobile,
  normalizeIranMobile,
} from '../src/common/iran-mobile.js';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = required('STAFF_EMAIL').toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (process.env.STAFF_DISABLE?.trim().toLowerCase() === 'true') {
      if (!existing) throw new Error(`No account for ${email}`);
      await prisma.$transaction([
        prisma.user.update({ where: { id: existing.id }, data: { isActive: false } }),
        prisma.session.deleteMany({ where: { userId: existing.id } }),
      ]);
      console.log(`Disabled ${email} and signed out its sessions.`);
      return;
    }

    const roleRaw = required('STAFF_ROLE').toUpperCase();
    if (roleRaw !== Role.ADMIN && roleRaw !== Role.SECRETARY) {
      throw new Error('STAFF_ROLE must be ADMIN or SECRETARY');
    }
    const role = roleRaw as Role;
    const fullName = required('STAFF_NAME');
    const password = required('STAFF_PASSWORD');
    const problem = staffPasswordProblem(password);
    if (problem) throw new Error(`STAFF_PASSWORD rejected: ${problem}`);

    let phone: string | null = null;
    if (process.env.STAFF_PHONE?.trim()) {
      phone = normalizeIranMobile(process.env.STAFF_PHONE);
      if (!isValidIranMobile(phone)) throw new Error('STAFF_PHONE is not a valid Iran mobile');
    }

    if (existing && existing.role === Role.MEMBER) {
      throw new Error(`${email} belongs to a member, not staff`);
    }

    const passwordHash = await hashSecret(password);
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { role, fullName, passwordHash, isActive: true, ...(phone ? { phone } : {}) },
        })
      : await prisma.user.create({
          data: {
            email,
            phone,
            role,
            fullName,
            passwordHash,
            isActive: true,
            staffProfile: { create: {} },
          },
        });

    await prisma.session.deleteMany({ where: { userId: user.id } });
    console.log(`${existing ? 'Updated' : 'Created'} ${role} ${email}; old sessions signed out.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
