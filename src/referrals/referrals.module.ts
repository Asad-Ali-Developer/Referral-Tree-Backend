import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { ReferralCodesController } from './referralscode.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReferralsController, ReferralCodesController],
  providers: [ReferralsService],
})
export class ReferralsModule {}
