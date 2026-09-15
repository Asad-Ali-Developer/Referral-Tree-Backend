import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Fixed-window rate limiter backed by Redis, so the limit is shared
 * across every horizontally-scaled instance of the app (an in-memory
 * counter would only limit per-process). Keyed by IP + route to stop
 * referral-creation spam and tree/stats scraping.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limit = 30; // requests
  private readonly windowSeconds = 60; // per minute

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const routeKey = `${req.method}:${req.route?.path ?? req.url}`;
    const key = `ratelimit:${routeKey}:${ip}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, this.windowSeconds);
    }

    if (count > this.limit) {
      throw new HttpException('Too many requests, slow down.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
