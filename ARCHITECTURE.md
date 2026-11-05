# Architecture Specification — Secure Environment Manager V2

This document provides a comprehensive technical overview of the architecture, security boundaries, cryptographic lifecycle, and data flow of Secure Environment Manager (SEM).

---

## 1. High-Level System Architecture

SEM is architected as a modular, distributed, multi-tenant secrets management system.

```mermaid
graph TD
    Client["Client Devices / Consumers<br/>(Browser, CLI, SDK, CI/CD)"]
    Proxy["Reverse Proxy / TLS Terminator<br/>(Nginx / Caddy)"]
    Frontend["Frontend App<br/>Next.js 16 (Port 3000)"]
    API["Backend REST & WS API<br/>NestJS + Fastify (Port 3001)"]
    Worker["Background Worker<br/>BullMQ (@sem/worker)"]
    Postgres[("PostgreSQL 16<br/>(Encrypted Secrets, Snapshots, RBAC)")]
    Redis[("Redis 7<br/>(Token Lookup, Sessions, Rate Limits, Queues)")]

    Client -->|HTTPS / WSS| Proxy
    Proxy -->|HTTP :3000| Frontend
    Proxy -->|HTTP / WS :3001| API
    Frontend -.->|REST / WebSocket| API
    API -->|Drizzle ORM| Postgres
    API -->|ioredis| Redis
    Worker -->|Queue Jobs| Redis
    Worker -->|DEK Maintenance| Postgres
```

---

## 2. Cryptographic Architecture & Key Hierarchy

SEM uses **envelope encryption** based on authenticated AES-256-GCM. Plaintext secret values are never encrypted directly with root credentials.

```mermaid
graph TD
    subgraph Storage ["Key Hierarchy"]
        MK["Master Key (SEM_MASTER_KEY)<br/>32-byte AES root key (Env / Vault)"]
        KEK["Project Key Encryption Key (KEK)<br/>Unique 256-bit AES key per project"]
        DEK["Environment Data Encryption Key (DEK)<br/>Unique 256-bit AES key per environment"]
        Secret["Secret Value<br/>Plaintext Environment Variable"]
    end

    MK -->|Wraps via AES-256-GCM| KEK
    KEK -->|Wraps via AES-256-GCM| DEK
    DEK -->|Encrypts with AAD location binding| Secret
```

### Cryptographic Invariants
1. **Authenticated Encryption**: All symmetric operations use `aes-256-gcm` with 128-bit authentication tags. Tampering with ciphertext or authentication tags immediately aborts decryption.
2. **Deterministic Nonces**: Every encryption operation generates a cryptographically random 12-byte (96-bit) initialization vector via `crypto.randomBytes(12)`. Nonces are never reused.
3. **Additional Authenticated Data (AAD)**: Ciphertext is cryptographically bound to its resource coordinates:
   $$\text{AAD} = \text{"sem:secret:"} \parallel \text{orgId} \parallel \text{":"} \parallel \text{projectId} \parallel \text{":"} \parallel \text{envId} \parallel \text{":"} \parallel \text{key} \parallel \text{":v"} \parallel \text{version}$$
   If an adversary copies ciphertext from `production` to `staging` or changes the secret key, decryption fails verification.
4. **Zero Key Exposure**: Plaintext DEK buffers are held in memory only for the duration of the cryptographic operation and wiped with zeroes (`dek.fill(0)`) in `finally` blocks.

---

## 3. Authentication & Token Lifecycle

SEM implements asymmetric authentication via **ECDSA P-256 (ES256)** JWTs combined with opaque, single-use refresh tokens.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Web / CLI / SDK)
    participant Auth as Auth Domain (@sem/api)
    participant Redis as Redis 7 (Cache & Sessions)
    participant DB as PostgreSQL 16

    User->>Auth: POST /api/v1/auth/login (Credentials / API Key)
    Auth->>DB: Query user record & verify Argon2id hash
    Auth->>Auth: Generate ES256 Access Token (900s TTL)
    Auth->>Auth: Generate Single-Use Refresh Token (semr_...)
    Auth->>Redis: Store Token Family & Lookup HMAC
    Auth-->>User: Return Access Token + Refresh Token + Session ID

    Note over User,Auth: Subsequent Authenticated Requests
    User->>Auth: Request with Authorization: Bearer <AccessToken>
    Auth->>Auth: Verify ES256 Signature, Claims, Expiry & Tenant

    Note over User,Auth: Token Refresh Flow & Rotation
    User->>Auth: POST /api/v1/auth/refresh { refresh_token }
    Auth->>Redis: Lookup Token Family & Check Consumption State
    alt Token Already Consumed (Reuse Detected)
        Auth->>Redis: Revoke entire token family (Security Alert)
        Auth-->>User: 401 Unauthorized (Session Invalidated)
    else Token Valid
        Auth->>Auth: Issue fresh Access Token & fresh Refresh Token
        Auth->>Redis: Mark old token consumed, register new token
        Auth-->>User: Return new token pair
    end
```

---

## 4. API Request & Authorization Pipeline

Every request to `@sem/api` passes through strict defense-in-depth filters:

```mermaid
flowchart LR
    Req[Incoming HTTP Request] --> Throttler[RateLimiter<br/>Sliding Window]
    Throttler --> Helmet[Fastify Helmet<br/>CSP / HSTS]
    Helmet --> Cors[CORS Guard<br/>Strict Whitelist]
    Cors --> JwtGuard[JwtAuthGuard<br/>ES256 Verification]
    JwtGuard --> MustChangePass[MustChangePassword<br/>Enforcement]
    MustChangePass --> PermGuard[PermissionsGuard<br/>RBAC & Scopes]
    PermGuard --> Controller[Domain Controller<br/>Tenant-Isolated Handler]
    Controller --> Audit[AuditService<br/>Immutable Log]
    Audit --> Res[HTTP Response]
```

---

## 5. Secret History, Snapshots & Rollback

```mermaid
stateDiagram-v2
    [*] --> ActiveVersion: Upsert Secret
    ActiveVersion --> ArchivedVersion: Update / Mutation
    ArchivedVersion --> ActiveVersion: Rollback Request
    ActiveVersion --> EnvironmentSnapshot: Snapshot Creation (Tagged State)
    EnvironmentSnapshot --> RestoredEnvironment: Snapshot Restore
```

1. **Version History**: Secrets maintain an append-only version history. Overwriting a secret increments its version and archives previous encrypted payloads.
2. **Environment Snapshots**: Point-in-time snapshots capture the encrypted state of all variables in an environment, sealed with dedicated snapshot AAD.
3. **Rollback Guarantee**: Restoring an earlier version or snapshot generates a new forward version entry and triggers a cryptographic audit event.

---

## 6. Threat Model & Security Boundaries

| Threat | Mitigation Mechanism |
| :--- | :--- |
| **Database compromise / SQL leak** | Secrets at rest are AES-256-GCM encrypted; keys are never stored in the database. |
| **Ciphertext substitution / moving** | AAD binds ciphertext to tenant, project, environment, key, and version. |
| **JWT algorithm confusion** | Verification strictly enforces ES256 algorithm; HMAC and none algorithms are rejected. |
| **Refresh token theft** | Single-use refresh token rotation with automated family reuse detection. |
| **Cross-tenant data access (IDOR)** | Tenant ID (`orgId`) is derived exclusively from verified JWT identity claims. |
| **Credential brute force** | Redis-backed sliding window rate limiter locks IPs after repeated failures. |
| **Timing attacks** | Constant-time comparisons (`safeCompare`) and dummy Argon2 verification for missing users. |
