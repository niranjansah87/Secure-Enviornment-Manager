ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'user_password';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_role TEXT NOT NULL DEFAULT 'developer';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE sessions AS s
SET auth_role = u.role, auth_scopes = u.scopes
FROM users AS u
WHERE s.user_id = u.id AND cardinality(s.auth_scopes) = 0;
