import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MembersModule } from '../members/members.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [AuthModule, MembersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
