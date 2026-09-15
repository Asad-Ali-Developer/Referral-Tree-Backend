import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface TokenPayload {
  sub: string; // userId
  schoolId: string;
  type: 'access' | 'refresh';
}

/**
 * Access and refresh tokens are signed with DIFFERENT secrets and
 * carry a `type` claim. That means a leaked/expired refresh token
 * can't be replayed as an access token even if someone tries — it
 * simply fails signature verification against the access secret.
 *
 * Deliberately minimal: refresh tokens are stateless JWTs, not stored
 * server-side. That means there's no logout/revocation and no
 * reuse-detection on rotation — a refresh token is valid for its full
 * TTL no matter what. That's an acceptable tradeoff for this scope;
 * the natural next step if revocation is needed is a RefreshToken
 * table storing a hash of each issued token, checked (and marked used)
 * on every refresh call.
 */
@Injectable()
export class TokensService {
  private readonly accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me';
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me';
  private readonly accessTtl = '15m';
  private readonly refreshTtl = '7d';

  constructor(private readonly jwt: JwtService) {}

  private signAccessToken(userId: string, schoolId: string) {
    const payload: TokenPayload = { sub: userId, schoolId, type: 'access' };
    return this.jwt.signAsync(payload, { secret: this.accessSecret, expiresIn: this.accessTtl });
  }

  private signRefreshToken(userId: string, schoolId: string) {
    const payload: TokenPayload = { sub: userId, schoolId, type: 'refresh' };
    return this.jwt.signAsync(payload, { secret: this.refreshSecret, expiresIn: this.refreshTtl });
  }

  async issueTokenPair(userId: string, schoolId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(userId, schoolId),
      this.signRefreshToken(userId, schoolId),
    ]);
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwt.verifyAsync(token, { secret: this.accessSecret });
  }

  verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.jwt.verifyAsync(token, { secret: this.refreshSecret });
  }
}
