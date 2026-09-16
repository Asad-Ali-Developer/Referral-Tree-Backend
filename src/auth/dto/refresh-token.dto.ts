import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator"; // <-- Add this import

export class RefreshTokenDto {
  @ApiProperty({
    description: "The refresh token previously issued during login",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString({ message: "Refresh token must be a string" }) // <-- Add this
  @IsNotEmpty({ message: "Refresh token cannot be empty" }) // <-- Add this
  refreshToken: string;
}
