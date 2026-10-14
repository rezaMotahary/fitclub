import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto.js';
import { SellSubscriptionDto } from './dto/sell-subscription.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('subscriptions')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.SECRETARY, Role.ADMIN)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  /** New period when member has no current/upcoming subscription. */
  @Post('sell')
  sell(@Body() dto: SellSubscriptionDto) {
    return this.subscriptions.sell(dto);
  }

  /** Renew: early → day after end; after expiry → today/tomorrow. */
  @Post('renew')
  renew(@Body() dto: RenewSubscriptionDto) {
    return this.subscriptions.renew(dto);
  }
}
