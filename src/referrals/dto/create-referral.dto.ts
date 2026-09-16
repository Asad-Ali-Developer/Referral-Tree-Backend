import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateReferralDto {
  @ApiProperty({
    description: "Full name of the user being referred",
    example: "John Doe",
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: "Email address of the user being referred",
    example: "john.doe@example.com",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      "The referral code of the existing user who is inviting this new user. This identifies the referrer without exposing internal user IDs.",
    example: "ABC123XYZ",
  })
  @IsString()
  @MinLength(1)
  referralCode: string;

  @ApiProperty({
    description: "Secure password for the new user account",
    example: "SecurePass123!",
    minLength: 8,
    writeOnly: true, // Ensures the password is never displayed in Swagger example responses
  })
  @IsString()
  @MinLength(8)
  password: string;
}
