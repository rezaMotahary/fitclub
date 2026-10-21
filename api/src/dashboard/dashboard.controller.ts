import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(SessionAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** Logged-in member — only own subscription / attendance / payments. */
  @Get('me')
  @Roles(Role.MEMBER)
  me(@CurrentUser() user: AuthUser) {
    return this.dashboard.memberSelf(user);
  }

  /** Admin club snapshot — active members, today visits, expiry, reception revenue. */
  @Get('admin')
  @Roles(Role.ADMIN)
  admin(@CurrentUser() user: AuthUser) {
    return this.dashboard.adminOverview(user);
  }
}
