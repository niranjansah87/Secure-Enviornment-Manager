import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '@sem/types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (user.role !== 'admin') {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Administrator access required',
      });
    }
    return true;
  }
}
