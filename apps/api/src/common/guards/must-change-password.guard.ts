import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '@sem/types';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PASSWORD_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user) return true; // Not authenticated yet — let auth guard handle

    if (user.must_change_password) {
      throw new ForbiddenException({
        code: 'MUST_CHANGE_PASSWORD',
        message: 'You must change your password before accessing this resource',
      });
    }
    return true;
  }
}
