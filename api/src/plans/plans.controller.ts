import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { PlansService } from './plans.service.js';

@Controller('plans')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  /**
   * Active tariffs are public (site pricing). Inactive / `all` stays staff-only.
   * PATCH remains admin-only so past sales stay snapshotted.
   */
  @Get()
  @Public()
  list(@Query('all') all?: string, @CurrentUser() user?: AuthUser) {
    const wantAll = all === '1' || all === 'true';
    if (wantAll) {
      if (!user || (user.role !== Role.ADMIN && user.role !== Role.SECRETARY)) {
        throw new ForbiddenException('نقش شما برای این کار مجاز نیست');
      }
      return this.plans.list(true);
    }
    return this.plans.list(false);
  }

  @Get(':id')
  @Roles(Role.SECRETARY, Role.ADMIN)
  getOne(@Param('id') id: string) {
    return this.plans.findById(id);
  }

  /** Only admin changes tariffs (does not affect past sales). */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }
}
