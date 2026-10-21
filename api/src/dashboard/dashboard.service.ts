import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceResult,
  PaymentStatus,
  Role,
  type PaymentMethod,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types.js';
import { resolveDurationMinutes } from '../common/attendance-duration.js';
import {
  countedDaysFromAttendances,
  weekContaining,
} from '../common/attendance-week.js';
import {
  buildMemberNotices,
  weekCalendarDays,
} from '../common/dashboard-notices.js';
import {
  addIranDays,
  dayStringToUtcNoon,
  iranDayString,
} from '../common/iran-date.js';
import { iranMonthLabel, isSameIranMonth } from '../common/iran-month.js';
import {
  calendarDayOf,
  classifySubscription,
  debtBlocksEntryForSubscription,
  remainingDaysInclusive,
  tuitionDebt,
} from '../common/subscription-period.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async memberSelf(user: AuthUser, now: Date = new Date()) {
    if (user.role !== Role.MEMBER || !user.memberId) {
      throw new ForbiddenException('فقط عضو می‌تواند داشبورد خودش را ببیند');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: user.memberId },
      include: {
        user: { select: { fullName: true, phone: true, email: true } },
        subscriptions: {
          include: { plan: true },
          orderBy: { startsAt: 'desc' },
        },
      },
    });
    if (!member) throw new NotFoundException('عضو پیدا نشد');

    const today = iranDayString(now);
    const week = weekContaining(today);

    const current =
      member.subscriptions.find(
        (s) => classifySubscription(s, today) === 'current',
      ) ?? null;
    const upcoming =
      member.subscriptions.find(
        (s) => classifySubscription(s, today) === 'upcoming',
      ) ?? null;

    const weeklyCap = current?.plan.daysPerWeek ?? 0;

    const weekStartAt = new Date(`${week.startDay}T00:00:00+03:30`);
    const weekEndExclusive = new Date(`${week.endDay}T00:00:00+03:30`);
    weekEndExclusive.setTime(weekEndExclusive.getTime() + 86_400_000);

    const weekRows = await this.prisma.attendance.findMany({
      where: {
        memberId: member.id,
        checkInAt: {
          gte: weekStartAt,
          lt: weekEndExclusive,
        },
      },
    });
    const countedDays = countedDaysFromAttendances(weekRows, week);
    const remainingWeekDays = Math.max(0, weeklyCap - countedDays.length);
    const todayAlreadyCounted = countedDays.includes(today);

    const recentRows = await this.prisma.attendance.findMany({
      where: {
        memberId: member.id,
        result: AttendanceResult.SUCCESS,
      },
      orderBy: { checkInAt: 'desc' },
      take: 12,
      include: {
        recordedBy: { select: { fullName: true } },
      },
    });

    const paymentRows = await this.prisma.payment.findMany({
      where: { memberId: member.id },
      orderBy: { paidAt: 'desc' },
      take: 20,
    });

    const remainingDays = current
      ? remainingDaysInclusive(calendarDayOf(current.endsAt), today)
      : null;
    const debtToman = current
      ? tuitionDebt(current.priceToman, current.amountPaidToman)
      : member.debtAmount;
    const debtBlocks = current
      ? debtBlocksEntryForSubscription(current, today)
      : false;

    const notices = buildMemberNotices({
      hasCurrentSubscription: Boolean(current),
      remainingDays,
      hasUpcomingRenewal: Boolean(upcoming),
      debtToman,
      debtBlocksEntry: debtBlocks,
      weeklyCap,
      remainingWeekDays,
      todayAlreadyCounted,
    });

    return {
      profile: {
        id: member.id,
        membershipCode: member.membershipCode,
        fullName: member.user.fullName,
        phone: member.user.phone,
        email: member.user.email,
        sessionGender: member.sessionGender,
        coachName: member.coachName,
        isArchived: member.isArchived,
      },
      subscription: current
        ? {
            planName: current.plan.name,
            weeklyCap: current.plan.daysPerWeek,
            startsOn: calendarDayOf(current.startsAt),
            endsOn: calendarDayOf(current.endsAt),
            remainingDays,
            phase: 'current' as const,
            priceToman: current.priceToman,
            amountPaidToman: current.amountPaidToman,
            debtToman,
          }
        : null,
      upcomingSubscription: upcoming
        ? {
            planName: upcoming.plan.name,
            weeklyCap: upcoming.plan.daysPerWeek,
            startsOn: calendarDayOf(upcoming.startsAt),
            endsOn: calendarDayOf(upcoming.endsAt),
            phase: 'upcoming' as const,
          }
        : null,
      weekly: {
        startDay: week.startDay,
        endDay: week.endDay,
        weeklyCap,
        countedDays,
        usedDays: countedDays.length,
        remaining: remainingWeekDays,
        calendar: weekCalendarDays({
          startDay: week.startDay,
          countedDays,
          today,
          addIranDays,
        }),
      },
      notices,
      recentAttendance: recentRows.map((r) => ({
        id: r.id,
        checkInAt: r.checkInAt.toISOString(),
        checkOutAt: r.checkOutAt?.toISOString() ?? null,
        durationMinutes: resolveDurationMinutes({
          checkInAt: r.checkInAt,
          checkOutAt: r.checkOutAt,
          storedMinutes: r.durationMinutes,
        }),
        closedAutomatically: r.closedAutomatically,
        isVoided: Boolean(r.voidedAt),
        isOpen: r.result === AttendanceResult.SUCCESS && !r.checkOutAt && !r.voidedAt,
        recordedByName: r.recordedBy?.fullName ?? null,
      })),
      payments: paymentRows.map((p) => this.mapPayment(p)),
    };
  }

  async adminOverview(_user: AuthUser, now: Date = new Date()) {
    const today = iranDayString(now);
    const dayStart = dayStringToUtcNoon(today);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const [activeMembers, todayRows, membersWithSubs, payments] =
      await Promise.all([
        this.prisma.member.count({ where: { isArchived: false } }),
        this.prisma.attendance.findMany({
          where: {
            checkInAt: { gte: dayStart, lt: dayEnd },
          },
          select: {
            result: true,
            checkOutAt: true,
            voidedAt: true,
          },
        }),
        this.prisma.member.findMany({
          where: { isArchived: false },
          include: {
            user: { select: { fullName: true } },
            subscriptions: {
              include: { plan: { select: { name: true, daysPerWeek: true } } },
              orderBy: { startsAt: 'desc' },
            },
          },
        }),
        this.prisma.payment.findMany({
          where: { status: PaymentStatus.CONFIRMED },
          select: { amountToman: true, paidAt: true },
        }),
      ]);

    const checkInsToday = todayRows.filter(
      (r) => r.result === AttendanceResult.SUCCESS && !r.voidedAt,
    ).length;
    const insideNow = await this.prisma.attendance.count({
      where: {
        result: AttendanceResult.SUCCESS,
        checkOutAt: null,
        voidedAt: null,
      },
    });
    const rejectedToday = todayRows.filter(
      (r) => r.result !== AttendanceResult.SUCCESS,
    ).length;

    const expiringSoon: Array<{
      id: string;
      membershipCode: string;
      fullName: string;
      planName: string;
      endsOn: string;
      remainingDays: number;
    }> = [];

    for (const m of membersWithSubs) {
      const current = m.subscriptions.find(
        (s) => classifySubscription(s, today) === 'current',
      );
      if (!current) continue;
      const upcoming = m.subscriptions.find(
        (s) => classifySubscription(s, today) === 'upcoming',
      );
      if (upcoming) continue;
      const endsOn = calendarDayOf(current.endsAt);
      const remaining = remainingDaysInclusive(endsOn, today);
      if (remaining >= 1 && remaining <= 14) {
        expiringSoon.push({
          id: m.id,
          membershipCode: m.membershipCode,
          fullName: m.user.fullName,
          planName: current.plan.name,
          endsOn,
          remainingDays: remaining,
        });
      }
    }
    expiringSoon.sort((a, b) => a.remainingDays - b.remainingDays);

    const monthPayments = payments.filter((p) => isSameIranMonth(p.paidAt, now));
    const amountToman = monthPayments.reduce((sum, p) => sum + p.amountToman, 0);

    return {
      activeMembers,
      attendanceToday: {
        day: today,
        checkInsToday,
        insideNow,
        rejectedToday,
      },
      expiringSoon,
      receptionRevenueThisMonth: {
        amountToman,
        paymentCount: monthPayments.length,
        monthLabel: iranMonthLabel(now),
      },
    };
  }

  private mapPayment(p: {
    id: string;
    title: string;
    amountToman: number;
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: Date;
    note: string | null;
  }) {
    return {
      id: p.id,
      title: p.title,
      amountToman: p.amountToman,
      method: p.method,
      status: p.status,
      paidAt: p.paidAt.toISOString(),
      note: p.note,
    };
  }
}
