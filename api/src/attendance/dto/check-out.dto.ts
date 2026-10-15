import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CheckOutDto {
  @ValidateIf((o: CheckOutDto) => !o.memberId)
  @IsString()
  @MinLength(1)
  attendanceId?: string;

  @ValidateIf((o: CheckOutDto) => !o.attendanceId)
  @IsString()
  @MinLength(1)
  memberId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
