import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("referral-codes")
export class ReferralCodesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":referralCode")
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
