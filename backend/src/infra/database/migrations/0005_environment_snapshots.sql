CREATE TABLE IF NOT EXISTS environment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  encrypted_variables BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  tag BYTEA NOT NULL,
  aad BYTEA NOT NULL,
  dek_id UUID NOT NULL REFERENCES encryption_keys(id),
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS environment_snapshots_env_time_idx ON environment_snapshots(environment_id, created_at DESC);
