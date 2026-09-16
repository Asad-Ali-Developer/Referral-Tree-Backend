import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator"; // <-- Add this import

export class LoginDto {
  @ApiProperty({
    example: "admin@springfield.edu",
    description: "User email address",
  })
  @IsEmail({}, { message: "Please provide a valid email address" }) // <-- Add this
  email: string;

  @ApiProperty({
    example: "SecurePass123!",
    description: "User password",
  })
  @IsString() // <-- Add this
  @MinLength(6, { message: "Password must be at least 6 characters long" }) // <-- Add this
  password: string;
}
