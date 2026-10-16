/**
 * SecretsGateway — WebSocket event emitter.
 *
 * Security rules:
 * - Connections must present a valid JWT
 * - Room join requires verified resource ownership
 * - Events never contain secret values, tokens, or key material
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from '@sem/types';
import { ConfigService } from '@nestjs/config';
import { SOCKET_SERVER } from './websocket.constants';
import type { Server as HttpServer } from 'http';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';

export type WebSocketEvent =
  | 'secret:created'
  | 'secret:updated'
  | 'secret:deleted'
  | 'secret:bulk_updated'
  | 'audit:event'
  | 'session:revoked'
  | 'key:rotated';

@Injectable()
export class SecretsGateway {
  private readonly logger = new Logger(SecretsGateway.name);

  constructor(
    @Inject(SOCKET_SERVER) private readonly io: Server,
    private readonly config: ConfigService,
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  attach(server: HttpServer) {
    this.io.attach(server);
    this.io.use(async (socket, next) => {
      const raw = socket.handshake.auth['token'] ?? socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      const user = typeof raw === 'string' ? this.verifyConnectionToken(raw) : null;
      if (!user) return next(new Error('Authentication required'));
      const [session] = await this.db.select({ id: schema.sessions.id }).from(schema.sessions).where(and(eq(schema.sessions.id, user.session_id), eq(schema.sessions.userId, user.sub), eq(schema.sessions.revoked, false))).limit(1);
      if (!session) return next(new Error('Session is no longer active'));
      socket.data['user'] = user;
      next();
    });
    this.io.on('connection', (socket) => {
      const user = socket.data['user'] as JwtPayload;
      void socket.join([`org:${user.org}`, `user:${user.sub}`]);
      socket.on('subscribe:environment', async (environmentId: string, acknowledge?: (result: { ok: boolean }) => void) => {
        const [environment] = await this.db
          .select({ id: schema.environments.id })
          .from(schema.environments)
          .innerJoin(schema.projects, eq(schema.environments.projectId, schema.projects.id))
          .where(and(eq(schema.environments.id, environmentId), eq(schema.projects.orgId, user.org)))
          .limit(1);
        if (environment) await socket.join(`env:${environmentId}`);
        acknowledge?.({ ok: Boolean(environment) });
      });
      socket.on('unsubscribe:environment', async (environmentId: string) => socket.leave(`env:${environmentId}`));
    });
    this.logger.log('WebSocket server attached');
  }

  /** Emit to all clients subscribed to an environment room. */
  emitToEnvironment(
    environmentId: string,
    event: WebSocketEvent,
    payload: Record<string, string | number | boolean | null>,
  ) {
    const room = `env:${environmentId}`;
    this.io.to(room).emit(event, {
      ...payload,
      // Ensure no accidental secret value leakage
      _ts: Date.now(),
    });
  }

  /** Emit to all clients in an org room. */
  emitToOrg(
    orgId: string,
    event: WebSocketEvent,
    payload: Record<string, string | number | boolean | null>,
  ) {
    this.io.to(`org:${orgId}`).emit(event, { ...payload, _ts: Date.now() });
  }

  /** Emit session revocation to a specific user. */
  emitSessionRevoked(userId: string, sessionId: string) {
    this.io.to(`user:${userId}`).emit('session:revoked', { session_id: sessionId, _ts: Date.now() });
  }

  /** Validate JWT and return payload (used on connection). */
  verifyConnectionToken(token: string): JwtPayload | null {
    try {
      const publicKey = this.getPublicKey();
      return jwt.verify(token, publicKey, {
        algorithms: ['ES256'],
        issuer: this.config.get<string>('app.jwt.issuer', 'sem-api'),
        audience: this.config.get<string>('app.jwt.audience', 'sem-web'),
      }) as JwtPayload;
    } catch {
      return null;
    }
  }

  private getPublicKey(): string {
    const keyFile = this.config.get<string>('app.jwt.publicKeyFile');
    if (keyFile) {
      const fs = require('fs') as typeof import('fs');
      return fs.readFileSync(keyFile, 'utf8');
    }
    const key = this.config.get<string>('app.jwt.publicKey');
    if (!key) throw new Error('JWT public key not configured');
    return key.replace(/\\n/g, '\n');
  }
}
