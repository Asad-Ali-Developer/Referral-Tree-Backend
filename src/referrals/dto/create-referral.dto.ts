import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateReferralDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  // Identifies the referrer. Referral codes are unique per-user, so
  // this is the natural way for a new signup to say "who invited me"
  // without exposing internal user IDs.
  @IsString()
  @MinLength(1)
  referralCode: string;

  @IsString()
  @MinLength(8)
  password: string;
}
