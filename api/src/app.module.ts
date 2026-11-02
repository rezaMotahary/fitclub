import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RATE_LIMIT_MESSAGE, rateLimits } from './common/rate-limits.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MembersModule } from './members/members.module.js';
import { PlansModule } from './plans/plans.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ClubSettingsModule } from './club-settings/club-settings.module.js';
import { SmsModule } from './sms/sms.module.js';
import { DisableEtagService } from './common/disable-etag.service.js';
import { NoStoreMiddleware } from './common/no-store.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      errorMessage: RATE_LIMIT_MESSAGE,
      throttlers: [
        { name: 'default', ttl: 60_000, limit: rateLimits.apiPerMinute },
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    MembersModule,
    PlansModule,
    SubscriptionsModule,
    AttendanceModule,
    PaymentsModule,
    DashboardModule,
    ClubSettingsModule,
    SmsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DisableEtagService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(NoStoreMiddleware).forRoutes('{*splat}');
  }
}
