import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './guards/roles.guard.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';

@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, RolesGuard],
  exports: [AuthService, SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
