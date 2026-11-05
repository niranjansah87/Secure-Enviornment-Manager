import { Injectable, Inject } from '@nestjs/common';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>) {}

  async getOrgSummary(orgId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [projectCount, userCount, auditLast30d] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(schema.projects)
        .where(eq(schema.projects.orgId, orgId)),
      this.db
        .select({ count: count() })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true))),
      this.db
        .select({ count: count() })
        .from(schema.auditEvents)
        .where(and(eq(schema.auditEvents.orgId, orgId), gte(schema.auditEvents.occurredAt, thirtyDaysAgo))),
    ]);

    return {
      projects: projectCount[0]?.count ?? 0,
      active_users: userCount[0]?.count ?? 0,
      audit_events_last_30d: auditLast30d[0]?.count ?? 0,
    };
  }

  async getTopActions(orgId: string, limit = 10) {
    return this.db
      .select({
        action: schema.auditEvents.action,
        count: count(),
      })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.orgId, orgId))
      .groupBy(schema.auditEvents.action)
      .orderBy(desc(count()))
      .limit(limit);
  }
}
