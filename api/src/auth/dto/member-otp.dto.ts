import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import {
  normalizeIranMobile,
  normalizeOtpCode,
} from '../../common/iran-mobile.js';

const IRAN_MOBILE = /^09\d{9}$/;

function toIranMobile(value: unknown): unknown {
  return typeof value === 'string' ? normalizeIranMobile(value) : value;
}

function toOtpCode(value: unknown): unknown {
  return typeof value === 'string' ? normalizeOtpCode(value) : value;
}

export class MemberOtpRequestDto {
  @Transform(({ value }) => toIranMobile(value))
  @IsString()
  @IsNotEmpty()
  @Matches(IRAN_MOBILE, { message: 'phone must be a valid Iranian mobile' })
  phone!: string;
}

export class MemberOtpVerifyDto {
  @Transform(({ value }) => toIranMobile(value))
  @IsString()
  @IsNotEmpty()
  @Matches(IRAN_MOBILE, { message: 'phone must be a valid Iranian mobile' })
  phone!: string;

  @Transform(({ value }) => toOtpCode(value))
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}
