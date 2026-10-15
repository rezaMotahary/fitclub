import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { AttendanceService } from './attendance.service.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { CheckOutDto } from './dto/check-out.dto.js';
import { VoidAttendanceDto } from './dto/void-attendance.dto.js';

@Controller('attendance')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.SECRETARY, Role.ADMIN)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /** Eligibility + open visit + weekly share for one member. */
  @Get('eligibility/:memberId')
  eligibility(@Param('memberId') memberId: string) {
    return this.attendance.evaluateMember(memberId);
  }

  /** Today's log (includes rejected attempts). */
  @Get('today')
  today() {
    return this.attendance.todayLog();
  }

  /** Members currently inside (open SUCCESS, not voided). */
  @Get('inside')
  inside() {
    return this.attendance.insideNow();
  }

  /** Secretary only — check in (or log rejection with reason). */
  @Post('check-in')
  @Roles(Role.SECRETARY)
  @HttpCode(200)
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: AuthUser) {
    return this.attendance.checkIn(dto.memberId, user);
  }

  /** Secretary only — manual check-out. */
  @Post('check-out')
  @Roles(Role.SECRETARY)
  @HttpCode(200)
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: AuthUser) {
    return this.attendance.checkOut(
      { attendanceId: dto.attendanceId, memberId: dto.memberId },
      user,
    );
  }

  /** Run auto-close (also runs on today/inside/eligibility). */
  @Post('auto-close')
  @HttpCode(200)
  autoClose() {
    return this.attendance.autoCloseOpenAttendances();
  }

  /** Void until end of same Iran calendar day — secretary + admin. */
  @Post(':id/void')
  @HttpCode(200)
  voidOne(
    @Param('id') id: string,
    @Body() dto: VoidAttendanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendance.voidAttendance(id, user, dto.reason);
  }
}
