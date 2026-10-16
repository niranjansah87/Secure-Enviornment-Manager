ALTER TABLE secrets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS secrets_environment_active_idx ON secrets(environment_id) WHERE deleted_at IS NULL;
