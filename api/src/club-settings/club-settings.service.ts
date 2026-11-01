import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ClubSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.clubSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
    return this.toPublic(settings);
  }

  async updateEarlyRenewalDiscount(percent: number) {
    const settings = await this.prisma.clubSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', earlyRenewalDiscountPercent: percent },
      update: { earlyRenewalDiscountPercent: percent },
    });
    return this.toPublic(settings);
  }

  private toPublic(settings: {
    earlyRenewalDiscountPercent: number;
    updatedAt: Date;
  }) {
    return {
      earlyRenewalDiscountPercent: settings.earlyRenewalDiscountPercent,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
