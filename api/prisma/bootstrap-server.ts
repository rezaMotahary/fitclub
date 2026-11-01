/**
 * Teaching-server bootstrap. Safe to run more than once.
 * Adds starter tariffs and the three test logins only when they are missing.
 * Does not remove members, payments, attendance, or subscriptions.
 *
 *   npm run bootstrap:server
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { bootstrapServer } from '../src/bootstrap/server-bootstrap.js';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction((tx) => bootstrapServer(tx), {
    timeout: 20_000,
  });
  console.log('FitClub server bootstrap complete:', result);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
