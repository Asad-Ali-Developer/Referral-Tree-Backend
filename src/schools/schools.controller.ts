import { Body, Controller, Param, Post } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { CreateRootUserDto } from './dto/create-root-user.dto';

// Onboarding/admin endpoints — no tenant data is being read here, so
// there's no schoolId to guard against cross-tenant leakage. A real
// deployment would still put these behind an admin/staff role check.
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.createSchool(dto.name);
  }

  @Post(':schoolId/root-users')
  createRootUser(@Param('schoolId') schoolId: string, @Body() dto: CreateRootUserDto) {
    return this.schoolsService.createRootUser(schoolId, dto.name, dto.email, dto.password);
  }
}
