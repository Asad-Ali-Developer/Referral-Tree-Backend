import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateSchoolDto {
  @ApiProperty({
    description: "The name of the school being created",
    example: "Springfield High School",
  })
  @IsString()
  @MinLength(1)
  name: string;
}
