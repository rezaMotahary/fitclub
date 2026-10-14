import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MembersModule } from '../members/members.module.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Module({
  imports: [AuthModule, MembersModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
