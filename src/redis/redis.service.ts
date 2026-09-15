import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    super(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  async onModuleDestroy() {
    await this.quit();
  }

  /**
   * Cache-aside helper used by tree/stats reads: return the cached
   * value if present, otherwise compute it, store it with a TTL, and
   * return it.
   */
  async remember<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    const value = await fn();
    await this.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  }

  /**
   * Per-school cache "version" bumped on every write. Cache keys embed
   * the version, so invalidation is a single INCR instead of a
   * production-unsafe KEYS/SCAN + DEL sweep, and stale entries just
   * age out of Redis on their own TTL.
   */
  async getSchoolCacheVersion(schoolId: string): Promise<number> {
    const v = await this.get(`school:${schoolId}:cache-version`);
    return v ? parseInt(v, 10) : 0;
  }

  async bumpSchoolCacheVersion(schoolId: string): Promise<void> {
    await this.incr(`school:${schoolId}:cache-version`);
  }
}
