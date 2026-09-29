import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';

export interface AuditEventInput {
  orgId: string;
  actorId: string | null;
  actorType: 'user' | 'api_key' | 'system';
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Write an audit event inside the caller's transaction.
   * For security-sensitive mutations, pass the transaction client (tx) so
   * audit is committed atomically with the mutation.
   */
  async writeEvent(
    event: AuditEventInput,
    tx?: NodePgDatabase<typeof schema>,
  ): Promise<void> {
    const client = tx ?? this.db;
    await client.insert(schema.auditEvents).values({
      orgId: event.orgId,
      actorId: event.actorId,
      actorType: event.actorType,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      // Never store secret values in audit metadata
      metadata: event.metadata as Record<string, string>,
      ip: event.ip,
      userAgent: event.userAgent,
    });
  }

  async query(
    orgId: string,
    params: {
      action?: string;
      actorId?: string;
      resourceType?: string;
      resourceId?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [eq(schema.auditEvents.orgId, orgId)];

    if (params.action) conditions.push(eq(schema.auditEvents.action, params.action));
    if (params.actorId) conditions.push(eq(schema.auditEvents.actorId, params.actorId));
    if (params.resourceType) conditions.push(eq(schema.auditEvents.resourceType, params.resourceType));
    if (params.resourceId) conditions.push(eq(schema.auditEvents.resourceId, params.resourceId));
    if (params.from) conditions.push(gte(schema.auditEvents.occurredAt, params.from));
    if (params.to) conditions.push(lte(schema.auditEvents.occurredAt, params.to));

    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;

    const [events, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.auditEvents)
        .where(and(...conditions))
        .orderBy(desc(schema.auditEvents.occurredAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.auditEvents)
        .where(and(...conditions)),
    ]);

    return {
      events,
      total: countResult[0]?.count ?? 0,
      limit,
      offset,
    };
  }
}
