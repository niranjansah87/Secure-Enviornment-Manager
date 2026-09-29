-- SEM V2 Initial Schema Migration
-- Creates all tables, indexes, constraints, and RLS policies.

-- ─────────────────────── Extensions ──────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────── Organizations ───────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizations_slug_uniq UNIQUE (slug)
);

-- ─────────────────────── Users ───────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username             TEXT NOT NULL,
  email                TEXT,
  password_hash        TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'developer',
  scopes               TEXT[] NOT NULL DEFAULT '{}',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID,
  CONSTRAINT users_org_username_uniq UNIQUE (org_id, username),
  CONSTRAINT users_role_check CHECK (role IN ('admin', 'developer', 'viewer'))
);
CREATE INDEX IF NOT EXISTS users_org_id_idx ON users(org_id);
CREATE INDEX IF NOT EXISTS users_active_idx ON users(org_id, is_active);

-- ─────────────────────── Sessions ────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT NOT NULL,
  device_name         TEXT,
  device_ip           TEXT,
  user_agent          TEXT,
  last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked             BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at          TIMESTAMPTZ,
  revoked_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_token_hash_uniq UNIQUE (refresh_token_hash)
);
CREATE INDEX IF NOT EXISTS sessions_user_active_idx ON sessions(user_id, revoked);

-- ─────────────────────── API Keys ────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL,
  key_prefix    TEXT NOT NULL,
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT api_keys_hash_uniq UNIQUE (key_hash)
);
CREATE INDEX IF NOT EXISTS api_keys_prefix_active_idx ON api_keys(key_prefix, revoked);
CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys(org_id);

-- ─────────────────────── Projects ────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_org_slug_uniq UNIQUE (org_id, slug)
);
CREATE INDEX IF NOT EXISTS projects_org_idx ON projects(org_id);

-- ─────────────────────── Environments ────────────────────────────
CREATE TABLE IF NOT EXISTS environments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT envs_project_slug_uniq UNIQUE (project_id, slug)
);
CREATE INDEX IF NOT EXISTS envs_project_idx ON environments(project_id);

-- ─────────────────────── Encryption Keys ─────────────────────────
CREATE TABLE IF NOT EXISTS encryption_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type    TEXT NOT NULL,
  scope_id      UUID NOT NULL,
  algorithm     TEXT NOT NULL DEFAULT 'aes-256-gcm',
  key_version   INTEGER NOT NULL DEFAULT 1,
  encrypted_key BYTEA NOT NULL,
  nonce         BYTEA NOT NULL,
  tag           BYTEA NOT NULL,
  aad           BYTEA NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  rotated_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enc_keys_scope_type_check CHECK (scope_type IN ('project', 'environment')),
  CONSTRAINT enc_keys_scope_version_uniq UNIQUE (scope_id, key_version)
);
CREATE INDEX IF NOT EXISTS enc_keys_scope_active_idx ON encryption_keys(scope_id, is_active);

-- ─────────────────────── Secrets ─────────────────────────────────
CREATE TABLE IF NOT EXISTS secrets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id   UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key              TEXT NOT NULL,
  encrypted_value  BYTEA NOT NULL,
  nonce            BYTEA NOT NULL,
  tag              BYTEA NOT NULL,
  aad              BYTEA NOT NULL,
  dek_id           UUID NOT NULL REFERENCES encryption_keys(id),
  description      TEXT,
  is_sensitive     BOOLEAN NOT NULL DEFAULT TRUE,
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT secrets_env_key_uniq UNIQUE (environment_id, key),
  CONSTRAINT secrets_version_positive CHECK (version > 0)
);
CREATE INDEX IF NOT EXISTS secrets_env_idx ON secrets(environment_id);

-- ─────────────────────── Secret Versions ─────────────────────────
-- Immutable — see audit_events for append-only pattern.
-- No UPDATE or DELETE is issued against this table by application code.
CREATE TABLE IF NOT EXISTS secret_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id        UUID NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  version          INTEGER NOT NULL,
  encrypted_value  BYTEA NOT NULL,
  nonce            BYTEA NOT NULL,
  tag              BYTEA NOT NULL,
  aad              BYTEA NOT NULL,
  dek_id           UUID NOT NULL REFERENCES encryption_keys(id),
  change_type      TEXT NOT NULL,
  changed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT secret_versions_secret_version_uniq UNIQUE (secret_id, version),
  CONSTRAINT secret_versions_change_type_check CHECK (change_type IN ('create', 'update', 'delete', 'restore'))
);
CREATE INDEX IF NOT EXISTS secret_versions_secret_idx ON secret_versions(secret_id);

-- ─────────────────────── Audit Events ────────────────────────────
-- Append-only enforced via:
--   1. Restricted DB role (no DELETE/UPDATE grant)
--   2. Row Level Security (no delete/update policies)
CREATE TABLE IF NOT EXISTS audit_events (
  id             UUID NOT NULL DEFAULT gen_random_uuid(),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id         UUID NOT NULL,
  actor_id       UUID,
  actor_type     TEXT NOT NULL,
  action         TEXT NOT NULL,
  resource_type  TEXT,
  resource_id    UUID,
  metadata       JSONB NOT NULL DEFAULT '{}',
  ip             TEXT,
  user_agent     TEXT,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Initial partition — covers current month onwards
-- Worker cron creates future monthly partitions automatically
CREATE TABLE IF NOT EXISTS audit_events_default PARTITION OF audit_events DEFAULT;

CREATE INDEX IF NOT EXISTS audit_org_time_idx ON audit_events(org_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_events(action);
CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_events(actor_id);

-- ─────────────────────── Audit Immutability ──────────────────────
-- Enable RLS and create INSERT/SELECT only policies.
-- The application DB role must NOT have UPDATE or DELETE privilege.
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Allow inserts from application role
CREATE POLICY audit_insert_policy ON audit_events
  FOR INSERT
  WITH CHECK (true);

-- Allow reads
CREATE POLICY audit_select_policy ON audit_events
  FOR SELECT
  USING (true);

-- Explicitly NO UPDATE or DELETE policies — any attempt returns permission denied.

-- ─────────────────────── DB Roles ────────────────────────────────
-- sem_app must be created out-of-band before running migrations:
--   CREATE ROLE sem_app WITH LOGIN PASSWORD '<from secret manager>';
-- Do NOT create it here — embedding passwords in migrations is a secret leak.
-- If sem_app does not exist, GRANTs below will fail and alert the operator.

-- Grant appropriate privileges to sem_app
GRANT SELECT, INSERT, UPDATE, DELETE ON
  organizations, users, sessions, api_keys, projects, environments,
  encryption_keys, secrets, secret_versions
TO sem_app;

-- Audit: INSERT and SELECT only — no UPDATE, no DELETE
GRANT SELECT, INSERT ON audit_events TO sem_app;
GRANT SELECT, INSERT ON audit_events_default TO sem_app;

-- Sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO sem_app;
