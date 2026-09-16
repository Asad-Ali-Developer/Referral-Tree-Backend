import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

const SALT_ROUNDS = 10;

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  createSchool(name: string) {
    return this.prisma.school.create({ data: { name } });
  }

  /**
   * Creates a root user for a given school.
   * Root users have no referrer (referredById is null) and act as the
   * starting point for the school's referral tree. This is intended
   * for admin or initial onboarding use.
   */
  async createRootUser(
    schoolId: string,
    name: string,
    email: string,
    password: string,
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException("School not found");

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const [referralCode, passwordHash] = await Promise.all([
      this.generateUniqueReferralCode(),
      bcrypt.hash(password, SALT_ROUNDS),
    ]);

    return this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        schoolId,
        referralCode,
        referredById: null,
      },
    });
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = nanoid(8).toUpperCase();
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (!existing) return code;
    }
    throw new ConflictException(
      "Could not generate a unique referral code, please retry",
    );
  }
}
