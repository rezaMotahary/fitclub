import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdatePlanDto } from './dto/update-plan.dto.js';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false) {
    const plans = await this.prisma.plan.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { daysPerWeek: 'asc' }],
    });

    return plans.map((p) => this.toPublic(p));
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('پلن پیدا نشد');
    return this.toPublic(plan);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('پلن پیدا نشد');

    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.priceToman !== undefined ? { priceToman: dto.priceToman } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return this.toPublic(plan);
  }

  toPublic(plan: {
    id: string;
    name: string;
    daysPerWeek: number;
    priceToman: number;
    durationDays: number;
    isActive: boolean;
    sortOrder: number;
  }) {
    return {
      id: plan.id,
      name: plan.name,
      daysPerWeek: plan.daysPerWeek,
      /** Weekly cap: «هر روز» = 7 */
      weeklyCap: plan.daysPerWeek,
      priceToman: plan.priceToman,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      /** Human-readable sample price for panels */
      priceLabel: `${plan.priceToman.toLocaleString('fa-IR')} تومان`,
    };
  }
}
