import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Referral Codes")
@Controller("referral-codes")
export class ReferralCodesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":referralCode")
  @ApiOperation({ summary: "Get information about a specific referral code" })
  @ApiParam({
    name: "referralCode",
    description: "The unique referral code to look up",
    type: String,
    example: "ABC123XYZ",
  })
  @ApiResponse({
    status: 200,
    description: "Referral code information retrieved successfully",
    schema: {
      type: "object",
      properties: {
        referrerName: { type: "string", example: "Jane Doe" },
        schoolId: { type: "string", example: "sch_123456789" },
        referralCode: { type: "string", example: "ABC123XYZ" },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Referral code not found",
  })
  async getReferralCodeInfo(@Param("referralCode") referralCode: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        referralCode,
      },
      select: {
        name: true,
        schoolId: true,
        referralCode: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Referral code not found");
    }

    return {
      referrerName: user.name,
      schoolId: user.schoolId,
      referralCode: user.referralCode,
    };
  }
}
