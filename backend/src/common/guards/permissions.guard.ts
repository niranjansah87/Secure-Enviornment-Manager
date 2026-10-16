/**
 * PermissionsGuard — checks @RequireScopes() decorator.
 * Must run AFTER JwtAuthGuard (request.user must be populated).
 * Never trusts scopes from request body — only from verified JWT claims.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '@sem/types';
import { REQUIRED_SCOPES_KEY } from '../decorators/require-scopes.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No scopes required — just authentication
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    const hasAll = required.every((scope) => {
      // Admin role has all permissions
      if (user.role === 'admin') return true;
      return user.scopes.includes(scope);
    });

    if (!hasAll) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to perform this action',
      });
    }

    return true;
  }
}
