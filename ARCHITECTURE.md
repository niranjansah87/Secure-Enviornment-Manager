# ARCHITECTURE.md

<!-- AUTO-GENERATED START -->
<!-- High-level system architecture -->
<!-- AUTO-GENERATED END -->

## Current architecture (v2 — 2026)

> The project migrated off the original Flask backend. The sections below the
> divider describe that **historical** Flask architecture and are retained for
> reference only. They no longer reflect the running system.

SEM is now a **pnpm + Turbo monorepo**:

- **Backend — `apps/api`**: NestJS (Fastify adapter), listening on **port 3001**,
  all routes under `/api/v1`. Persistence via **Drizzle ORM + PostgreSQL**;
  **Redis** (ioredis) for sessions/rate-limiting; **BullMQ** worker in
  `apps/worker`. Auth is JWT (ES256) with refresh-token rotation; secrets are
  encrypted with envelope encryption (AES-256-GCM DEK/KEK). Shared packages:
  `@sem/crypto`, `@sem/types`, `@sem/sdk`. CLI in `cli/`.
- **Frontend — `frontend/`**: Next.js 15 (App Router) + React 19 + Tailwind +
  Radix, framer-motion, Recharts, Lenis, Sonner. Talks to the NestJS API via
  `src/lib/sem-api.ts` (envelope `{ success, data }`); auth/workspace state in
  `src/context/workspace-context.tsx`; URL model `/[projectSlug]/[envSlug]`.
- **Domains** (org-scoped, JWT-guarded): auth, organizations, projects,
  environments, secrets (+ versions/rollback/history/export/bulk/remote-config),
  api-keys, audit, analytics, users, health.

Run locally: `pnpm install`, provision Postgres + Redis, set `.env`
(`DATABASE_URL`, `REDIS_URL`, `SEM_MASTER_KEY`, `SEM_TOKEN_HMAC_KEY`, JWT keys),
`pnpm db:migrate`, then `pnpm dev` (API) and `cd frontend && npm run dev` (UI on
:3000). Templates in the UI are client-side starter presets (no backend domain yet).

---

## System Architecture (historical — Flask)

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                         │
└────────────────────────┬──────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Reverse Proxy                             │
│              (Caddy/Nginx on domain.com)                     │
│              Terminates HTTPS, forwards to                   │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             │ localhost:3080             │ localhost:8070
             ▼                            ▼
┌────────────────────────┐    ┌───────────────────────────────┐
│    Next.js Frontend   │    │      Flask Backend API        │
│      (Port 3000)       │    │        (Port 8070)           │
│                       │    │                             │
│  React 19 + Tailwind │    │  Fernet Encryption           │
│  TanStack Table      │    │  Session Auth               │
│  Framer Motion      │    │  File Storage               │
│  Recharts           │    │  Prometheus Metrics         │
└────────────────────────┘    └─────────────┬───────────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                         ▼                   ▼                   ▼
               ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
               │  data/*        │  │ audit_logs/    │  │ monitoring/   │
               │  *.enc         │  │ audit.jsonl    │  │ prometheus/   │
               │  *.history     │  │                │  │ grafana/      │
               └────────────────┘  └────────────────┘  └────────────────┘
```

## Component Responsibilities

### Frontend (Next.js)

**Purpose:** User interface for managing secrets

**Location:** `frontend/`

**Key Directories:**
- `frontend/src/app/` — Next.js App Router pages
- `frontend/src/components/` — Reusable UI components
- `frontend/src/lib/` — Utilities and API client
- `frontend/src/context/` — React Context providers

**Authentication Flow:**
1. User enters API token on login page
2. Token stored in localStorage via `saveToken()`
3. All API calls include `Authorization: Bearer <token>`
4. Invalid token redirects to login

**Key Pages:**
| Route | Purpose |
|-------|---------|
| `/login` | Token entry page |
| `/dashboard` | Global statistics |
| `/projects` | Namespace list |
| `/[namespace]/[environment]` | Secrets CRUD |
| `/[namespace]/[environment]/history` | Version history |
| `/[namespace]/[environment]/audit` | Audit logs |
| `/[namespace]/[environment]/compare` | Diff view |
| `/[namespace]/[environment]/templates` | Template management |
| `/analytics` | Activity analytics |

### Backend (Flask)

**Purpose:** API server, encryption, file storage

**Location:** Root directory

**Key Modules:**
| Module | Responsibility |
|--------|----------------|
| `app.py` | Main Flask application, routes, settings |
| `history_manager.py` | Encrypted version snapshots |
| `audit_logger.py` | Append-only audit log |
| `analytics_service.py` | Trends and statistics |
| `health_service.py` | Health checks |

**Settings (`Settings` class):**
- Loaded from environment variables
- Validates required vars at startup
- Configures Flask app behavior

### Storage Architecture

**Secret Storage:**
```
data/
├── namespace1/
│   ├── environment1.enc  (Fernet-encrypted JSON)
│   └── environment2.enc
└── namespace2/
    └── production.enc
```

**History Storage:**
```
data/
└── namespace1/
    └── environment1.history.jsonl  (one JSON object per line)
```

**Audit Storage:**
```
audit_logs/
└── audit.jsonl  (one JSON object per line)
```

### API Design

**Base URL:** `http://localhost:8070/api/v1/`

**Authentication:**
All API endpoints require `Authorization: Bearer <token>` header.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/meta/environments` | List all environments |
| GET | `/meta/stats` | Global statistics |
| GET | `/meta/analytics` | Activity trends |
| GET | `/meta/health` | System health |
| GET | `/meta/logins` | Login history |
| GET | `/:namespace/:environment` | Get all secrets |
| PUT | `/:namespace/:environment` | Replace all secrets |
| PATCH | `/:namespace/:environment` | Update/create secrets |
| DELETE | `/:namespace/:environment/keys/:key` | Delete a secret |
| POST | `/:namespace/:environment/bulk` | Bulk replace |
| GET | `/:namespace/:environment/history` | Version history |
| POST | `/:namespace/:environment/rollback` | Rollback |
| GET | `/:namespace/:environment/audit` | Audit logs |
| POST | `/:namespace/:environment/templates/apply` | Apply template |

### Security Architecture

**Authentication Layers:**
1. Bearer token validation
2. Session authentication for web UI
3. Rate limiting via login attempt tracking

**Encryption Layers:**
1. Fernet encryption for data at rest
2. TLS transport encryption (via reverse proxy)
3. CSRF protection via HMAC tokens

**Audit Trail:**
- All secret modifications logged
- All authentication events logged
- Exports logged (no values stored)

### Monitoring Architecture

**Prometheus Metrics:**
- Exposed at `/metrics`
- Collected by Prometheus server
- Visualized in Grafana

**Health Checks:**
- Encryption key validity
- Disk space availability
- Process resource usage
- Directory structure integrity

## Data Flow

### Secret Update Flow
```
User → Frontend → API PATCH → Backend
                            │
                            ├── validate_csrf()
                            ├── read_vars()
                            ├── write_vars()
                            ├── history_manager.save_snapshot()
                            ├── audit_logger.log_variable_update()
                            └── Response 200
```

### Secret Read Flow
```
User → Frontend → API GET → Backend
                          │
                          ├── api_auth_ok()
                          ├── read_vars() → Fernet decrypt
                          ├── audit_logger.log_export()
                          └── Response JSON
```

### Rollback Flow
```
User → Frontend → API POST /rollback → Backend
                                    │
                                    ├── validate snapshot_id
                                    ├── history_manager.get_snapshot()
                                    ├── write_vars()
                                    ├── history_manager.save_snapshot()
                                    └── Response 200
```

## Deployment Architecture

**Development:**
```bash
# Terminal 1
python app.py  # Backend on :8070

# Terminal 2
cd frontend && npm run dev  # Frontend on :3000
```

**Production (Docker):**
```bash
docker compose up -d --build
```

**Service URLs:**
- Frontend: `http://localhost:3080`
- Backend API: `http://localhost:8070`
- Prometheus: `http://localhost:9095`
- Grafana: `http://localhost:3002` (if enabled)

## Scalability Considerations

**Current Limitations:**
- File-based storage (no concurrent database)
- Single-backend deployment
- No horizontal scaling without shared filesystem
- Audit log grows unbounded

**Potential Improvements:**
- PostgreSQL for storage and audit
- Redis for session management
- Multi-backend deployment with load balancer
- Log rotation for audit files
- Secret versioning with actual diff storage