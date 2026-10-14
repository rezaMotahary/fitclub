import { describe, expect, it } from 'vitest';
import { dayStringToUtcNoon } from '../common/iran-date.js';
import { MembersService } from './members.service.js';

describe('MembersService mapping', () => {
  const service = new MembersService({} as never);

  it('summarizes member with half-paid debt on a current period', () => {
    const startsOn = '2026-10-05';
    const endsOn = '2026-11-03';

    const summary = service.toSummary({
      id: 'm1',
      membershipCode: 'FS-1045',
      userId: 'u1',
      birthDate: null,
      sessionGender: 'MEN',
      joinedAt: new Date(),
      debtAmount: 445_000,
      coachName: null,
      notes: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'u1',
        fullName: 'حسین نوری',
        phone: '09121234570',
        email: null,
        isActive: true,
      },
      subscriptions: [
        {
          id: 's1',
          memberId: 'm1',
          planId: 'p1',
          status: 'ACTIVE',
          startsAt: dayStringToUtcNoon(startsOn),
          endsAt: dayStringToUtcNoon(endsOn),
          priceToman: 890_000,
          amountPaidToman: 445_000,
          discountPercentApplied: 0,
          autoRenewHint: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          plan: {
            id: 'p1',
            name: '۲ روز در هفته',
            daysPerWeek: 2,
            priceToman: 890_000,
            durationDays: 30,
            isActive: true,
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    } as never);

    expect(summary.membershipCode).toBe('FS-1045');
    expect(summary.debtAmount).toBe(445_000);
    expect(summary.currentPhase).toBe('current');
  });

  // Keep today coupling out of unit map — detail debtBlocksEntry uses live todayIran().
  it('marks archived flag on summary', () => {
    const summary = service.toSummary({
      id: 'm2',
      membershipCode: 'FS-1099',
      userId: 'u2',
      birthDate: null,
      sessionGender: 'WOMEN',
      joinedAt: new Date(),
      debtAmount: 0,
      coachName: null,
      notes: null,
      isArchived: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'u2',
        fullName: 'عضو آرشیو',
        phone: '09129990000',
        email: null,
        isActive: false,
      },
      subscriptions: [],
    } as never);

    expect(summary.isArchived).toBe(true);
    expect(summary.currentPlanName).toBeNull();
  });
});
