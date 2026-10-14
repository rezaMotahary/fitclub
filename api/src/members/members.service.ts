import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, SubscriptionStatus } from '@prisma/client';
import {
  calendarDayOf,
  classifySubscription,
  debtBlocksEntryForSubscription,
  remainingDaysInclusive,
  tuitionDebt,
} from '../common/subscription-period.js';
import { todayIran } from '../common/iran-date.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMemberDto } from './dto/create-member.dto.js';

const memberDetailInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      isActive: true,
    },
  },
  subscriptions: {
    include: { plan: true },
    orderBy: { startsAt: 'desc' as const },
  },
} satisfies Prisma.MemberInclude;

type MemberDetail = Prisma.MemberGetPayload<{
  include: typeof memberDetailInclude;
}>;

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async nextMembershipCode(): Promise<string> {
    const rows = await this.prisma.member.findMany({
      select: { membershipCode: true },
    });
    let max = 1000;
    for (const row of rows) {
      const n = Number(String(row.membershipCode).replace(/^FS-/i, ''));
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `FS-${max + 1}`;
  }

  async search(params: {
    q?: string;
    limit?: number;
    includeArchived?: boolean;
  }) {
    const limit = params.limit ?? 30;
    const q = params.q?.trim() ?? '';
    const includeArchived = params.includeArchived ?? false;

    const where: Prisma.MemberWhereInput = {
      ...(includeArchived ? {} : { isArchived: false }),
    };

    if (q) {
      const digits = q.replace(/\D/g, '');
      where.OR = [
        { membershipCode: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        ...(digits.length >= 3
          ? [{ user: { phone: { contains: digits } } }]
          : []),
      ];
    }

    const members = await this.prisma.member.findMany({
      where,
      take: limit,
      orderBy: { membershipCode: 'asc' },
      include: memberDetailInclude,
    });

    return members.map((m) => this.toSummary(m));
  }

  async findById(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: memberDetailInclude,
    });
    if (!member) throw new NotFoundException('عضو پیدا نشد');
    return this.toDetail(member);
  }

  async create(dto: CreateMemberDto) {
    const phone = dto.phone.trim();
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('این موبایل قبلاً ثبت شده است');
    }

    const membershipCode = await this.nextMembershipCode();

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        phone,
        role: Role.MEMBER,
        isActive: true,
        member: {
          create: {
            membershipCode,
            sessionGender: dto.sessionGender,
            coachName: dto.coachName?.trim() || null,
            notes: dto.notes?.trim() || null,
          },
        },
      },
      include: {
        member: { include: memberDetailInclude },
      },
    });

    if (!user.member) {
      throw new BadRequestException('ساخت عضو ناموفق بود');
    }

    const full = await this.prisma.member.findUniqueOrThrow({
      where: { id: user.member.id },
      include: memberDetailInclude,
    });
    return this.toDetail(full);
  }

  async archive(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('عضو پیدا نشد');
    if (member.isArchived) {
      return this.findById(id);
    }

    await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id },
        data: { isArchived: true },
      }),
      this.prisma.user.update({
        where: { id: member.userId },
        data: { isActive: false },
      }),
    ]);

    return this.findById(id);
  }

  async activate(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('عضو پیدا نشد');
    if (!member.isArchived) {
      return this.findById(id);
    }

    await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id },
        data: { isArchived: false },
      }),
      this.prisma.user.update({
        where: { id: member.userId },
        data: { isActive: true },
      }),
    ]);

    return this.findById(id);
  }

  private subscriptionPublic(
    sub: MemberDetail['subscriptions'][number],
    today: string,
  ) {
    const startsOn = calendarDayOf(sub.startsAt);
    const endsOn = calendarDayOf(sub.endsAt);
    const phase = classifySubscription(sub, today);
    const debt = tuitionDebt(sub.priceToman, sub.amountPaidToman);

    return {
      id: sub.id,
      status: sub.status,
      phase,
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
      debtToman: debt,
      remainingDays: remainingDaysInclusive(endsOn, today),
      debtBlocksEntry: debtBlocksEntryForSubscription(sub, today),
    };
  }

  private pickCurrentAndUpcoming(
    subscriptions: MemberDetail['subscriptions'],
    today: string,
  ) {
    let current: MemberDetail['subscriptions'][number] | null = null;
    let upcoming: MemberDetail['subscriptions'][number] | null = null;

    for (const sub of subscriptions) {
      const phase = classifySubscription(sub, today);
      if (phase === 'current' && !current) current = sub;
      if (phase === 'upcoming' && !upcoming) upcoming = sub;
    }

    return { current, upcoming };
  }

  toSummary(member: MemberDetail) {
    const today = todayIran();
    const { current, upcoming } = this.pickCurrentAndUpcoming(
      member.subscriptions,
      today,
    );
    const focus = current ?? upcoming ?? member.subscriptions[0] ?? null;
    const debt = focus
      ? tuitionDebt(focus.priceToman, focus.amountPaidToman)
      : member.debtAmount;

    return {
      id: member.id,
      membershipCode: member.membershipCode,
      fullName: member.user.fullName,
      phone: member.user.phone,
      sessionGender: member.sessionGender,
      isArchived: member.isArchived,
      coachName: member.coachName,
      debtAmount: debt,
      currentPlanName: focus?.plan.name ?? null,
      currentPhase: focus ? classifySubscription(focus, today) : null,
      subscriptionEndsOn: focus ? calendarDayOf(focus.endsAt) : null,
    };
  }

  toDetail(member: MemberDetail) {
    const today = todayIran();
    const { current, upcoming } = this.pickCurrentAndUpcoming(
      member.subscriptions,
      today,
    );
    const focus = current ?? upcoming;
    const debt = focus
      ? tuitionDebt(focus.priceToman, focus.amountPaidToman)
      : member.debtAmount;

    return {
      id: member.id,
      membershipCode: member.membershipCode,
      fullName: member.user.fullName,
      phone: member.user.phone,
      email: member.user.email,
      sessionGender: member.sessionGender,
      isArchived: member.isArchived,
      coachName: member.coachName,
      notes: member.notes,
      joinedAt: member.joinedAt,
      debtAmount: debt,
      currentSubscription: current
        ? this.subscriptionPublic(current, today)
        : null,
      upcomingSubscription: upcoming
        ? this.subscriptionPublic(upcoming, today)
        : null,
      subscriptions: member.subscriptions.map((s) =>
        this.subscriptionPublic(s, today),
      ),
    };
  }

  /** Mark past ACTIVE rows as EXPIRED when their end day has passed. */
  async expireStaleSubscriptions(memberId: string, today = todayIran()) {
    const active = await this.prisma.subscription.findMany({
      where: { memberId, status: SubscriptionStatus.ACTIVE },
    });
    const staleIds = active
      .filter((s) => classifySubscription(s, today) === 'expired')
      .map((s) => s.id);
    if (staleIds.length === 0) return;
    await this.prisma.subscription.updateMany({
      where: { id: { in: staleIds } },
      data: { status: SubscriptionStatus.EXPIRED },
    });
  }
}
