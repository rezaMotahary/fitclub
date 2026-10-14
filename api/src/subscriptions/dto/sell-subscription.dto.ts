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

export class SellSubscriptionDto {
  @IsString()
  memberId!: string;

  @IsString()
  planId!: string;

  /** YYYY-MM-DD — today or tomorrow only. Defaults to today. */
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
