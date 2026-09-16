import { Body, Controller, Param, Post } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from "@nestjs/swagger";
import { SchoolsService } from "./schools.service";
import { CreateSchoolDto } from "./dto/create-school.dto";
import { CreateRootUserDto } from "./dto/create-root-user.dto";

// Onboarding/admin endpoints — no tenant data is being read here, so
// there's no schoolId to guard against cross-tenant leakage. A real
// deployment would still put these behind an admin/staff role check.
@Controller("schools")
@ApiTags("Schools (Admin)")
@ApiBearerAuth() // Recommended if these endpoints require an admin JWT token
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new school" })
  @ApiBody({ type: CreateSchoolDto })
  @ApiResponse({ status: 201, description: "School created successfully" })
  @ApiResponse({ status: 400, description: "Bad request (invalid DTO data)" })
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.createSchool(dto.name);
  }

  @Post(":schoolId/root-users")
  @ApiOperation({ summary: "Create a root user for a specific school" })
  @ApiParam({ name: "schoolId", description: "The ID of the school" })
  @ApiBody({ type: CreateRootUserDto })
  @ApiResponse({ status: 201, description: "Root user created successfully" })
  @ApiResponse({ status: 400, description: "Bad request (invalid DTO data)" })
  @ApiResponse({ status: 404, description: "School not found" })
  createRootUser(
    @Param("schoolId") schoolId: string,
    @Body() dto: CreateRootUserDto,
  ) {
    return this.schoolsService.createRootUser(
      schoolId,
      dto.name,
      dto.email,
      dto.password,
    );
  }
}
