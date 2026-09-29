export type AuditActorType = 'user' | 'api_key' | 'system';

export type AuditAction =
  | 'auth:login'
  | 'auth:login_failed'
  | 'auth:logout'
  | 'auth:logout_all'
  | 'auth:session_revoked'
  | 'auth:refresh_reuse_detected'
  | 'auth:password_changed'
  | 'auth:password_forced_change'
  | 'api_key:created'
  | 'api_key:revoked'
  | 'secret:created'
  | 'secret:updated'
  | 'secret:deleted'
  | 'secret:bulk_replaced'
  | 'secret:exported'
  | 'secret:version_restored'
  | 'user:created'
  | 'user:updated'
  | 'user:deleted'
  | 'project:created'
  | 'project:deleted'
  | 'environment:created'
  | 'environment:deleted'
  | 'key:rotated'
  | 'security:suspicious_activity';

export interface AuditEventDto {
  id: string;
  occurred_at: string;
  org_id: string;
  actor_id: string | null;
  actor_type: AuditActorType;
  action: AuditAction;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
}

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  action?: AuditAction;
  actor_id?: string;
  resource_type?: string;
  resource_id?: string;
  from?: string;
  to?: string;
}
