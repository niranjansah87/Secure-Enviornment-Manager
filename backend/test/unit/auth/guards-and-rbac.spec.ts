import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from '../../../src/common/guards/admin.guard';
import { PermissionsGuard } from '../../../src/common/guards/permissions.guard';
import { MustChangePasswordGuard } from '../../../src/common/guards/must-change-password.guard';
import { RateLimitService } from '../../../src/common/services/rate-limit.service';
import type { JwtPayload } from '@sem/types';

function createMockContext(user?: Partial<JwtPayload>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RBAC and Security Guards', () => {
  describe('AdminGuard', () => {
    const guard = new AdminGuard();

    it('permits user with admin role', () => {
      const ctx = createMockContext({ role: 'admin' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects user with developer role', () => {
      const ctx = createMockContext({ role: 'developer' });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('rejects user with viewer role', () => {
      const ctx = createMockContext({ role: 'viewer' });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('PermissionsGuard', () => {
    it('permits when no scopes are required', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(undefined),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);
      const ctx = createMockContext({ role: 'developer', scopes: [] });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('permits admin user regardless of specific scopes', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(['secrets:write', 'admin:manage']),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);
      const ctx = createMockContext({ role: 'admin', scopes: [] });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('permits developer user when all required scopes are present', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(['secrets:read', 'secrets:write']),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);
      const ctx = createMockContext({
        role: 'developer',
        scopes: ['secrets:read', 'secrets:write', 'history:read'],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects developer user when required scope is missing', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(['secrets:write']),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);
      const ctx = createMockContext({
        role: 'developer',
        scopes: ['secrets:read'],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('MustChangePasswordGuard', () => {
    it('permits when skip decorator is present', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(true),
      } as unknown as Reflector;
      const guard = new MustChangePasswordGuard(reflector);
      const ctx = createMockContext({ must_change_password: true });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('permits when must_change_password is false', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      } as unknown as Reflector;
      const guard = new MustChangePasswordGuard(reflector);
      const ctx = createMockContext({ must_change_password: false });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('blocks access when must_change_password is true', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      } as unknown as Reflector;
      const guard = new MustChangePasswordGuard(reflector);
      const ctx = createMockContext({ must_change_password: true });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('RateLimitService in-memory fallback', () => {
    it('enforces limit across sliding attempts and blocks when exceeded', async () => {
      // Mock redis throwing error to test fallback
      const failingRedis = {
        incr: vi.fn().mockRejectedValue(new Error('Redis offline')),
        get: vi.fn().mockRejectedValue(new Error('Redis offline')),
        del: vi.fn().mockRejectedValue(new Error('Redis offline')),
      };
      const mockMetrics = { rateLimitEventsTotal: { inc: vi.fn() } };
      const rateLimiter = new RateLimitService(failingRedis as any, mockMetrics as any);

      const ip = '192.168.1.100';
      const key = `rl:login:${ip}`;

      // 3 attempts with max 3
      const a1 = await rateLimiter.recordAttempt(key, 3, 60);
      expect(a1.count).toBe(1);
      expect(a1.isBlocked).toBe(false);

      const a2 = await rateLimiter.recordAttempt(key, 3, 60);
      expect(a2.count).toBe(2);
      expect(a2.isBlocked).toBe(false);

      const a3 = await rateLimiter.recordAttempt(key, 3, 60);
      expect(a3.count).toBe(3);
      expect(a3.isBlocked).toBe(false);

      // 4th attempt should be blocked
      const a4 = await rateLimiter.recordAttempt(key, 3, 60);
      expect(a4.count).toBe(4);
      expect(a4.isBlocked).toBe(true);

      expect(await rateLimiter.isBlocked(key, 3)).toBe(true);

      // Reset
      await rateLimiter.reset(key);
      expect(await rateLimiter.isBlocked(key, 3)).toBe(false);
    });
  });
});

