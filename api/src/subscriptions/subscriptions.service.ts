import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import {
  dayStringToUtcNoon,
  isValidDayString,
  todayIran,
} from '../common/iran-date.js';
import {
  assertMinimumPayment,
  assertStartTodayOrTomorrow,
  calendarDayOf,
  classifySubscription,
  computeRenewalPricing,
  earlyRenewalStartDay,
  periodFromStartDay,
  SubscriptionRuleError,
  tuitionDebt,
} from '../common/subscription-period.js';
import { MembersService } from '../members/members.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RenewSubscriptionDto } from './dto/renew-subscription.dto.js';
import type { SellSubscriptionDto } from './dto/sell-subscription.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
  ) {}

  private mapRuleError(err: unknown): never {
    if (err instanceof SubscriptionRuleError) {
      throw new BadRequestException({ message: err.message, code: err.code });
    }
    throw err;
  }

  private async getSettings() {
    return this.prisma.clubSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  private async loadMemberOrThrow(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { startsAt: 'desc' } },
        user: { select: { fullName: true, phone: true } },
      },
    });
    if (!member) throw new NotFoundException('عضو پیدا نشد');
    return member;
  }

  private async loadActivePlanOrThrow(planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('پلن فعال پیدا نشد');
    }
    return plan;
  }

  private resolveCurrentAndUpcoming<
    T extends {
      startsAt: Date;
      endsAt: Date;
      priceToman: number;
      amountPaidToman: number;
    },
  >(subscriptions: T[], today: string) {
    let current: T | null = null;
    let upcoming: T | null = null;
    for (const sub of subscriptions) {
      const phase = classifySubscription(sub, today);
      if (phase === 'current' && !current) current = sub;
      if (phase === 'upcoming' && !upcoming) upcoming = sub;
    }
    return { current, upcoming };
  }

  async sell(dto: SellSubscriptionDto) {
    const today = todayIran();
    const startsOn = dto.startsOn ?? today;
    if (!isValidDayString(startsOn)) {
      throw new BadRequestException('تاریخ شروع نامعتبر است');
    }

    try {
      assertStartTodayOrTomorrow(startsOn, today);
    } catch (err) {
      this.mapRuleError(err);
    }

    const member = await this.loadMemberOrThrow(dto.memberId);
    if (member.isArchived) {
      throw new BadRequestException(
        'عضو آرشیو است؛ اول فعال‌سازی کنید، بعد اشتراک بفروشید',
      );
    }

    await this.members.expireStaleSubscriptions(member.id, today);
    const refreshed = await this.loadMemberOrThrow(dto.memberId);
    const { current, upcoming } = this.resolveCurrentAndUpcoming(
      refreshed.subscriptions,
      today,
    );

    if (current || upcoming) {
      throw new BadRequestException(
        'این عضو دورهٔ جاری یا بعدی دارد؛ برای دورهٔ بعد از تمدید استفاده کنید',
      );
    }

    const plan = await this.loadActivePlanOrThrow(dto.planId);
    const priceToman = plan.priceToman;

    try {
      assertMinimumPayment(priceToman, dto.amountPaidToman);
    } catch (err) {
      this.mapRuleError(err);
    }

    const { startsOn: s, endsOn } = periodFromStartDay(startsOn);
    const debt = tuitionDebt(priceToman, dto.amountPaidToman);
    const method = dto.paymentMethod ?? PaymentMethod.CASH;

    const created = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startsAt: dayStringToUtcNoon(s),
          endsAt: dayStringToUtcNoon(endsOn),
          priceToman,
          amountPaidToman: dto.amountPaidToman,
          discountPercentApplied: 0,
        },
        include: { plan: true },
      });

      await tx.payment.create({
        data: {
          memberId: member.id,
          subscriptionId: subscription.id,
          amountToman: dto.amountPaidToman,
          method,
          status: PaymentStatus.CONFIRMED,
          title: `فروش اشتراک ${plan.name}`,
          paidAt: new Date(),
        },
      });

      await tx.member.update({
        where: { id: member.id },
        data: { debtAmount: debt },
      });

      return subscription;
    });

    return {
      subscription: this.toPublic(created, today),
      member: await this.members.findById(member.id),
    };
  }

  async renew(dto: RenewSubscriptionDto) {
    const today = todayIran();
    const member = await this.loadMemberOrThrow(dto.memberId);
    if (member.isArchived) {
      throw new BadRequestException(
        'عضو آرشیو است؛ اول فعال‌سازی کنید، بعد تمدید کنید',
      );
    }

    await this.members.expireStaleSubscriptions(member.id, today);
    const refreshed = await this.loadMemberOrThrow(dto.memberId);
    const { current, upcoming } = this.resolveCurrentAndUpcoming(
      refreshed.subscriptions,
      today,
    );

    if (upcoming) {
      throw new BadRequestException(
        'دورهٔ بعدی از قبل ثبت شده؛ تا شروع آن تمدید دوباره مجاز نیست',
      );
    }

    const latest =
      current ??
      refreshed.subscriptions.find(
        (s) => classifySubscription(s, today) === 'expired',
      ) ??
      refreshed.subscriptions[0];

    if (!latest) {
      throw new BadRequestException(
        'اشتراک قبلی پیدا نشد؛ برای عضو جدید از فروش استفاده کنید',
      );
    }

    const renewingBeforeCurrentEnds = Boolean(current);
    let startsOn: string;

    if (renewingBeforeCurrentEnds && current) {
      startsOn = earlyRenewalStartDay(calendarDayOf(current.endsAt));
      if (dto.startsOn && dto.startsOn !== startsOn) {
        throw new BadRequestException(
          'تمدید زودتر همیشه از فردای پایان دوره شروع می‌شود؛ نمی‌توان فاصله گذاشت',
        );
      }
    } else {
      startsOn = dto.startsOn ?? today;
      if (!isValidDayString(startsOn)) {
        throw new BadRequestException('تاریخ شروع نامعتبر است');
      }
      try {
        assertStartTodayOrTomorrow(startsOn, today);
      } catch (err) {
        this.mapRuleError(err);
      }
    }

    const plan = await this.loadActivePlanOrThrow(dto.planId);
    const settings = await this.getSettings();
    const pricing = computeRenewalPricing({
      planPriceToman: plan.priceToman,
      earlyRenewalDiscountPercent: settings.earlyRenewalDiscountPercent,
      renewingBeforeCurrentEnds,
    });

    try {
      assertMinimumPayment(pricing.priceToman, dto.amountPaidToman);
    } catch (err) {
      this.mapRuleError(err);
    }

    const { startsOn: s, endsOn } = periodFromStartDay(startsOn);
    const debt = tuitionDebt(pricing.priceToman, dto.amountPaidToman);
    const method = dto.paymentMethod ?? PaymentMethod.CASH;

    const created = await this.prisma.$transaction(async (tx) => {
      if (!renewingBeforeCurrentEnds) {
        await tx.subscription.updateMany({
          where: {
            memberId: member.id,
            status: SubscriptionStatus.ACTIVE,
          },
          data: { status: SubscriptionStatus.EXPIRED },
        });
      }

      const subscription = await tx.subscription.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startsAt: dayStringToUtcNoon(s),
          endsAt: dayStringToUtcNoon(endsOn),
          priceToman: pricing.priceToman,
          amountPaidToman: dto.amountPaidToman,
          discountPercentApplied: pricing.discountPercentApplied,
        },
        include: { plan: true },
      });

      await tx.payment.create({
        data: {
          memberId: member.id,
          subscriptionId: subscription.id,
          amountToman: dto.amountPaidToman,
          method,
          status: PaymentStatus.CONFIRMED,
          title: `تمدید اشتراک ${plan.name}`,
          paidAt: new Date(),
          note:
            pricing.discountPercentApplied > 0
              ? `تخفیف تمدید زودتر ${pricing.discountPercentApplied}٪`
              : null,
        },
      });

      // Keep member debt as max of current unpaid + new unpaid focus
      const currentDebt = current
        ? tuitionDebt(current.priceToman, current.amountPaidToman)
        : 0;
      await tx.member.update({
        where: { id: member.id },
        data: {
          debtAmount: renewingBeforeCurrentEnds
            ? currentDebt + debt
            : debt,
        },
      });

      return subscription;
    });

    return {
      subscription: this.toPublic(created, today),
      member: await this.members.findById(member.id),
    };
  }

  toPublic(
    sub: {
      id: string;
      status: SubscriptionStatus;
      startsAt: Date;
      endsAt: Date;
      priceToman: number;
      amountPaidToman: number;
      discountPercentApplied: number;
      plan: { id: string; name: string; daysPerWeek: number };
    },
    today = todayIran(),
  ) {
    const startsOn = calendarDayOf(sub.startsAt);
    const endsOn = calendarDayOf(sub.endsAt);
    return {
      id: sub.id,
      status: sub.status,
      phase: classifySubscription(sub, today),
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        daysPerWeek: sub.plan.daysPerWeek,
        weeklyCap: sub.plan.daysPerWeek,
      },
      startsOn,
      endsOn,
      priceToman: sub.priceToman,
      amountPaidToman: sub.amountPaidToman,
      discountPercentApplied: sub.discountPercentApplied,
      debtToman: tuitionDebt(sub.priceToman, sub.amountPaidToman),
    };
  }
}
