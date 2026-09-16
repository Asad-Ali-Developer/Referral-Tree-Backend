import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRootUserDto {
  @ApiProperty({
    description: "Full name of the root user",
    example: "Jane Doe",
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: "Email address of the root user",
    example: "admin@springfield.edu",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Secure password for the root user account",
    example: "SecurePass123!",
    minLength: 8,
    writeOnly: true, // Prevents the password from appearing in Swagger response examples
  })
  @IsString()
  @MinLength(8)
  password: string;
}
