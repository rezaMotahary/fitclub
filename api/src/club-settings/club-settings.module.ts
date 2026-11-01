import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClubSettingsController } from './club-settings.controller.js';
import { ClubSettingsService } from './club-settings.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ClubSettingsController],
  providers: [ClubSettingsService],
  exports: [ClubSettingsService],
})
export class ClubSettingsModule {}
