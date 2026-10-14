import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SessionGender } from '@prisma/client';

export class CreateMemberDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'موبایل باید ۱۱ رقم و با ۰۹ شروع شود',
  })
  phone!: string;

  @IsEnum(SessionGender)
  sessionGender!: SessionGender;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  coachName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
