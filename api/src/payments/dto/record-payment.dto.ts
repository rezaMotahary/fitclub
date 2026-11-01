import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { MAX_TOMAN_AMOUNT, parseTomanAmount } from './toman-amount.js';

export class RecordPaymentDto {
  @IsString()
  memberId!: string;

  /** Optional — defaults to current subscription with debt. */
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @Transform(({ value }) => {
    const parsed = parseTomanAmount(value);
    return parsed ?? value;
  })
  @IsInt()
  @Min(1)
  @Max(MAX_TOMAN_AMOUNT)
  amountToman!: number;

  /** Reception only: cash / card reader / card-to-card (no online). */
  @IsIn([
    PaymentMethod.CASH,
    PaymentMethod.CARD_READER,
    PaymentMethod.CARD_TRANSFER,
  ])
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
