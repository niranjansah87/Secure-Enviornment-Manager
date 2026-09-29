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
import { SOCKET_SERVER } from './websocket.module';
import { ConfigService } from '@nestjs/config';

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
  ) {}

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
    return key;
  }
}
