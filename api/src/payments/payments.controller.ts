import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ListPaymentsDto } from './dto/list-payments.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Reception list / member filter — secretary & admin. */
  @Get()
  @Roles(Role.SECRETARY, Role.ADMIN)
  list(@Query() query: ListPaymentsDto) {
    return this.payments.listForStaff(query);
  }

  /** Logged-in member — own payment history only. */
  @Get('me')
  @Roles(Role.MEMBER)
  listMine(@CurrentUser() user: AuthUser) {
    if (!user.memberId) {
      return [];
    }
    return this.payments.listForMember(user.memberId);
  }

  /** Manual reception payment on current (or upcoming) subscription debt. */
  @Post()
  @Roles(Role.SECRETARY, Role.ADMIN)
  record(@Body() dto: RecordPaymentDto) {
    return this.payments.recordReceptionPayment(dto);
  }
}
