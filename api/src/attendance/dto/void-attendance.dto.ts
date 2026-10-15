import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoidAttendanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
