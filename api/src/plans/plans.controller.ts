import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { PlansService } from './plans.service.js';

@Controller('plans')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  /** List sample tariffs — secretary sells with current prices; admin may see inactive. */
  @Get()
  @Roles(Role.SECRETARY, Role.ADMIN)
  list(@Query('all') all?: string) {
    const includeInactive = all === '1' || all === 'true';
    return this.plans.list(includeInactive);
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
