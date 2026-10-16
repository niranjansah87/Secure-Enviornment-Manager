/**
 * Redis-backed distributed rate limiting.
 * Uses sliding window algorithm (INCR + TTL).
 * Survives process restarts, works across multiple instances.
 *
 * Keys are explicitly namespaced — never user-controlled.
 */
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infra/redis/redis.module';
import { RedisKeys } from '../../infra/redis/redis.service';
import { MetricsService } from '../../infra/observability/metrics.service';

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly metrics: MetricsService,
  ) {}

  private readonly fallback = new Map<string, { count: number; resetAt: number }>();

  /**
   * Increment attempt counter for a key.
   * @returns { count, isBlocked }
   */
  async recordAttempt(
    key: string,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<{ count: number; isBlocked: boolean }> {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return { count, isBlocked: count > maxAttempts };
    } catch {
      const now = Date.now();
      const entry = this.fallback.get(key);
      if (!entry || entry.resetAt <= now) {
        this.fallback.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        return { count: 1, isBlocked: false };
      }
      entry.count++;
      return { count: entry.count, isBlocked: entry.count > maxAttempts };
    }
  }

  async isBlocked(key: string, maxAttempts: number): Promise<boolean> {
    try {
      const count = await this.redis.get(key);
      return count !== null && parseInt(count, 10) > maxAttempts;
    } catch {
      const entry = this.fallback.get(key);
      return Boolean(entry && entry.resetAt > Date.now() && entry.count > maxAttempts);
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // ignore
    }
    this.fallback.delete(key);
  }

  async getRemainingAttempts(key: string, maxAttempts: number): Promise<number> {
    try {
      const count = parseInt((await this.redis.get(key)) ?? '0', 10);
      return Math.max(0, maxAttempts - count);
    } catch {
      const entry = this.fallback.get(key);
      const count = entry && entry.resetAt > Date.now() ? entry.count : 0;
      return Math.max(0, maxAttempts - count);
    }
  }

  // ── Convenience methods for specific endpoints ──────────────────

  async recordLoginAttempt(ip: string, maxAttempts: number, windowSeconds: number) {
    const key = RedisKeys.rateLimitLogin(ip);
    const result = await this.recordAttempt(key, maxAttempts, windowSeconds);
    if (result.isBlocked) {
      this.metrics.rateLimitEventsTotal.inc({ endpoint: 'login' });
    }
    return result;
  }

  async isLoginBlocked(ip: string, maxAttempts: number): Promise<boolean> {
    return this.isBlocked(RedisKeys.rateLimitLogin(ip), maxAttempts);
  }

  async resetLoginAttempts(ip: string): Promise<void> {
    return this.reset(RedisKeys.rateLimitLogin(ip));
  }

  async recordRefreshAttempt(ip: string) {
    const key = RedisKeys.rateLimitRefresh(ip);
    const result = await this.recordAttempt(key, 30, 60);
    if (result.isBlocked) {
      this.metrics.rateLimitEventsTotal.inc({ endpoint: 'refresh' });
    }
    return result;
  }

  async recordExportAttempt(userId: string) {
    const key = RedisKeys.rateLimitExport(userId);
    // 10 exports per 5 minutes per user
    const result = await this.recordAttempt(key, 10, 300);
    if (result.isBlocked) {
      this.metrics.rateLimitEventsTotal.inc({ endpoint: 'export' });
    }
    return result;
  }

  async recordRemoteConfigAttempt(ip: string, envId: string) {
    const key = RedisKeys.rateLimitRemote(ip, envId);
    // 60 fetches per minute per IP per environment
    const result = await this.recordAttempt(key, 60, 60);
    if (result.isBlocked) {
      this.metrics.rateLimitEventsTotal.inc({ endpoint: 'remote-config' });
    }
    return result;
  }
}
