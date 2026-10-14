import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RenewSubscriptionDto {
  @IsString()
  memberId!: string;

  @IsString()
  planId!: string;

  /**
   * Only when the previous period has already ended.
   * Must be today or tomorrow. Ignored for early renewal
   * (always day after current end).
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountPaidToman!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
