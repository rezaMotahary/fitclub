import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  type Prisma,
} from '@prisma/client';
import { toAsciiDigits } from '../common/iran-mobile.js';
import { todayIran } from '../common/iran-date.js';
import {
  calendarDayOf,
  classifySubscription,
  SubscriptionRuleError,
  tuitionDebt,
} from '../common/subscription-period.js';
import { planReceptionPayment } from '../common/reception-payment.js';
import { MembersService } from '../members/members.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListPaymentsDto } from './dto/list-payments.dto.js';
import type { RecordPaymentDto } from './dto/record-payment.dto.js';

const RECEPTION_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD_READER,
  PaymentMethod.CARD_TRANSFER,
];

@Injectable()
export class PaymentsService {
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

  private assertReceptionMethod(method: PaymentMethod) {
    if (!RECEPTION_METHODS.includes(method)) {
      throw new BadRequestException({
        message:
          'روش پرداخت پذیرش فقط نقد، کارت‌خوان یا کارت‌به‌کارت است (بدون آنلاین)',
        code: 'INVALID_PAYMENT_METHOD',
      });
    }
  }

  private resolveCurrentAndUpcoming<
    T extends {
      id: string;
      startsAt: Date;
      endsAt: Date;
      priceToman: number;
      amountPaidToman: number;
      plan: { name: string };
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

  private memberDebtFromFocus(
    current: { priceToman: number; amountPaidToman: number } | null,
    upcoming: { priceToman: number; amountPaidToman: number } | null,
  ) {
    const currentDebt = current
      ? tuitionDebt(current.priceToman, current.amountPaidToman)
      : 0;
    const upcomingDebt = upcoming
      ? tuitionDebt(upcoming.priceToman, upcoming.amountPaidToman)
      : 0;
    return currentDebt + upcomingDebt;
  }

  private mapPayment(p: {
    id: string;
    memberId: string;
    subscriptionId: string | null;
    amountToman: number;
    method: PaymentMethod;
    status: PaymentStatus;
    title: string;
    paidAt: Date;
    note: string | null;
    member?: {
      membershipCode: string;
      user: { fullName: string; phone: string | null };
    };
  }) {
    return {
      id: p.id,
      memberId: p.memberId,
      subscriptionId: p.subscriptionId,
      amountToman: p.amountToman,
      method: p.method,
      status: p.status,
      title: p.title,
      paidAt: p.paidAt.toISOString(),
      note: p.note,
      member: p.member
        ? {
            membershipCode: p.member.membershipCode,
            fullName: p.member.user.fullName,
            phone: p.member.user.phone,
          }
        : undefined,
    };
  }

  async listForStaff(query: ListPaymentsDto) {
    const limit = query.limit ?? 40;
    const where: Prisma.PaymentWhereInput = {
      status: PaymentStatus.CONFIRMED,
    };

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.method) {
      where.method = query.method;
    }

    if (query.q?.trim()) {
      const raw = query.q.trim();
      const asciiQ = toAsciiDigits(raw);
      const digits = asciiQ.replace(/\D/g, '');
      where.member = {
        OR: [
          { membershipCode: { contains: asciiQ, mode: 'insensitive' } },
          { user: { fullName: { contains: raw, mode: 'insensitive' } } },
          ...(digits.length >= 3
            ? [{ user: { phone: { contains: digits } } }]
            : []),
        ],
      };
    }

    const rows = await this.prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      take: limit,
      include: {
        member: {
          select: {
            membershipCode: true,
            user: { select: { fullName: true, phone: true } },
          },
        },
      },
    });

    return rows.map((p) => this.mapPayment(p));
  }

  async listForMember(memberId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { memberId, status: PaymentStatus.CONFIRMED },
      orderBy: { paidAt: 'desc' },
      take: 50,
    });
    return rows.map((p) => this.mapPayment(p));
  }

  async recordReceptionPayment(dto: RecordPaymentDto) {
    this.assertReceptionMethod(dto.method);

    const today = todayIran();
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { startsAt: 'desc' },
        },
        user: { select: { fullName: true, phone: true } },
      },
    });

    if (!member) throw new NotFoundException('عضو پیدا نشد');
    if (member.isArchived) {
      throw new BadRequestException(
        'عضو آرشیو است؛ اول فعال‌سازی کنید، بعد پرداخت ثبت کنید',
      );
    }

    await this.members.expireStaleSubscriptions(member.id, today);

    const refreshed = await this.prisma.member.findUniqueOrThrow({
      where: { id: member.id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { startsAt: 'desc' },
        },
      },
    });

    const { current, upcoming } = this.resolveCurrentAndUpcoming(
      refreshed.subscriptions,
      today,
    );

    let target = current;
    if (dto.subscriptionId) {
      const found = refreshed.subscriptions.find(
        (s) => s.id === dto.subscriptionId,
      );
      if (!found) {
        throw new BadRequestException('اشتراک انتخاب‌شده پیدا نشد');
      }
      const phase = classifySubscription(found, today);
      if (phase !== 'current' && phase !== 'upcoming') {
        throw new BadRequestException(
          'فقط روی اشتراک جاری یا دورهٔ بعدی می‌توان قسط ثبت کرد',
        );
      }
      target = found;
    }

    if (!target) {
      throw new BadRequestException(
        'اشتراک جاری با بدهی پیدا نشد؛ اول فروش یا تمدید کنید',
      );
    }

    let plan;
    try {
      plan = planReceptionPayment({
        priceToman: target.priceToman,
        amountPaidToman: target.amountPaidToman,
        paymentAmountToman: dto.amountToman,
      });
    } catch (err) {
      this.mapRuleError(err);
    }

    const title = plan.fullySettled
      ? `تسویه شهریه ${target.plan.name}`
      : `قسط شهریه ${target.plan.name}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSub = await tx.subscription.update({
        where: { id: target.id },
        data: { amountPaidToman: plan.amountPaidAfter },
        include: { plan: true },
      });

      const payment = await tx.payment.create({
        data: {
          memberId: member.id,
          subscriptionId: target.id,
          amountToman: dto.amountToman,
          method: dto.method,
          status: PaymentStatus.CONFIRMED,
          title,
          paidAt: new Date(),
          note: dto.note?.trim() || null,
        },
      });

      // Re-resolve after update for accurate member debt cache
      const subs = refreshed.subscriptions.map((s) =>
        s.id === updatedSub.id ? updatedSub : s,
      );
      const focus = this.resolveCurrentAndUpcoming(subs, today);
      const debtAmount = this.memberDebtFromFocus(
        focus.current,
        focus.upcoming,
      );

      await tx.member.update({
        where: { id: member.id },
        data: { debtAmount },
      });

      return { payment, updatedSub, debtAmount };
    });

    const memberPublic = await this.members.findById(member.id);
    const debtBlocksEntry = memberPublic.currentSubscription
      ? memberPublic.currentSubscription.debtBlocksEntry
      : false;

    return {
      payment: this.mapPayment(result.payment),
      subscription: {
        id: result.updatedSub.id,
        priceToman: result.updatedSub.priceToman,
        amountPaidToman: result.updatedSub.amountPaidToman,
        debtToman: tuitionDebt(
          result.updatedSub.priceToman,
          result.updatedSub.amountPaidToman,
        ),
        startsOn: calendarDayOf(result.updatedSub.startsAt),
        endsOn: calendarDayOf(result.updatedSub.endsAt),
        planName: result.updatedSub.plan.name,
      },
      member: memberPublic,
      fullySettled: plan.fullySettled,
      debtBlocksEntry,
    };
  }

  async assertMemberOwns(memberId: string | null, requestedMemberId: string) {
    if (!memberId || memberId !== requestedMemberId) {
      throw new ForbiddenException('فقط سوابق پرداخت خودتان را می‌بینید');
    }
  }
}
