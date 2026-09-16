import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CreateReferralDto } from "./dto/create-referral.dto";

const SALT_ROUNDS = 10;

export interface TreeRow {
  id: string;
  name: string;
  referredById: string | null;
  level: number;
}

export interface StatsRow {
  id: string;
  referredById: string | null;
  level: number;
}

export interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
}

// Max depth for recursive CTE queries to prevent infinite loops on malformed data.
const MAX_DEPTH = 50;

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async assertSchoolExists(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException(`School ${schoolId} not found`);
    return school;
  }

  async createReferral(schoolId: string, dto: CreateReferralDto) {
    await this.assertSchoolExists(schoolId);

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: dto.referralCode },
    });
    if (!referrer) {
      throw new NotFoundException("Referral code not found");
    }

    // Ensure the referrer belongs to the same school.
    if (referrer.schoolId !== schoolId) {
      throw new BadRequestException(
        "Referral code does not belong to this school",
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      // Prevent self-referral.
      if (existing.id === referrer.id) {
        throw new BadRequestException("A user cannot refer themselves");
      }
      throw new ConflictException("A user with this email already exists");
    }

    const [referralCode, passwordHash] = await Promise.all([
      this.generateUniqueReferralCode(),
      bcrypt.hash(dto.password, SALT_ROUNDS),
    ]);

    // Circular referrals are structurally impossible here since referredById
    // is only set at creation and points to an existing user. If a "re-parent"
    // feature is added later, it must check the ancestor chain to prevent cycles.
    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          schoolId,
          referralCode,
          referredById: referrer.id,
        },
      });

      // A user can only be referred once. This is enforced by the DB unique
      // constraint on Referral.referredUserId, preventing race conditions.
      await tx.referral.create({
        data: {
          schoolId,
          referrerId: referrer.id,
          referredUserId: newUser.id,
        },
      });

      return newUser;
    });

    // Invalidate cached tree/stats for this school.
    await this.redis.bumpSchoolCacheVersion(schoolId);

    return result;
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

  async getTree(schoolId: string, depth?: number) {
    await this.assertSchoolExists(schoolId);
    const effectiveDepth =
      depth && depth > 0 ? Math.min(depth, MAX_DEPTH) : MAX_DEPTH;

    const cacheKey = await this.cacheKey(schoolId, `tree:${effectiveDepth}`);
    return this.redis.remember(cacheKey, 30, async () => {
      // Fetch the entire tree up to `depth` in a single query to avoid N+1 problems.
      // The recursive CTE handles the heavy lifting in Postgres.
      const rows = await this.prisma.$queryRaw<TreeRow[]>`
        WITH RECURSIVE tree AS (
          SELECT id, name, "referredById", 0 AS level
          FROM "User"
          WHERE "schoolId" = ${schoolId} AND "referredById" IS NULL
          UNION ALL
          SELECT u.id, u.name, u."referredById", t.level + 1
          FROM "User" u
          INNER JOIN tree t ON u."referredById" = t.id
          WHERE t.level < ${effectiveDepth}
        )
        SELECT id, name, "referredById", level FROM tree ORDER BY level, id;
      `;
      return this.buildForest(rows);
    });
  }

  async getStats(schoolId: string, userId?: string) {
    await this.assertSchoolExists(schoolId);

    const cacheKey = await this.cacheKey(schoolId, `stats:${userId ?? "all"}`);
    return this.redis.remember(cacheKey, 30, async () => {
      return userId
        ? this.getStatsForUser(schoolId, userId)
        : this.getStatsForSchool(schoolId);
    });
  }

  /** Get referral stats for a specific user and their downline. */
  private async getStatsForUser(schoolId: string, userId: string) {
    const root = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });
    if (!root) throw new NotFoundException("User not found in this school");

    const rows = await this.prisma.$queryRaw<StatsRow[]>`
      WITH RECURSIVE tree AS (
        SELECT id, "referredById", 0 AS level
        FROM "User"
        WHERE id = ${userId}
        UNION ALL
        SELECT u.id, u."referredById", t.level + 1
        FROM "User" u
        INNER JOIN tree t ON u."referredById" = t.id
        WHERE t.level < ${MAX_DEPTH}
      )
      SELECT id, "referredById", level FROM tree WHERE level > 0;
    `;

    return this.summarize(rows);
  }

  /** Get aggregated referral stats for the entire school. */
  private async getStatsForSchool(schoolId: string) {
    const rows = await this.prisma.$queryRaw<StatsRow[]>`
      WITH RECURSIVE tree AS (
        SELECT id, "referredById", 0 AS level
        FROM "User"
        WHERE "schoolId" = ${schoolId} AND "referredById" IS NULL
        UNION ALL
        SELECT u.id, u."referredById", t.level + 1
        FROM "User" u
        INNER JOIN tree t ON u."referredById" = t.id
        WHERE t.level < ${MAX_DEPTH}
      )
      SELECT id, "referredById", level FROM tree WHERE level > 0;
    `;

    return this.summarize(rows);
  }

  private summarize(rows: StatsRow[]) {
    const referralsByLevel: Record<number, number> = {};
    for (const row of rows) {
      referralsByLevel[row.level] = (referralsByLevel[row.level] ?? 0) + 1;
    }
    return {
      directReferrals: referralsByLevel[1] ?? 0,
      totalReferrals: rows.length,
      referralsByLevel,
    };
  }

  private buildForest(rows: TreeRow[]): TreeNode[] {
    const nodes = new Map<string, TreeNode>();
    for (const row of rows) {
      nodes.set(row.id, { id: row.id, name: row.name, children: [] });
    }
    const roots: TreeNode[] = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      if (row.referredById && nodes.has(row.referredById)) {
        nodes.get(row.referredById)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  private async cacheKey(schoolId: string, suffix: string) {
    const version = await this.redis.getSchoolCacheVersion(schoolId);
    return `school:${schoolId}:v${version}:${suffix}`;
  }
}
