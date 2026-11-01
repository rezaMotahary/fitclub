import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { parseTomanAmount } from '../../payments/dto/toman-amount.js';

export class UpdateClubSettingsDto {
  /** 0 = no early-renewal discount. Admin only. */
  @Transform(({ value }) => {
    const parsed = parseTomanAmount(value);
    return parsed ?? value;
  })
  @IsInt()
  @Min(0)
  @Max(100)
  earlyRenewalDiscountPercent!: number;
}
