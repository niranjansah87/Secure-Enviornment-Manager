# SEM v2 Backend Architecture Assessment

**Date**: 2026-09-29  
**Scope**: Full backend reassessment — stack selection, crypto, database, auth, audit, realtime, migration  
**Status**: Assessment only — no migration executed

---

## Corrections to Existing Documentation

CLAUDE.md contains several inaccurate claims. Code is the source of truth:

| Claim in CLAUDE.md | Actual State |
|--------------------|--------------|
| `app.py` is 1,348 lines, central hub | `app.py` is ~300 lines — thin bootstrap wiring blueprints |
| "No real test suite" | 12 test files exist in `tests/backend/` and `tests/integration/` |
| Flask monolith | Already modularized: `routes/`, `services/`, `core/`, `middleware/`, `storage/`, `handlers/` |
| Missing WebSocket | `websocket_server.py` exists with Flask-SocketIO + eventlet |
| Analytics as planned | `analytics_service.py` is implemented |
| Health monitoring as planned | `health_service.py` is implemented |

These corrections change the problem framing substantially. Flask is not the problem. The real problems are architectural.

---

## Part 1: Current Backend Map

### HTTP/API Layer

**Registered Blueprints** (app.py:91-98):

| Blueprint | Prefix | File |
|-----------|--------|------|
| `api_bp` | `/api/v1` | `routes/api_routes.py` |
| `secret_bp` | none | `routes/secret_routes.py` |
| `export_bp` | none | `routes/export_routes.py` |
| `redirect_bp` | none | `routes/redirect_routes.py` |
| `jwt_auth_bp` | `/api/v1/auth` | `routes/jwt_auth_routes.py` |
| `user_bp` | none | `routes/user_routes.py` |
| `auth_bp` | none | `routes/auth_routes.py` |

**Middleware/Hooks** (app.py):
- `add_request_id` — injects `X-Request-ID` into `g`
- `update_last_seen` — updates session `last_active` timestamp
- `api_cors_preflight` — handles OPTIONS for `/api/v1/*`
- `add_security_headers` — CSP, CORS, X-Frame-Options, Cache-Control
- `log_request_start` / `log_request_complete` — structured access/security/audit logs
- `ProxyFix` — strips proxy headers when `BEHIND_PROXY=true`

**Authentication Mechanisms** (core/auth.py, core/jwt_auth.py):

Four credential types accepted:
1. Master API token — `hmac.compare_digest` against `MASTER_API_TOKEN` env var
2. Dashboard password — `werkzeug.security.check_password_hash`
3. JWT access token — HS256 validated by `token_manager.validate_access_token`
4. Namespace API key — PBKDF2-SHA256 (480k iterations) with **fixed salt** (security issue)

**Authorization** (core/auth.py:86-137):
- `api_auth_ok()` checks: master token → dashboard password → JWT → API key
- JWT payload carries `is_admin`, `scopes` list (`namespace` or `namespace/environment`)
- No server-side permission lookup per request for JWT paths — scopes are in the token

**Session auth** (core/auth.py:239-299, core/sessions.py):
- Flask session cookie (httponly, secure, SameSite=Lax)
- Session registry held **in-memory** in `_ACTIVE_SESSIONS` dict — not persistent, not distributed
- Inactivity timeout configurable (default 60 min), absolute lifetime 24h

### Domain Layer

**Secrets Storage** (storage/secrets_store.py):
- File: `data/<namespace>/<environment>.enc`
- Entire environment dict serialized as JSON → Fernet-encrypted → binary file
- Thread safety via per-file `Lock`

**Encryption** (core/config.py:117):
```python
fernet = Fernet(settings.encryption_key.encode())
```
Fernet = AES-128-CBC + HMAC-SHA256. NOT AES-256 as documented. Single global key.

**History** (history_manager.py):
- File: `data/<namespace>/<environment>.history.jsonl`
- Full encrypted snapshot per change — unbounded growth, no retention
- O(n) full-file read to list history

**Audit** (services/audit_service.py, services/audit_file_logger.py):
- File: `audit_logs/audit.jsonl`
- Sensitive field sanitization: SHA-256 hash of value if field name matches SENSITIVE_MARKERS
- Analytics reads entire JSONL file per query — O(n) scan

**Users** (services/user_service.py):
- File: `data/users.json`
- PBKDF2-SHA256 with per-user random salt (480k iterations) — correct
- Format: `pbkdf2_sha256$<iterations>$<base64_salt>$<base64_hash>`

**API Keys** (services/api_key_service.py):
- File: `api_keys.json`
- PBKDF2-SHA256 (480k iterations) with **fixed salt** `b"SecureEnvironmentManager_api_key_v1"` — security issue
- Scopes: `namespaces[]` or `environments[]` (format: `namespace/environment`)
- User binding via `bound_user_id`

**JWT Auth** (core/jwt_auth.py):
- Algorithm: HS256 (symmetric — not RS256)
- Access token: 60 minutes; Refresh token: 7 days
- Refresh tokens server-side in `data/refresh_tokens.json` — SHA-256 hashed

**WebSocket** (websocket_server.py):
- Flask-SocketIO with eventlet
- JWT auth on connect; room-based (namespace/environment)
- `message_queue=None` — no Redis pub/sub — single-node only

**Analytics** (analytics_service.py):
- Reads entire audit JSONL on every request — O(n), unusable at scale

### Infrastructure Layer

**File Storage Structure:**
```
data/
  <namespace>/
    <environment>.enc           # Fernet-encrypted JSON dict
    <environment>.history.jsonl # Encrypted full snapshots
  users.json
api_keys.json
audit_logs/
  audit.jsonl
```

**Rate Limiting** (middleware/rate_limiter.py):
- In-memory `LOGIN_FAILURES: Dict[str, Tuple[int, float]]`
- Not distributed — resets on restart

### Critical Path Traces

**Auth: Login → Token → API Access:**
```
POST /api/v1/auth/login
  → rate_limiter.is_ip_locked()
  → check_password_hash(dashboard_password_hash, password) OR user_service.authenticate()
  → token_manager.create_access_token() → JWT HS256
  → token_manager.create_refresh_token() → stored server-side
  → return {access_token, refresh_token, expires_in}

API request GET /api/v1/<namespace>/<environment>:
  → extract_bearer_token() from Authorization header
  → api_auth_ok(namespace, token)
    → master token check (hmac.compare_digest)
    → dashboard password check
    → JWT validate → is_admin or scopes check
    → API key verify (FULL JSON file load + iterate all keys)
  → secrets_store.read() → Fernet.decrypt(file) → JSON parse
  → return decrypted dict
```

**Secret Write:**
```
PUT /api/v1/<namespace>/<environment>
  → api_auth_ok()
  → read_vars() [decrypt entire environment]
  → merge/update dict
  → write_vars() [re-encrypt entire environment → write file]
  → history_manager.save_snapshot() [encrypt snapshot → append to .history.jsonl]
  → audit_logger.log_variable_update() [append to audit.jsonl]
```

**Rollback:**
```
POST /api/v1/<namespace>/<environment>/rollback
  → api_auth_ok() with admin check
  → history_manager.get_version() [O(n) scan of .history.jsonl]
  → fernet.decrypt(snapshot.variables)
  → write_vars() [re-encrypt, write current .enc]
  → history_manager.save_snapshot() [rollback recorded as new snapshot]
  → audit_logger.log_event("ROLLBACK", ...)
```

---

## Part 2: Architectural Problems by Root Cause

### Problems Caused by Flask/Python Specifically (Minor)

1. **GIL limits CPU parallelism** — I/O-bound SEM is rarely affected; gunicorn workers mitigate
2. **Eventlet monkey-patching** — WebSocket requires eventlet; fragile, conflicts with some libraries
3. **No native async/await in Flask** — refactoring to full async would require major effort

None of these alone justify abandoning Python.

### Problems Caused by Architecture/Design (Root Causes)

1. **Single Fernet key for all data** — one compromised key decrypts all secrets across all namespaces
2. **Fernet = AES-128, not AES-256** — documented as AES-256; code shows AES-128-CBC
3. **Fixed salt for API key hashing** (api_key_service.py:119) — `salt = b"SecureEnvironmentManager_api_key_v1"`. Exfiltrating api_keys.json enables parallel cracking of all keys
4. **HS256 JWT** — symmetric; any service with the key can forge tokens
5. **No encryption key rotation** — no path to rotate ENCRYPTION_KEY without decrypt/re-encrypt all data
6. **WebSocket without Redis pub/sub** — `message_queue=None`; horizontal scaling impossible
7. **In-memory rate limiter** — not shared across workers; resets on restart
8. **In-memory session registry** — not shared across workers; invalidation doesn't propagate
9. **Duplicate login tracking** — `LOGIN_ATTEMPTS` in core/auth.py AND `LOGIN_FAILURES` in rate_limiter.py track independently
10. **No background job system** — email sent synchronously on request thread
11. **Analytics is O(n)** — full JSONL scan per query; unusable at 100k+ events
12. **History is unbounded** — full snapshots, no retention, O(n) to list
13. **Authorization not in queries** — checked once at route level; not enforced in DB queries

### Problems Caused by File Storage

1. **No ACID transactions** — crash during `write_vars()` can corrupt .enc file
2. **Not horizontally scalable** — multiple instances require shared filesystem
3. **No efficient search** — finding keys across namespaces requires decrypting every file
4. **Variable count requires full decryption** — `get_metadata()` decrypts entire file just to count keys

### Problems Caused by Implementation Quality

1. **API key verify does full file load per request** — `_load_keys()` called on every authenticated API request; O(n×480k_iterations) with PBKDF2
2. **`verify_key` mutates and saves during reads** (api_key_service.py:294) — sets `status=expired` and calls `_save_keys()` during a verification call; read operation with write side effect
3. **`identify_token()` uses SHA-256 not PBKDF2** (core/auth.py:229) — will never find PBKDF2-hashed keys; always returns `"unknown_token"` for modern keys — this is a bug

---

## Part 3: Technology Evaluation

### Scoring Criteria and Weights

| Criterion | Weight |
|-----------|--------|
| Security | 20% |
| Maintainability | 15% |
| Developer productivity | 15% |
| Scalability | 10% |
| Performance | 10% |
| PostgreSQL ecosystem | 10% |
| Realtime | 5% |
| Background jobs | 5% |
| Testing | 5% |
| Observability | 5% |

### Candidate A: NestJS + Fastify + TypeScript — Score: 7.75

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Security (20%) | 7 | TypeScript prevents runtime type errors; `helmet`, `class-validator` mature; no memory safety |
| Maintainability (15%) | 8 | DI container + module system designed for service-layer separation; TypeScript catches contract drift |
| Dev productivity (15%) | 8 | Fast with experience; CLI generators; auto-generated OpenAPI feeds TypeScript SDK; type-sharing with Next.js |
| Scalability (10%) | 7 | Node.js event loop single-threaded; cluster or multiple containers for horizontal scale |
| Performance (10%) | 7 | Fastify adapter fastest Node.js framework; adequate for SEM's I/O-bound workload |
| PostgreSQL (10%) | 8 | Drizzle or Prisma mature; type-safe migrations |
| Realtime (5%) | 9 | Built-in WebSocket gateway; Redis adapter first-class for multi-node |
| Background jobs (5%) | 9 | BullMQ is best-in-class; `@nestjs/bull` integration is first-class |
| Testing (5%) | 9 | NestJS testing module with DI mocking; Jest; excellent documentation |
| Observability (5%) | 8 | `nestjs-otel`; Pino structured logging; Prometheus metrics |

Weighted: 1.40+1.20+1.20+0.70+0.70+0.80+0.45+0.45+0.45+0.40 = **7.75**

### Candidate B: FastAPI + Python — Score: 7.70

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Security (20%) | 7 | `cryptography` library audited; Pydantic enforces input shapes; no memory safety |
| Maintainability (15%) | 8 | Clean async Python; Pydantic models; existing crypto code 100% reusable |
| Dev productivity (15%) | 9 | Lowest migration cost — same language, reuse all crypto/auth; auto-generated OpenAPI |
| Scalability (10%) | 7 | Uvicorn/uvloop competitive; GIL present but I/O-bound mitigates it |
| Performance (10%) | 7 | Starlette + uvicorn second only to Go/Rust for this workload |
| PostgreSQL (10%) | 8 | SQLAlchemy 2.0 async + asyncpg mature; Alembic for migrations |
| Realtime (5%) | 7 | Starlette WebSocket native; Redis pub/sub via aioredis doable but more manual |
| Background jobs (5%) | 7 | `arq` (async Redis queue) or Celery; well-proven |
| Testing (5%) | 9 | pytest + httpx; existing pytest infrastructure reusable |
| Observability (5%) | 8 | OpenTelemetry Python SDK mature; structlog |

Weighted: 1.40+1.20+1.35+0.70+0.70+0.80+0.35+0.35+0.45+0.40 = **7.70**

### Candidate C: Go + Gin/Fiber/Chi — Score: 7.45

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Security (20%) | 8 | Memory safety (GC); excellent stdlib crypto; no CVEs from language class |
| Maintainability (15%) | 7 | Simple but verbose; no DI; middleware chaining grows complex |
| Dev productivity (15%) | 6 | Significant rewrite; more verbose than Python/TypeScript; slower iteration |
| Scalability (10%) | 9 | Goroutines; no GIL; linear horizontal scaling |
| Performance (10%) | 8 | 3-5x faster than Python/Node for CPU-bound; similar for I/O-bound |
| PostgreSQL (10%) | 7 | pgx excellent; sqlc type-safe queries; fewer ORM abstractions |
| Realtime (5%) | 7 | gorilla/websocket solid; Redis pub/sub via go-redis |
| Background jobs (5%) | 7 | `asynq` (Redis-backed) closest to BullMQ; less ecosystem depth |
| Testing (5%) | 8 | Stdlib testing excellent; table-driven tests |
| Observability (5%) | 8 | OpenTelemetry Go SDK first-class; zerolog |

Weighted: 1.60+1.05+0.90+0.90+0.80+0.70+0.35+0.35+0.40+0.40 = **7.45**

### Candidate D: Go Stdlib-First (net/http + chi + pgx + sqlc) — Score: 7.30

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Security (20%) | 9 | Smallest attack surface; no framework CVEs; only stdlib crypto |
| Maintainability (15%) | 6 | No DI; every cross-cutting concern hand-wired; grows complex at SEM's feature count |
| Dev productivity (15%) | 5 | Slowest iteration; no generators; every middleware is manual |
| Scalability (10%) | 9 | Same as Go framework |
| Performance (10%) | 9 | Raw Go performance |
| PostgreSQL (10%) | 7 | Same as Go framework |
| Realtime (5%) | 6 | nhooyr/websocket good but more manual setup |
| Background jobs (5%) | 6 | Manual; no standard library for jobs |
| Testing (5%) | 8 | Same as Go framework |
| Observability (5%) | 7 | Fewer third-party integrations |

Weighted: 1.80+0.90+0.75+0.90+0.90+0.70+0.30+0.30+0.40+0.35 = **7.30**

### Candidate E: Rust + Axum — Score: 7.00

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Security (20%) | 9 | Memory safety at compile time; no buffer overflows; excellent `ring`, `rustls` |
| Maintainability (15%) | 5 | Steep learning curve; ownership model; difficult to hire for |
| Dev productivity (15%) | 4 | Slowest iteration; borrow checker fights service patterns; long compile times |
| Scalability (10%) | 9 | tokio async; minimal memory footprint |
| Performance (10%) | 9 | Fastest possible; but SEM is I/O-bound — advantage rarely manifests |
| PostgreSQL (10%) | 7 | sqlx good; SeaORM less mature; fewer SEM-scale examples |
| Realtime (5%) | 7 | axum WebSocket support; tokio-tungstenite |
| Background jobs (5%) | 6 | `apalis` or custom tokio tasks; less mature |
| Testing (5%) | 7 | cargo test solid; async test support; less rich HTTP integration ecosystem |
| Observability (5%) | 7 | `tracing` crate excellent; OTel Rust SDK maturing |

Weighted: 1.80+0.75+0.60+0.90+0.90+0.70+0.35+0.30+0.35+0.35 = **7.00**

### Weighted Decision Matrix

| Candidate | Sec 20% | Main 15% | Prod 15% | Scale 10% | Perf 10% | PG 10% | RT 5% | Jobs 5% | Test 5% | Obs 5% | **Total** |
|-----------|---------|----------|----------|-----------|----------|--------|-------|---------|---------|--------|-----------|
| NestJS + Fastify | 1.40 | 1.20 | 1.20 | 0.70 | 0.70 | 0.80 | **0.45** | **0.45** | **0.45** | 0.40 | **7.75** |
| FastAPI | 1.40 | 1.20 | **1.35** | 0.70 | 0.70 | 0.80 | 0.35 | 0.35 | **0.45** | 0.40 | **7.70** |
| Go + Framework | 1.60 | 1.05 | 0.90 | **0.90** | 0.80 | 0.70 | 0.35 | 0.35 | 0.40 | 0.40 | **7.45** |
| Go stdlib | **1.80** | 0.90 | 0.75 | **0.90** | **0.90** | 0.70 | 0.30 | 0.30 | 0.40 | 0.35 | **7.30** |
| Rust + Axum | **1.80** | 0.75 | 0.60 | **0.90** | **0.90** | 0.70 | 0.35 | 0.30 | 0.35 | 0.35 | **7.00** |

### Recommendation: NestJS + Fastify (with FastAPI as pragmatic alternative)

**Why NestJS wins:**

1. **Type-sharing with Next.js frontend.** SEM's frontend is Next.js + TypeScript. NestJS with Drizzle generates DB types. `openapi-typescript` converts the OpenAPI spec to TypeScript types consumed by frontend and SDK. Eliminates client/server contract drift.

2. **BullMQ for background jobs is best-in-class.** Secret rotation, email, audit archival, webhooks — all need a durable Redis-backed queue. BullMQ's NestJS integration is the most mature option across all candidates.

3. **WebSocket gateway with Redis adapter.** Current WebSocket is local-only. NestJS Socket.io adapter with Redis pub/sub enables horizontal scaling with zero application code changes.

4. **Module system maps to SEM's domain.** `SecretsModule`, `AuditModule`, `AuthModule`, `UsersModule` — NestJS's architecture is designed for exactly this.

5. **Scores are close (7.75 vs 7.70).** If the team is Python-only and migration speed is the overriding constraint, FastAPI is the valid pragmatic alternative. Both are acceptable.

**Why Rust is rejected:** SEM is I/O-bound. The performance advantage doesn't materialize in practice. Hiring and maintenance burden is real and perpetual. Security products need secure design, not just a memory-safe runtime.

**Why Go frameworks are rejected:** Score well on security and scalability but developer productivity and ecosystem gaps for SEM's specific needs (DI, BullMQ-quality jobs, WebSocket gateway) are meaningful.

---

## Part 4: Cryptography Reassessment

### Current Encryption Audit

| Property | Current | Assessment |
|----------|---------|------------|
| Algorithm | Fernet = AES-128-CBC + HMAC-SHA256 | Weaker than documented; CBC mode; AES-128 not AES-256 |
| Key | Single global key from ENCRYPTION_KEY | No isolation between tenants/namespaces |
| Key rotation | None | No path to rotate without full re-encryption |
| API key salt | Fixed: `b"SecureEnvironmentManager_api_key_v1"` | Parallel cracking if api_keys.json exfiltrated |
| JWT algorithm | HS256 | Shared secret; upgrade to ES256 for multi-service |

### Recommendation: Envelope Encryption with AES-256-GCM

AES-256-GCM over XChaCha20-Poly1305 because:
- FIPS 140-2 compliant (enterprise/government customers)
- AES-NI hardware acceleration makes it faster than software XChaCha20 on modern CPUs
- Wider library support across all candidate stacks
- NIST-standardized; easier compliance documentation

**Key Hierarchy:**

```
Organization Master Key (OMK)
  Stored: MASTER_KEY env var, Docker Secret, or KMS
  Never stored in database

Project Key Encryption Key (PKEK)
  Derived: HKDF-SHA256(OMK, info="sem-kek-v1:" + project_id)
  NOT stored — re-derived on demand

Environment Data Encryption Key (DEK)
  Random 256-bit, generated per environment
  Stored: wrapped with PKEK (AES-256-GCM) in encryption_keys table
  Versioned: integer version column enables rotation
```

**Per-secret encryption:**
```
nonce = random_bytes(12)        # AES-GCM standard 96-bit nonce
aad = encode(secret_id + version)  # authenticated, not encrypted
ciphertext = AES_256_GCM_encrypt(dek, nonce, plaintext, aad)
stored: nonce (12 bytes) + ciphertext + auth_tag (16 bytes)
```

**Key rotation path:**
1. Generate new DEK version for the environment
2. Wrap new DEK with current PKEK → store in encryption_keys
3. Decrypt secrets with old DEK, re-encrypt with new DEK
4. Update `secrets.encryption_key_version`
5. Retire old DEK version

**Fix API key hashing:** Replace fixed salt with per-key random salt. Migrate to Argon2id (preferred over PBKDF2 per current OWASP recommendations):
```
salt = random_bytes(16)
hash = argon2id(key, salt, m=65536, t=3, p=4)
stored: base64(salt) + "$" + base64(hash)
```

**Fix JWT:** Migrate to ES256 (ECDSA P-256). Private key signs; public key verifies. Future services can verify tokens without the signing key.

---

## Part 5: Database Architecture

### Schema

```sql
-- Core hierarchy
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

CREATE TABLE environments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  current_key_version INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, slug)
);

-- Encryption key management (envelope encryption DEKs)
CREATE TABLE encryption_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  version        INTEGER NOT NULL,
  wrapped_dek    BYTEA NOT NULL,  -- DEK encrypted with project PKEK
  algorithm      TEXT NOT NULL DEFAULT 'aes-256-gcm',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired_at     TIMESTAMPTZ,
  UNIQUE(environment_id, version)
);

-- Secrets
CREATE TABLE secrets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id         UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key                    TEXT NOT NULL,      -- plaintext key name (for lookups/indexes)
  encrypted_value        BYTEA NOT NULL,     -- AES-256-GCM ciphertext + auth tag
  nonce                  BYTEA NOT NULL,     -- 12-byte GCM nonce
  encryption_key_version INTEGER NOT NULL,
  version                INTEGER NOT NULL DEFAULT 1,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES users(id),
  updated_by             UUID REFERENCES users(id),
  deleted_at             TIMESTAMPTZ,
  UNIQUE(environment_id, key) WHERE deleted_at IS NULL
);
CREATE INDEX idx_secrets_env ON secrets(environment_id) WHERE deleted_at IS NULL;

-- Immutable version log (never UPDATE, never DELETE)
CREATE TABLE secret_versions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id              UUID NOT NULL REFERENCES secrets(id),
  version                INTEGER NOT NULL,
  encrypted_value        BYTEA NOT NULL,
  nonce                  BYTEA NOT NULL,
  encryption_key_version INTEGER NOT NULL,
  change_type            TEXT NOT NULL CHECK(change_type IN ('create','update','delete')),
  changed_by             UUID REFERENCES users(id),
  changed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(secret_id, version)
);

-- Users
CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username             TEXT NOT NULL,
  email                TEXT,
  password_hash        TEXT NOT NULL,  -- argon2id format
  is_admin             BOOLEAN NOT NULL DEFAULT FALSE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at        TIMESTAMPTZ,
  UNIQUE(org_id, username)
);

-- Roles (admin, developer, viewer, ci — seeded at org creation)
CREATE TABLE roles (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name   TEXT NOT NULL,
  UNIQUE(org_id, name)
);

-- Project-level membership with optional environment restriction
CREATE TABLE memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_id           UUID NOT NULL REFERENCES roles(id),
  environment_slugs TEXT[],  -- NULL = all; otherwise restricted list
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- API Keys
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_prefix   TEXT NOT NULL,    -- first 8 chars for O(1) lookup
  key_hash     TEXT NOT NULL,    -- argon2id with per-key salt
  name         TEXT NOT NULL,
  org_id       UUID NOT NULL REFERENCES organizations(id),
  project_id   UUID REFERENCES projects(id),
  user_id      UUID REFERENCES users(id),
  scopes       JSONB NOT NULL DEFAULT '[]',
  expires_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(id) WHERE revoked_at IS NULL;

-- Sessions (JWT refresh token store)
CREATE TABLE sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_name        TEXT,
  device_type        TEXT,
  ip_address         INET,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at         TIMESTAMPTZ NOT NULL,
  last_used_at       TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ
);
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;

-- Audit events (append-only, partitioned by month)
CREATE TABLE audit_events (
  id             UUID NOT NULL DEFAULT gen_random_uuid(),
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id         UUID NOT NULL,
  project_id     UUID,
  environment_id UUID,
  actor_id       UUID,
  actor_type     TEXT NOT NULL,    -- 'user' | 'api_key' | 'system'
  api_key_id     UUID,
  action         TEXT NOT NULL,    -- 'secret.create' | 'auth.login' etc.
  resource_type  TEXT NOT NULL,
  resource_id    TEXT,
  resource_key   TEXT,             -- key name, NEVER value
  result         TEXT NOT NULL CHECK(result IN ('success','failure','error')),
  ip_address     INET,
  request_id     TEXT,
  metadata       JSONB,            -- never contains secret values
  PRIMARY KEY (timestamp, id)
) PARTITION BY RANGE (timestamp);

-- Prevent UPDATE/DELETE on audit_events
CREATE RULE audit_no_update AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_events DO INSTEAD NOTHING;
```

### Secret Storage Model

| Field | Stored as | Reason |
|-------|-----------|--------|
| Key name | Plaintext | Required for index, lookups, display |
| Secret value | AES-256-GCM encrypted | Core security property |
| Nonce | Plaintext (12 bytes) | Required for decryption; not secret |
| Key version | Plaintext integer | Required to select correct DEK |
| Metadata | Plaintext | Auditable, not sensitive |

Never index or search on encrypted value — requires decrypting all rows.

---

## Part 6: Versioning Architecture

**Recommendation: Immutable Version Records**

| Approach | Storage per change | Rollback | Complexity |
|----------|-------------------|----------|------------|
| Full snapshots (current) | O(all secrets in env) | Simple | Low |
| Deltas | O(changed keys) | Complex | High |
| **Immutable version records** | **O(changed keys)** | **Simple** | **Low** |
| Event sourcing | O(events) | Complex (replay) | Very high |

Immutable version records win: one `secret_versions` row per changed key per operation. Rollback is a single query by `(secret_id, version)`. No event sourcing complexity. Storage estimate: 1000 secrets × 100 versions × ~200 bytes = ~20MB — trivial.

---

## Part 7: Audit Architecture

### Principles
- Append-only: SQL rules + dedicated `INSERT`-only DB user prevent UPDATE/DELETE
- No plaintext secrets: `resource_key` stores variable name; never value
- Partitioned by month: enables cheap archival (DETACH PARTITION → dump → DROP)

### Optional Hash Chain (High-Assurance)
Each event stores `prev_hash = SHA256(prev_event_id || prev_timestamp)`. A stored procedure `verify_audit_chain()` can validate integrity retroactively.

### Event Catalog

| Action | resource_type |
|--------|--------------|
| `secret.create` / `secret.update` / `secret.delete` | `secret` |
| `secret.read` (bulk) | `environment` |
| `secret.rollback` | `secret` |
| `auth.login.success` / `auth.login.failure` / `auth.logout` | `session` |
| `auth.token_refresh` | `session` |
| `api_key.create` / `api_key.revoke` | `api_key` |
| `user.create` / `user.password_change` | `user` |
| `export.download` | `environment` |

---

## Part 8: Authentication Architecture

### Token Model

| Token | TTL | Storage | Purpose |
|-------|-----|---------|---------|
| Access token (JWT ES256) | 15 min | Client-side only | API auth |
| Refresh token (opaque) | 7 days | `sessions` table (SHA-256 hashed) | Token renewal |
| API key | Configurable | `api_keys` table (argon2id) | Machine-to-machine |

**Access token claims:**
```json
{
  "sub": "user:<user_id>",
  "iat": 1727567000,
  "exp": 1727567900,
  "jti": "<unique id>",
  "org_id": "<org_id>",
  "is_admin": false,
  "scopes": ["myapp/production"],
  "credential_type": "user_password"
}
```

**Extensibility:** Define a `CredentialProvider` interface. Adding MFA, OAuth/OIDC, or WebAuthn becomes adding a new provider with no changes to token issuance pipeline.

---

## Part 9: Authorization

### RBAC Model

Built-in roles:

| Role | Secrets | Keys | Users | Audit |
|------|---------|------|-------|-------|
| `admin` | CRUD all envs | CRUD | CRUD | Read all |
| `developer` | CRUD non-prod | Create own | None | Own actions |
| `viewer` | Read all | None | None | Own actions |
| `ci` | Read scoped | API keys only | None | Own actions |

`memberships.environment_slugs = ['staging', 'dev']` restricts a developer from writing production. Enforced at the query level:

```sql
-- Every secret query joins through membership
SELECT s.* FROM secrets s
JOIN environments e ON s.environment_id = e.id
JOIN projects p ON e.project_id = p.id
JOIN memberships m ON (
  m.user_id = $current_user_id
  AND m.project_id = p.id
  AND (m.environment_slugs IS NULL OR e.slug = ANY(m.environment_slugs))
)
WHERE s.id = $1 AND s.deleted_at IS NULL;
```

A bug at the route layer cannot expose cross-project secrets — the query itself enforces scope.

---

## Part 10: API Key Architecture

**Format:** `sem_<base58(8 bytes)>_<base64url(32 bytes)>`
- `sem_` prefix: enables secret scanning tools to detect accidental exposure
- 8-byte identifier: stored as `key_prefix` for O(1) index lookup
- 32-byte secret: argon2id hashed; never stored or retrievable in plaintext

**Lookup (O(1) by prefix):**
```sql
SELECT * FROM api_keys
WHERE key_prefix = $prefix
  AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW());
-- Then verify argon2id hash for matching rows (typically 1)
```

This replaces the current O(n × 480k_iterations) full-file scan.

---

## Part 11: Remote Dotenv Server

Dedicated endpoint, separate from dashboard API path:

```
GET /api/v1/remote/<project-slug>/<env-slug>
Authorization: Bearer sem_<key>
Accept: application/json | text/plain

Response:
{
  "data": { "DATABASE_URL": "...", "SECRET_KEY": "..." },
  "version": 42,
  "fetched_at": "2026-09-29T10:00:00Z"
}

Headers:
  ETag: "v42"
  Cache-Control: max-age=60

Conditional:
GET ... If-None-Match: "v42"
→ 304 Not Modified (no body; no secret transmission)
```

Rate limiting: Redis token bucket per API key (100 req/min default), separate from dashboard limits.
Audit: one event per fetch (`secret.read`, resource_type=`environment`).

---

## Part 12: Realtime Architecture

**WebSocket events (metadata only — no secret values in payloads):**
- `secret.updated` → key name, project, env, actor
- `audit.event` → action, actor (admin-only room)
- `session.revoked` → force logout

**Architecture:**
```
Client → WS Gateway → Auth guard → Room subscription
                                        ↓
Backend service → emit → Redis Pub/Sub → All WS instances → Rooms
```

**Redis Pub/Sub required** for horizontal scaling. One Redis channel per (project_id + environment_id). Socket.io Redis adapter handles fan-out automatically.

Kafka/NATS not needed at SEM's scale.

---

## Part 13: Background Jobs

Redis + BullMQ (NestJS) or Redis + arq (FastAPI):

| Job | Trigger | Priority |
|-----|---------|----------|
| `send-email` | User created, invitation, reset | High |
| `rotate-secret` | RotationPolicy cron | Normal |
| `audit-archive` | Monthly cron | Low |
| `expire-sessions` | Hourly cron | Low |
| `webhook-deliver` | Secret change event | High with retries |

Synchronous secret reads/writes stay synchronous — never use background jobs for the critical read path.

---

## Part 14: Observability

### What NEVER Goes in Telemetry
- Secret values (plaintext or ciphertext)
- Encryption keys or key material
- Raw tokens (access, refresh, API key)
- Password hashes or salts
- Full request/response bodies when they may contain secrets

### Structured Logging
Every log line is JSON:
```json
{
  "level": "info",
  "timestamp": "2026-09-29T10:00:00.123Z",
  "request_id": "abc123",
  "service": "sem-api",
  "msg": "secret updated",
  "org_id": "...",
  "project": "myapp",
  "environment": "production",
  "actor": "user:alice",
  "duration_ms": 12
}
```

### Key Metrics

| Metric | Labels |
|--------|--------|
| `sem_api_requests_total` | method, path, status |
| `sem_api_request_duration_ms` | p50/p95/p99 |
| `sem_auth_failures_total` | reason |
| `sem_secret_operations_total` | operation, project |
| `sem_db_query_duration_ms` | query_name |
| `sem_job_executions_total` | job_type, result |
| `sem_ws_connections_active` | |
| `sem_encryption_operations_total` | operation |

---

## Part 15: Deployment Architecture

### Self-Hosted Docker Compose (v2)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]

  api:
    build: ./apps/api
    user: "1000:1000"
    security_opt: [no-new-privileges:true]
    cap_drop: [ALL]
    environment:
      DATABASE_URL: postgresql://sem:${DB_PASSWORD}@postgres:5432/sem
      REDIS_URL: redis://redis:6379
      MASTER_KEY: ${MASTER_KEY}
    depends_on: [postgres, redis]

  worker:
    build: ./apps/api
    command: node dist/worker.js
    user: "1000:1000"
    environment: same as api

  web:
    build: ./apps/web
    environment:
      NEXT_TELEMETRY_DISABLED: "1"

  postgres:
    image: postgres:16-alpine
    user: postgres
    volumes: [pg-data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes: [redis-data:/data]
```

Architecture is stateless API + Redis from day one. Scaling from single-node to multi-node: add load balancer, add more `api` containers. No code changes required.

---

## Part 16: Migration from Current SEM

### Migration Utility

```
python migrate_to_v2.py \
  --source-data-dir ./data \
  --source-key $ENCRYPTION_KEY \
  --target-db $DATABASE_URL \
  --target-master-key $MASTER_KEY \
  [--dry-run]
```

**Algorithm:**
```
1. PREFLIGHT
   - Read all .enc files, attempt decrypt with source key
   - Count: namespaces, environments, variables, history entries, audit events
   - Record file checksums
   - Abort if any decryption fails

2. TRANSFORM (in transaction)
   - Create org from env var or hostname
   - namespace → project; environment → environment
   - For each .enc: decrypt → for each key/value: encrypt with new DEK → INSERT secrets
   - For each .history.jsonl: diff adjacent snapshots → INSERT secret_versions
   - For each audit.jsonl entry: map action names → INSERT audit_events

3. VERIFY
   - Count rows in secrets, secret_versions, audit_events
   - Spot-check 10 random secrets: decrypt from new DB, compare to source
   - Print verification report

4. REPORT
   - Migrated: X projects, Y environments, Z secrets, W audit events
   - Failed: list with reason
   - NEVER print plaintext secret values

5. DRY-RUN: runs steps 1-3 in a transaction, then ROLLBACK
```

### Zero Data Loss Protocol

Before migration:
1. Backup: `cp -r data/ data_backup_$(date +%Y%m%d)/`
2. Checksums: `sha256sum data/**/*.enc > checksums_before.txt`
3. Counts: `find data -name "*.enc" | wc -l`

After migration:
1. Count DB rows vs source counts
2. Spot-check 10 random secrets
3. Test: login → JWT → read secret → revoke session

### Backward Compatibility

- `/api/v1/<namespace>/<environment>` endpoint preserved with same response shape
- Bearer token auth preserved (API keys mapped to new `api_keys` table)
- CLI (`scripts/dotenv-cli.py`) continues to work — same API contract
- JWT token format changes (HS256 → ES256): clients must re-authenticate

---

## Part 17: Repository Structure

**Recommendation: pnpm + Turborepo monorepo**

SEM already has coupled web + backend. SDK and CLI are planned. Type-sharing from OpenAPI spec across packages is significantly easier in a monorepo.

```
sem/
├── apps/
│   ├── api/               # NestJS (or FastAPI) backend
│   ├── web/               # Next.js frontend
│   └── worker/            # Background job worker
├── packages/
│   ├── types/             # Generated from OpenAPI spec
│   ├── sdk/               # TypeScript SDK for Node.js
│   └── crypto/            # Shared crypto utilities
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── postgres/migrations/
├── tools/
│   └── migrate/           # v1 → v2 migration utility
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Part 18: Security Boundaries

### Authentication Boundary
`POST /api/v1/auth/login` only. Identity always comes from the verified JWT or API key prefix. Never trust `user_id` from request body or query params.

### Authorization Boundary
At the service layer, in every database query. The join-through-memberships pattern (Part 9) means authorization cannot be bypassed by a missing route-level check — the query itself enforces scope.

### Encryption Boundary
Only within the encryption service. The service takes `(environment_id, key)` and returns `encrypted_value + nonce`. Callers never hold the DEK directly. Plaintext exists only within the service for the duration of the operation, and in the API response over TLS.

Plaintext never appears in: logs, metrics, traces, audit events, error messages, or analytics.

### Persistence Boundary
Encrypted values only hit the database. Key names are plaintext (required for queries). Metadata is plaintext. Audit events contain key names, never values.

### Audit Boundary
Every state-changing operation generates an audit event before the response is sent, enforced at the service layer. Audit failures should fail the request or queue for retry — silent audit failure is unacceptable for a secrets manager.

### External Integration Boundary
Outbound (email, webhooks, KMS): TLS only. Webhook payloads contain metadata — never secret values. KMS calls use minimum required permissions. Inbound (remote dotenv clients): API key auth with scope enforcement at the query level.

---

## Summary: Priority Fixes Regardless of Stack Decision

These are the highest-priority architectural fixes, in order:

1. **Fix API key salt** (api_key_service.py:119) — Replace fixed salt with per-key random salt. One sprint. Do this now regardless of migration plans.

2. **Fix `identify_token()` bug** (core/auth.py:229) — It uses SHA-256 not PBKDF2, so it never finds modern keys. This is a functional bug.

3. **Migrate to PostgreSQL + Redis** — Fixes distributed state (sessions, rate limiting, WebSocket), enables horizontal scaling, enables O(1) audit queries.

4. **Envelope encryption with AES-256-GCM** — Per-environment DEKs. Enables key rotation and per-project key isolation.

5. **Fix JWT algorithm** — HS256 → ES256.

6. **Replace O(n) API key verification** — key_prefix index eliminates the full-file scan per request.

7. **Background job worker** — Email and future secret rotation must not block the request thread.

**Stack choice** (NestJS or FastAPI) is secondary to the above. The security fixes in 1-2 should be deployed to the current Flask backend immediately, without waiting for a migration.
