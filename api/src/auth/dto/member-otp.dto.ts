import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

const IRAN_MOBILE = /^09\d{9}$/;

export class MemberOtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(IRAN_MOBILE, { message: 'phone must be a valid Iranian mobile' })
  phone!: string;
}

export class MemberOtpVerifyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(IRAN_MOBILE, { message: 'phone must be a valid Iranian mobile' })
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
