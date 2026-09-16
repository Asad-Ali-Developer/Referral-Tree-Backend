import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request } from "express";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    schoolId: string;
  };
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({
    summary: "Authenticate user and return access/refresh tokens",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login successful, tokens returned",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request (invalid input format)",
  })
  @ApiResponse({ status: 401, description: "Invalid email or password" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token using a valid refresh token" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: "Tokens refreshed successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request (missing refresh token)",
  })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() // Indicates this specific route requires a JWT Bearer token
  @ApiOperation({ summary: "Get current authenticated user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized (missing or invalid token)",
  })
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user.id);
  }
}
