import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { rateLimits } from '../common/rate-limits.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE_NAME } from './auth.constants.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { MemberOtpRequestDto, MemberOtpVerifyDto } from './dto/member-otp.dto.js';
import { StaffLoginDto } from './dto/staff-login.dto.js';
import { RolesGuard } from './guards/roles.guard.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import type { AuthUser } from './auth.types.js';
import {
  SESSION_COOKIE_CLEAR_PATHS,
  sessionCookieOptions,
} from './session-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private cookieName(): string {
    return process.env.SESSION_COOKIE_NAME ?? SESSION_COOKIE_NAME;
  }

  private setSessionCookie(
    res: Response,
    token: string,
    expiresAt: Date,
  ): void {
    res.cookie(
      this.cookieName(),
      token,
      sessionCookieOptions('/', process.env.NODE_ENV, expiresAt),
    );
  }

  private clearSessionCookie(res: Response): void {
    const name = this.cookieName();
    for (const path of SESSION_COOKIE_CLEAR_PATHS) {
      res.clearCookie(name, sessionCookieOptions(path, process.env.NODE_ENV));
    }
  }

  @Post('staff/login')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: rateLimits.staffLoginPerMinute,
      ttl: 60_000,
      blockDuration: 5 * 60_000,
    },
  })
  async staffLogin(
    @Body() dto: StaffLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.loginStaff(dto.identifier, dto.password);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return { user: result.user };
  }

  @Post('member/otp/request')
  @HttpCode(200)
  @Throttle({
    default: { limit: rateLimits.otpRequestPerMinute, ttl: 60_000 },
  })
  async requestMemberOtp(@Body() dto: MemberOtpRequestDto) {
    return this.auth.requestMemberOtp(dto.phone);
  }

  @Post('member/otp/verify')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: rateLimits.otpVerifyPerMinute,
      ttl: 60_000,
      blockDuration: 5 * 60_000,
    },
  })
  async verifyMemberOtp(
    @Body() dto: MemberOtpVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyMemberOtp(dto.phone, dto.code);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[this.cookieName()] as string | undefined;
    await this.auth.destroySession(raw);
    this.clearSessionCookie(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user: this.auth.toPublicUser(user) };
  }

  /** RBAC smoke endpoint — secretary + admin only. */
  @Get('staff/ping')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.SECRETARY, Role.ADMIN)
  staffPing(@CurrentUser() user: AuthUser) {
    return { ok: true, role: user.role };
  }

  /** RBAC smoke endpoint — admin only. */
  @Get('admin/ping')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminPing(@CurrentUser() user: AuthUser) {
    return { ok: true, role: user.role };
  }
}
