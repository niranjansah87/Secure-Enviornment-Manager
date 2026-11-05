/**
 * JwtAuthGuard — validates ES256 JWT from Authorization: Bearer header.
 * Extracts claims into request.user. NEVER trusts user_id from body.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import type { JwtPayload } from '@sem/types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private publicKey: string | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user: JwtPayload;
      sessionRevoked?: boolean;
    }>();
    if (request.user) return true;

    const token = this.extractToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException({ code: 'TOKEN_MISSING', message: 'Authentication required' });
    }

    const payload = this.verifyToken(token);
    const [session] = await this.db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.id, payload.session_id),
          eq(schema.sessions.userId, payload.sub),
          eq(schema.sessions.revoked, false),
          gt(schema.sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!session) {
      throw new UnauthorizedException({ code: 'SESSION_REVOKED', message: 'Session is no longer active' });
    }
    request.user = payload;
    return true;
  }

  private extractToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
  }

  private verifyToken(token: string): JwtPayload {
    const publicKey = this.getPublicKey();
    try {
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['ES256'],
        issuer: this.config.get<string>('app.jwt.issuer', 'sem-api'),
        audience: this.config.get<string>('app.jwt.audience', 'sem-web'),
      });
      return payload as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Token expired' });
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Invalid token' });
      }
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Authentication failed' });
    }
  }

  private getPublicKey(): string {
    if (this.publicKey) return this.publicKey;

    const keyFile = this.config.get<string>('app.jwt.publicKeyFile');
    if (keyFile) {
      this.publicKey = fs.readFileSync(keyFile, 'utf8');
      return this.publicKey;
    }

    const key = this.config.get<string>('app.jwt.publicKey');
    if (!key) throw new Error('JWT public key not configured');
    this.publicKey = key.replace(/\\n/g, '\n');
    return this.publicKey;
  }
}
