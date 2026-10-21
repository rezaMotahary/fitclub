import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { parseTomanAmount } from './toman-amount.js';

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
