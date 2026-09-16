import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SchoolAccessGuard } from "../common/guards/school-access.guard";
import { RateLimitGuard } from "../common/guards/rate-limit.guard";
import { ReferralsService } from "./referrals.service";
import { CreateReferralDto } from "./dto/create-referral.dto";

@Controller("schools/:schoolId/referrals")
@UseGuards(JwtAuthGuard, SchoolAccessGuard, RateLimitGuard)
@ApiTags("Referrals") // Groups these endpoints under the "Referrals" tag in Swagger UI
@ApiBearerAuth() // Indicates that these routes require a Bearer Token (JWT)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new referral" })
  @ApiParam({ name: "schoolId", description: "The ID of the school" })
  @ApiBody({ type: CreateReferralDto })
  @ApiResponse({ status: 201, description: "Referral created successfully" })
  @ApiResponse({ status: 400, description: "Bad request (invalid DTO data)" })
  create(@Param("schoolId") schoolId: string, @Body() dto: CreateReferralDto) {
    return this.referralsService.createReferral(schoolId, dto);
  }

  @Get("tree")
  @ApiOperation({ summary: "Get the referral tree structure" })
  @ApiParam({ name: "schoolId", description: "The ID of the school" })
  @ApiQuery({
    name: "depth",
    required: false,
    description: "Depth of the tree to retrieve",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Referral tree retrieved successfully",
  })
  getTree(@Param("schoolId") schoolId: string, @Query("depth") depth?: string) {
    return this.referralsService.getTree(
      schoolId,
      depth ? parseInt(depth, 10) : undefined,
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "Get referral statistics" })
  @ApiParam({ name: "schoolId", description: "The ID of the school" })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Filter statistics by a specific user ID",
  })
  @ApiResponse({
    status: 200,
    description: "Referral stats retrieved successfully",
  })
  getStats(
    @Param("schoolId") schoolId: string,
    @Query("userId") userId?: string,
  ) {
    return this.referralsService.getStats(schoolId, userId);
  }
}
