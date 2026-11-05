-- Add HMAC-SHA256 lookup column to sessions.
-- Refresh token reuse detection requires finding a session by token — including
-- already-revoked sessions (to catch reuse). Argon2id hashes are per-row-salted
-- so they cannot be queried by value. A deterministic HMAC-SHA256(token, server_secret)
-- gives O(1) lookup by the unhashed token, after which Argon2id confirms integrity.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS refresh_token_lookup_hmac TEXT UNIQUE;

-- Index for O(1) refresh token lookup
CREATE UNIQUE INDEX IF NOT EXISTS sessions_lookup_hmac_idx
  ON sessions(refresh_token_lookup_hmac)
  WHERE refresh_token_lookup_hmac IS NOT NULL;
