import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { parseTomanAmount } from '../../payments/dto/toman-amount.js';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** Sample / admin tariff in toman — only admin may change. */
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseTomanAmount(value);
    return parsed ?? value;
  })
  @IsInt()
  @Min(0)
  priceToman?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
