import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    PrismaModule,
    // Secrets/TTLs are overridden per-call in TokensService (access vs
    // refresh need different values), so this default registration
    // just satisfies JwtModule's setup requirement.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, JwtAuthGuard],
  exports: [JwtAuthGuard, TokensService],
})
export class AuthModule {}
