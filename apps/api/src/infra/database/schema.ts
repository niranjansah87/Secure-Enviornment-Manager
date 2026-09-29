/**
 * Drizzle ORM schema — SEM V2.
 * Every table is org-scoped (tenant-aware).
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  customType,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Drizzle does not export `bytea` directly — use customType
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return 'bytea'; },
  toDriver(val: Buffer) { return val; },
  fromDriver(val: Buffer) { return val; },
});

// ─────────────────────── Organizations ──────────────────────────
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────── Users ───────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    email: text('email'),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('developer'),
    scopes: text('scopes').array().notNull().default([]),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (t) => ({
    orgUsernameUniq: uniqueIndex('users_org_username_uniq').on(t.orgId, t.username),
    orgIdIdx: index('users_org_id_idx').on(t.orgId),
  }),
);

// ─────────────────────── Sessions ────────────────────────────────
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull().unique(),
    // HMAC-SHA256(token, SEM_TOKEN_HMAC_KEY) — deterministic, enables O(1) lookup
    // including on already-revoked sessions (required for reuse detection).
    refreshTokenLookupHmac: text('refresh_token_lookup_hmac').unique(),
    deviceName: text('device_name'),
    deviceIp: text('device_ip'),
    userAgent: text('user_agent'),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userActiveIdx: index('sessions_user_active_idx').on(t.userId, t.revoked),
    tokenHashIdx: uniqueIndex('sessions_token_hash_uniq').on(t.refreshTokenHash),
  }),
);

// ─────────────────────── API Keys ────────────────────────────────
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull().unique(),   // argon2id(secret, per-key random salt)
    keyPrefix: text('key_prefix').notNull(),          // first 16 hex chars — for O(1) lookup
    scopes: text('scopes').array().notNull().default([]),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    prefixActiveIdx: index('api_keys_prefix_active_idx').on(t.keyPrefix, t.revoked),
    orgIdx: index('api_keys_org_idx').on(t.orgId),
  }),
);

// ─────────────────────── Projects ────────────────────────────────
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgSlugUniq: uniqueIndex('projects_org_slug_uniq').on(t.orgId, t.slug),
    orgIdx: index('projects_org_idx').on(t.orgId),
  }),
);

// ─────────────────────── Environments ───────────────────────────
export const environments = pgTable(
  'environments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectSlugUniq: uniqueIndex('envs_project_slug_uniq').on(t.projectId, t.slug),
    projectIdx: index('envs_project_idx').on(t.projectId),
  }),
);

// ─────────────────────── Encryption Keys ─────────────────────────
export const encryptionKeys = pgTable(
  'encryption_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scopeType: text('scope_type').notNull(),   // 'project' | 'environment'
    scopeId: uuid('scope_id').notNull(),
    algorithm: text('algorithm').notNull().default('aes-256-gcm'),
    keyVersion: integer('key_version').notNull().default(1),
    encryptedKey: bytea('encrypted_key').notNull(),   // DEK encrypted by KEK/master
    nonce: bytea('nonce').notNull(),
    tag: bytea('tag').notNull(),
    aad: bytea('aad').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scopeActiveIdx: index('enc_keys_scope_active_idx').on(t.scopeId, t.isActive),
    scopeVersionUniq: uniqueIndex('enc_keys_scope_version_uniq').on(t.scopeId, t.keyVersion),
  }),
);

// ─────────────────────── Secrets ─────────────────────────────────
export const secrets = pgTable(
  'secrets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    environmentId: uuid('environment_id').notNull().references(() => environments.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    encryptedValue: bytea('encrypted_value').notNull(),
    nonce: bytea('nonce').notNull(),
    tag: bytea('tag').notNull(),
    aad: bytea('aad').notNull(),
    dekId: uuid('dek_id').notNull().references(() => encryptionKeys.id),
    description: text('description'),
    isSensitive: boolean('is_sensitive').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    envKeyUniq: uniqueIndex('secrets_env_key_uniq').on(t.environmentId, t.key),
    envIdx: index('secrets_env_idx').on(t.environmentId),
  }),
);

// ─────────────────────── Secret Versions ─────────────────────────
// Immutable — never UPDATE or DELETE individual version rows
export const secretVersions = pgTable(
  'secret_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    secretId: uuid('secret_id').notNull().references(() => secrets.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    encryptedValue: bytea('encrypted_value').notNull(),
    nonce: bytea('nonce').notNull(),
    tag: bytea('tag').notNull(),
    aad: bytea('aad').notNull(),
    dekId: uuid('dek_id').notNull().references(() => encryptionKeys.id),
    changeType: text('change_type').notNull(),   // 'create'|'update'|'delete'|'restore'
    changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    secretVersionPk: uniqueIndex('secret_versions_secret_version_uniq').on(t.secretId, t.version),
    secretIdx: index('secret_versions_secret_idx').on(t.secretId),
  }),
);

// ─────────────────────── Audit Events ────────────────────────────
// Append-only. RLS enforced at DB level (see migration).
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    orgId: uuid('org_id').notNull(),
    actorId: uuid('actor_id'),
    actorType: text('actor_type').notNull(),       // 'user'|'api_key'|'system'
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata').notNull().default({}),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => ({
    orgTimeIdx: index('audit_org_time_idx').on(t.orgId, t.occurredAt),
    actionIdx: index('audit_action_idx').on(t.action),
    actorIdx: index('audit_actor_idx').on(t.actorId),
  }),
);

// ─────────────────────── Relations ───────────────────────────────
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  apiKeys: many(apiKeys),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  environments: many(environments),
}));

export const environmentsRelations = relations(environments, ({ one, many }) => ({
  project: one(projects, { fields: [environments.projectId], references: [projects.id] }),
  secrets: many(secrets),
}));

export const secretsRelations = relations(secrets, ({ one, many }) => ({
  environment: one(environments, { fields: [secrets.environmentId], references: [environments.id] }),
  versions: many(secretVersions),
  dek: one(encryptionKeys, { fields: [secrets.dekId], references: [encryptionKeys.id] }),
}));

export const secretVersionsRelations = relations(secretVersions, ({ one }) => ({
  secret: one(secrets, { fields: [secretVersions.secretId], references: [secrets.id] }),
  dek: one(encryptionKeys, { fields: [secretVersions.dekId], references: [encryptionKeys.id] }),
}));
