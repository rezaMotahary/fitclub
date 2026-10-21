import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceResult,
  Role,
  SubscriptionStatus,
  type Member,
  type Plan,
  type Subscription,
  type User,
} from '@prisma/client';
import {
  evaluateEntryEligibility,
  type EligibilityResult,
} from '../common/attendance-eligibility.js';
import { resolveDurationMinutes } from '../common/attendance-duration.js';
import {
  countedDaysFromAttendances,
  weekContaining,
} from '../common/attendance-week.js';
import { iranDayString } from '../common/iran-date.js';
import {
  calendarDayOf,
  classifySubscription,
} from '../common/subscription-period.js';
import {
  iranHm,
  parseSessionSchedule,
  sessionCloseAt,
  type SessionGenderKey,
  type SessionSchedule,
} from '../common/session-schedule.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';

type MemberLoaded = Member & {
  user: Pick<User, 'fullName' | 'phone'>;
  subscriptions: Array<
    Subscription & { plan: Pick<Plan, 'id' | 'name' | 'daysPerWeek'> }
  >;
};

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSchedule(): Promise<SessionSchedule> {
    const settings = await this.prisma.clubSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
    return parseSessionSchedule(settings.sessionSchedule);
  }

  private async loadMember(memberId: string): Promise<MemberLoaded> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { fullName: true, phone: true } },
        subscriptions: {
          where: {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED],
            },
          },
          include: {
            plan: { select: { id: true, name: true, daysPerWeek: true } },
          },
          orderBy: { startsAt: 'desc' },
        },
      },
    });
    if (!member) throw new NotFoundException('عضو پیدا نشد');
    return member;
  }

  private resolveSubscription(member: MemberLoaded, today: string) {
    let current: MemberLoaded['subscriptions'][number] | null = null;
    let upcoming: MemberLoaded['subscriptions'][number] | null = null;
    for (const sub of member.subscriptions) {
      const phase = classifySubscription(sub, today);
      if (phase === 'current' && !current) current = sub;
      if (phase === 'upcoming' && !upcoming) upcoming = sub;
    }
    return { current, upcoming };
  }

  private async weekAttendances(memberId: string, weekStart: string, weekEnd: string) {
    const start = new Date(`${weekStart}T00:00:00+03:30`);
    const endExclusive = new Date(`${weekEnd}T00:00:00+03:30`);
    endExclusive.setTime(endExclusive.getTime() + 86_400_000);
    return this.prisma.attendance.findMany({
      where: {
        memberId,
        checkInAt: { gte: start, lt: endExclusive },
      },
    });
  }

  private async findOpenAttendance(memberId: string) {
    return this.prisma.attendance.findFirst({
      where: {
        memberId,
        result: AttendanceResult.SUCCESS,
        checkOutAt: null,
        voidedAt: null,
      },
      orderBy: { checkInAt: 'desc' },
    });
  }

  /**
   * Close open SUCCESS attendances whose gender session has ended.
   * checkOutAt = configured session close (not "now").
   */
  async autoCloseOpenAttendances(now: Date = new Date()) {
    const schedule = await this.getSchedule();
    const open = await this.prisma.attendance.findMany({
      where: {
        result: AttendanceResult.SUCCESS,
        checkOutAt: null,
        voidedAt: null,
      },
      include: {
        member: { select: { sessionGender: true } },
      },
    });

    const closed: string[] = [];
    for (const row of open) {
      const day = iranDayString(row.checkInAt);
      const gender = row.member.sessionGender as SessionGenderKey;
      const closeAt = sessionCloseAt(schedule, gender, day);
      if (!closeAt) continue;
      if (now.getTime() < closeAt.getTime()) continue;
      if (row.checkInAt.getTime() > closeAt.getTime()) continue;

      const durationMinutes = Math.max(
        0,
        Math.floor((closeAt.getTime() - row.checkInAt.getTime()) / 60_000),
      );

      await this.prisma.attendance.update({
        where: { id: row.id },
        data: {
          checkOutAt: closeAt,
          durationMinutes,
          closedAutomatically: true,
        },
      });
      closed.push(row.id);
    }
    return { closedCount: closed.length, closedIds: closed };
  }

  async evaluateMember(
    memberId: string,
    now: Date = new Date(),
  ): Promise<{
    member: ReturnType<AttendanceService['mapMemberBrief']>;
    eligibility: EligibilityResult;
    openAttendance: ReturnType<AttendanceService['mapAttendance']> | null;
    weekly: {
      startDay: string;
      endDay: string;
      countedDays: string[];
      weeklyCap: number;
      remaining: number;
    };
  }> {
    await this.autoCloseOpenAttendances(now);
    const member = await this.loadMember(memberId);
    const today = iranDayString(now);
    const hmNow = iranHm(now);
    const schedule = await this.getSchedule();
    const week = weekContaining(today);
    const { current, upcoming } = this.resolveSubscription(member, today);
    const weeklyCap = current?.plan.daysPerWeek ?? upcoming?.plan.daysPerWeek ?? 0;
    const weekRows = await this.weekAttendances(
      memberId,
      week.startDay,
      week.endDay,
    );
    const countedDays = countedDaysFromAttendances(weekRows, week);
    const open = await this.findOpenAttendance(memberId);

    const eligibility = evaluateEntryEligibility({
      today,
      hmNow,
      now,
      isArchived: member.isArchived,
      sessionGender: member.sessionGender as SessionGenderKey,
      schedule,
      week,
      weeklyCap,
      countedDays,
      hasOpenAttendance: Boolean(open),
      subscription: current
        ? {
            startsAt: current.startsAt,
            endsAt: current.endsAt,
            priceToman: current.priceToman,
            amountPaidToman: current.amountPaidToman,
          }
        : null,
      upcomingStartsOn: upcoming ? calendarDayOf(upcoming.startsAt) : null,
    });

    return {
      member: this.mapMemberBrief(member, current),
      eligibility,
      openAttendance: open ? this.mapAttendance(open) : null,
      weekly: {
        startDay: week.startDay,
        endDay: week.endDay,
        countedDays,
        weeklyCap,
        remaining: Math.max(0, weeklyCap - countedDays.length),
      },
    };
  }

  async checkIn(memberId: string, staff: AuthUser, now: Date = new Date()) {
    if (staff.role !== Role.SECRETARY) {
      throw new ForbiddenException('ثبت ورود فقط برای منشی است');
    }

    await this.autoCloseOpenAttendances(now);
    const snapshot = await this.evaluateMember(memberId, now);
    const { eligibility, member } = snapshot;

    if (!eligibility.allowed) {
      const rejected = await this.prisma.attendance.create({
        data: {
          memberId,
          checkInAt: now,
          result: eligibility.attendanceResult!,
          rejectReason: eligibility.denyMessage,
          recordedById: staff.id,
        },
      });
      return {
        ok: false as const,
        eligibility,
        attendance: this.mapAttendance(rejected),
        member,
      };
    }

    const created = await this.prisma.attendance.create({
      data: {
        memberId,
        checkInAt: now,
        result: AttendanceResult.SUCCESS,
        recordedById: staff.id,
      },
    });

    return {
      ok: true as const,
      eligibility,
      attendance: this.mapAttendance(created),
      member,
    };
  }

  async checkOut(
    params: { attendanceId?: string; memberId?: string },
    staff: AuthUser,
    now: Date = new Date(),
  ) {
    if (staff.role !== Role.SECRETARY) {
      throw new ForbiddenException('ثبت خروج فقط برای منشی است');
    }

    await this.autoCloseOpenAttendances(now);

    let row =
      params.attendanceId != null
        ? await this.prisma.attendance.findUnique({
            where: { id: params.attendanceId },
          })
        : params.memberId != null
          ? await this.findOpenAttendance(params.memberId)
          : null;

    if (!row) {
      throw new NotFoundException('حضور باز پیدا نشد');
    }
    if (row.result !== AttendanceResult.SUCCESS || row.voidedAt) {
      throw new BadRequestException('این رکورد قابل خروج نیست');
    }
    if (row.checkOutAt) {
      throw new BadRequestException('برای این حضور قبلاً خروج ثبت شده');
    }

    const durationMinutes = Math.max(
      0,
      Math.floor((now.getTime() - row.checkInAt.getTime()) / 60_000),
    );

    const updated = await this.prisma.attendance.update({
      where: { id: row.id },
      data: {
        checkOutAt: now,
        durationMinutes,
        closedAutomatically: false,
      },
    });

    return {
      ok: true as const,
      attendance: this.mapAttendance(updated),
    };
  }

  async voidAttendance(
    attendanceId: string,
    staff: AuthUser,
    reason: string | undefined,
    now: Date = new Date(),
  ) {
    if (staff.role !== Role.SECRETARY && staff.role !== Role.ADMIN) {
      throw new ForbiddenException('ابطال حضور مجاز نیست');
    }

    const row = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });
    if (!row) throw new NotFoundException('حضور پیدا نشد');
    if (row.voidedAt) {
      throw new BadRequestException('این حضور قبلاً باطل شده');
    }
    if (row.result !== AttendanceResult.SUCCESS) {
      throw new BadRequestException('فقط حضور موفق قابل ابطال است');
    }

    const checkInDay = iranDayString(row.checkInAt);
    const today = iranDayString(now);
    if (checkInDay !== today) {
      throw new BadRequestException(
        'ابطال فقط تا پایان همان روز تقویمی مجاز است',
      );
    }

    const updated = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        voidedAt: now,
        voidedById: staff.id,
        voidReason: reason?.trim() || null,
      },
    });

    return { ok: true as const, attendance: this.mapAttendance(updated) };
  }

  async todayLog(now: Date = new Date()) {
    await this.autoCloseOpenAttendances(now);
    const today = iranDayString(now);
    const start = new Date(`${today}T00:00:00+03:30`);
    const end = new Date(start.getTime() + 86_400_000);

    const rows = await this.prisma.attendance.findMany({
      where: { checkInAt: { gte: start, lt: end } },
      include: {
        member: {
          select: {
            membershipCode: true,
            user: { select: { fullName: true } },
          },
        },
        recordedBy: { select: { fullName: true, role: true } },
        voidedBy: { select: { fullName: true, role: true } },
      },
      orderBy: { checkInAt: 'desc' },
    });

    const successOpen = rows.filter(
      (r) =>
        r.result === AttendanceResult.SUCCESS &&
        !r.voidedAt &&
        !r.checkOutAt,
    ).length;
    const successClosed = rows.filter(
      (r) =>
        r.result === AttendanceResult.SUCCESS &&
        !r.voidedAt &&
        r.checkOutAt,
    ).length;
    const rejected = rows.filter(
      (r) => r.result !== AttendanceResult.SUCCESS,
    ).length;
    const voided = rows.filter((r) => r.voidedAt).length;

    return {
      day: today,
      stats: {
        checkInsToday: successOpen + successClosed,
        insideNow: successOpen,
        rejectedToday: rejected,
        voidedToday: voided,
      },
      items: rows.map((r) => ({
        ...this.mapAttendance(r),
        memberName: r.member.user.fullName,
        membershipCode: r.member.membershipCode,
        recordedByName: r.recordedBy?.fullName ?? null,
        voidedByName: r.voidedBy?.fullName ?? null,
      })),
    };
  }

  async insideNow(now: Date = new Date()) {
    await this.autoCloseOpenAttendances(now);
    const rows = await this.prisma.attendance.findMany({
      where: {
        result: AttendanceResult.SUCCESS,
        checkOutAt: null,
        voidedAt: null,
      },
      include: {
        member: {
          select: {
            membershipCode: true,
            sessionGender: true,
            user: { select: { fullName: true, phone: true } },
          },
        },
      },
      orderBy: { checkInAt: 'asc' },
    });

    return {
      count: rows.length,
      items: rows.map((r) => ({
        attendance: this.mapAttendance(r),
        member: {
          id: r.memberId,
          membershipCode: r.member.membershipCode,
          fullName: r.member.user.fullName,
          phone: r.member.user.phone,
          sessionGender: r.member.sessionGender,
        },
        elapsedSeconds: Math.max(
          0,
          Math.floor((now.getTime() - r.checkInAt.getTime()) / 1000),
        ),
      })),
    };
  }

  private mapMemberBrief(
    member: MemberLoaded,
    current: MemberLoaded['subscriptions'][number] | null,
  ) {
    return {
      id: member.id,
      membershipCode: member.membershipCode,
      fullName: member.user.fullName,
      phone: member.user.phone,
      sessionGender: member.sessionGender,
      isArchived: member.isArchived,
      debtAmount: member.debtAmount,
      coachName: member.coachName,
      currentPlanName: current?.plan.name ?? null,
      currentPlanDaysPerWeek: current?.plan.daysPerWeek ?? null,
      subscriptionEndsOn: current ? calendarDayOf(current.endsAt) : null,
    };
  }

  private mapAttendance(row: {
    id: string;
    memberId: string;
    checkInAt: Date;
    checkOutAt: Date | null;
    durationMinutes: number | null;
    result: AttendanceResult;
    rejectReason: string | null;
    closedAutomatically: boolean;
    voidReason: string | null;
    voidedAt: Date | null;
    recordedById: string | null;
    voidedById: string | null;
  }) {
    return {
      id: row.id,
      memberId: row.memberId,
      checkInAt: row.checkInAt.toISOString(),
      checkOutAt: row.checkOutAt?.toISOString() ?? null,
      durationMinutes: resolveDurationMinutes({
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
        storedMinutes: row.durationMinutes,
      }),
      result: row.result,
      rejectReason: row.rejectReason,
      closedAutomatically: row.closedAutomatically,
      voidReason: row.voidReason,
      voidedAt: row.voidedAt?.toISOString() ?? null,
      isVoided: Boolean(row.voidedAt),
      isOpen:
        row.result === AttendanceResult.SUCCESS &&
        !row.checkOutAt &&
        !row.voidedAt,
      recordedById: row.recordedById,
      voidedById: row.voidedById,
    };
  }
}
