import { SessionGender } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { normalizeIranMobile } from '../../common/iran-mobile.js';

export class CreateMemberDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranMobile(value) : value,
  )
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
