import { describe, expect, it } from 'vitest';
import { PlansService } from './plans.service.js';

describe('PlansService.toPublic', () => {
  const service = new PlansService({} as never);

  it('exposes readable sample price and weekly cap', () => {
    const publicPlan = service.toPublic({
      id: 'p1',
      name: '۳ روز در هفته',
      daysPerWeek: 3,
      priceToman: 1_190_000,
      durationDays: 30,
      isActive: true,
      sortOrder: 2,
    });

    expect(publicPlan.weeklyCap).toBe(3);
    expect(publicPlan.priceLabel).toContain('تومان');
    expect(publicPlan.priceToman).toBe(1_190_000);
  });
});
