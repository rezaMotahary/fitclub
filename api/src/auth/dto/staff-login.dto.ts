import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class StaffLoginDto {
  /** Email or phone of staff (secretary / admin). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  identifier!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(200)
  password!: string;
}
