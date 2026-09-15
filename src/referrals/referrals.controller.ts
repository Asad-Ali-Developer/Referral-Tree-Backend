import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SchoolAccessGuard } from "../common/guards/school-access.guard";
import { RateLimitGuard } from "../common/guards/rate-limit.guard";
import { ReferralsService } from "./referrals.service";
import { CreateReferralDto } from "./dto/create-referral.dto";

@Controller("schools/:schoolId/referrals")
@UseGuards(JwtAuthGuard, SchoolAccessGuard, RateLimitGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  create(@Param("schoolId") schoolId: string, @Body() dto: CreateReferralDto) {
    return this.referralsService.createReferral(schoolId, dto);
  }

  @Get("tree")
  getTree(@Param("schoolId") schoolId: string, @Query("depth") depth?: string) {
    return this.referralsService.getTree(
      schoolId,
      depth ? parseInt(depth, 10) : undefined,
    );
  }

  @Get("stats")
  getStats(
    @Param("schoolId") schoolId: string,
    @Query("userId") userId?: string,
  ) {
    return this.referralsService.getStats(schoolId, userId);
  }
}
