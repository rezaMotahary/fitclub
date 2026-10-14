import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class StaffLoginDto {
  /** Email or phone of staff (secretary / admin). */
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
