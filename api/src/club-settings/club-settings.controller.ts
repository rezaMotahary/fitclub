import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { ClubSettingsService } from './club-settings.service.js';
import { UpdateClubSettingsDto } from './dto/update-club-settings.dto.js';

@Controller('club-settings')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ClubSettingsController {
  constructor(private readonly settings: ClubSettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SECRETARY)
  get() {
    return this.settings.get();
  }

  @Patch()
  @Roles(Role.ADMIN)
  update(@Body() dto: UpdateClubSettingsDto) {
    return this.settings.updateEarlyRenewalDiscount(
      dto.earlyRenewalDiscountPercent,
    );
  }
}
