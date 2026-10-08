import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Connect lazily when DB is available; don't crash boot if Postgres is not ready yet.
    try {
      await this.$connect();
    } catch (error) {
      console.warn(
        '[Prisma] Database not reachable yet. API will start; connect after Postgres is ready.',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
