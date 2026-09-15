import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';

const SALT_ROUNDS = 10;

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  createSchool(name: string) {
    return this.prisma.school.create({ data: { name } });
  }

  /**
   * Creates a user with no referrer — i.e. a tree root (like Ahmed in
   * the example). The referral flow can only attach a new user to an
   * EXISTING referrer, so every school needs at least one root created
   * this way (an admin/onboarding action) before referrals can start.
   */
  async createRootUser(schoolId: string, name: string, email: string, password: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const [referralCode, passwordHash] = await Promise.all([
      this.generateUniqueReferralCode(),
      bcrypt.hash(password, SALT_ROUNDS),
    ]);

    return this.prisma.user.create({
      data: { name, email, passwordHash, schoolId, referralCode, referredById: null },
    });
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = nanoid(8).toUpperCase();
      const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
      if (!existing) return code;
    }
    throw new ConflictException('Could not generate a unique referral code, please retry');
  }
}
