# SEM Platform Stabilization — Design Specification
**Date:** 2026-05-15
**Author:** Principal Engineer
**Status:** APPROVED

---

## 1. Overview & Goals

This spec defines the phased stabilization, refactoring, and synchronization of the Secure Environment Manager (SEM) platform. The goal is production-grade reliability without adding unnecessary infrastructure complexity.

### Guiding Principles

- **Privacy-first, self-hosted** — Secrets remain on customer infrastructure
- **JWT everywhere** — Single auth architecture across all clients
- **Minimal regressions** — Incremental safe refactors, never massive rewrites
- **Full compatibility** — Backend contract changes propagate to all client layers
- **No unnecessary complexity** — No Kubernetes, Redis clustering, or microservice decomposition

### Constraints

- Encrypted JSON secrets storage (preserved)
- PostgreSQL metadata persistence (preserved)
- Firebase only for crashlytics/analytics/app distribution (verified)
- WebSocket single-instance first (Redis optional later)

---

## 2. Architecture Decisions

### 2.1 Auth Architecture — JWT Everywhere (Option C1)

**Decision:** Modify existing `/api/v1/auth/login` endpoint internally to return JWT instead of setting a session cookie. Preserve URL compatibility. Web frontend migrates from cookie-reading to localStorage + Bearer header.

**Rationale:** Minimizes frontend/client regressions. Single auth endpoint URL, unified auth lifecycle.

**Migration Path:**
1. Keep existing session auth endpoint alive during transition
2. Internally return JWT response AND set session cookie (dual response)
3. Web frontend updated to use JWT from localStorage
4. After validation, deprecate session cookie behavior
5. Remove legacy session middleware gradually

**Session Auth Endpoint:** `/api/v1/auth/login` → returns `{ access_token, refresh_token }` (JWT) + optionally sets cookie for backward compatibility during transition

**JWT Auth Endpoints** (already exist, use as reference):
- `/api/v1/auth/jwt/login` — JWT login
- `/api/v1/auth/jwt/refresh` — Token refresh
- `/api/v1/auth/jwt/logout` — Logout

**All clients use:**
- Bearer token in Authorization header
- localStorage for token storage (web/mobile/SDK/CLI)

### 2.2 WebSocket Strategy — Minimal Production Fix (Option B)

**Decision:** Fix auth middleware + reconnect logic in `websocket_server.py`. Skip Redis adapter for single-instance deployment. Can add Redis later without API changes.

**Rationale:** Production-ready without infrastructure complexity. Single-instance WebSocket is sufficient for self-hosted deployments.

**Components:**
- `websocket_server.py` — Flask-SocketIO integration (already exists, fix auth)
- `ws_service.py` — Event hooks and service layer (already exists, productionize)

**Fixes Required:**
1. WebSocket auth middleware — validate JWT on connect
2. Room/session mapping — track which rooms a session has joined
3. Heartbeat handling — ping/pong with timeout detection
4. Reconnect recovery — client re-subscribes on reconnect
5. Event deduplication — avoid duplicate events on reconnect

**No Redis** — Local-only message queue for single-instance deployment.

### 2.3 Massive File Strategy — Hybrid Split (Option C)

**Decision:** Split files in priority order, maintaining backward compatibility.

**Priority 1 (Immediate):**
- `audit_logger.py` (~18.5K lines) → split into: file_logger, audit_service, event_handlers, constants
- `sdk/javascript/src/index.ts` (~19K lines) → split into: auth/, secrets/, environments/, ws/, audit/

**Priority 2 (After Validation):**
- `analytics_service.py` (~6.4K lines) → split into: analytics_service, stats_aggregator
- `history_manager.py` (~4.3K lines) → split into: history_service, snapshot_manager

**Rationale:** High-risk files first (audit_logger is critical path). SDK is developer-facing (must maintain API compatibility).

**Backward Compatibility:** All existing imports continue to work via wrapper modules.

---

## 3. Phase Definitions

### Phase 1: Auth Unification

**Goal:** Single JWT auth architecture across all clients.

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 1.1 | Read existing session auth handler (`routes/auth_routes.py`) | LOW | Revert file |
| 1.2 | Modify `/api/v1/auth/login` to return JWT response | MEDIUM | Feature flag |
| 1.3 | Update web frontend `lib/auth-api.ts` to use JWT response | MEDIUM | Revert file |
| 1.4 | Update web frontend `lib/utils.ts` — replace cookie reads with localStorage | MEDIUM | Revert file |
| 1.5 | Update web frontend `workspace-context.tsx` — Bearer token in headers | MEDIUM | Revert file |
| 1.6 | Verify Flutter `auth_repository.dart` uses correct JWT endpoints | LOW | No change needed |
| 1.7 | Verify CLI `auth.ts` uses correct JWT endpoints | LOW | No change needed |
| 1.8 | Verify SDK `auth/` module uses correct JWT endpoints | LOW | No change needed |
| 1.9 | Add deprecation notice to session cookie code | LOW | Remove notice |
| 1.10 | Validate full auth flow: login → token storage → API calls → refresh | HIGH | Revert all |

**Validation Checkpoints:**
- [ ] Web login works → JWT in localStorage
- [ ] API calls include `Authorization: Bearer <token>`
- [ ] Token refresh succeeds
- [ ] Logout invalidates tokens
- [ ] Mobile app login works
- [ ] CLI login works

### Phase 2: WebSocket Productionization

**Goal:** Production-ready WebSocket with proper auth, heartbeat, and reconnect.

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 2.1 | Read `websocket_server.py` — understand current auth flow | LOW | N/A |
| 2.2 | Fix JWT auth in WebSocket connect handler | MEDIUM | Revert file |
| 2.3 | Add room tracking for session → room mapping | LOW | Remove tracking |
| 2.4 | Implement ping/pong heartbeat in `websocket_server.py` | LOW | Remove heartbeat |
| 2.5 | Read `ws_service.py` — understand event hook system | LOW | N/A |
| 2.6 | Productionize `ws_service.py` event hooks | MEDIUM | Revert changes |
| 2.7 | Read frontend WebSocket handler | LOW | N/A |
| 2.8 | Fix frontend WebSocket reconnect logic | MEDIUM | Revert file |
| 2.9 | Fix Flutter WebSocket handler — reconnect + auth | MEDIUM | Revert file |
| 2.10 | Validate WebSocket: connect → subscribe → event → disconnect → reconnect | HIGH | Revert all |

**Validation Checkpoints:**
- [ ] WebSocket connects with JWT auth
- [ ] Subscribe to namespace:environment room
- [ ] Secret change event received by subscribed client
- [ ] Client reconnect re-subscribes automatically
- [ ] Stale connections cleaned up

### Phase 3: Massive File Modularization

**Goal:** Split critical files into maintainable modules with backward compatibility.

**Priority 1 Files:**

**`audit_logger.py` → Split into:**
```
services/
  __init__.py
  audit_service.py      # Main audit service (log_event, log_login_*, etc.)
  audit_file_logger.py  # File append-only writer
  audit_constants.py    # Event types, severity levels
handlers/
  __init__.py
  auth_event_handler.py # Login/logout event handling
  secret_event_handler.py # Secret CRUD event handling
  admin_event_handler.py  # Admin action event handling
```

**`sdk/javascript/src/index.ts` → Split into:**
```
src/
  index.ts              # Re-exports all public APIs (backward compat)
  auth/
    index.ts            # Auth module exports
    client.ts           # Auth HTTP calls
    types.ts            # Auth types
  secrets/
    index.ts            # Secrets module exports
    client.ts           # Secrets HTTP calls
    types.ts            # Secrets types
  environments/
    index.ts            # Environments module exports
    client.ts           # Environments HTTP calls
    types.ts            # Environments types
  ws/
    index.ts            # WebSocket module exports
    client.ts           # WebSocket client
    types.ts            # WebSocket types
  audit/
    index.ts            # Audit module exports
    client.ts           # Audit HTTP calls
    types.ts            # Audit types
  core/
    index.ts            # Core exports
    api-base.ts        # Base API client
    errors.ts          # Error types
    types.ts           # Shared types
```

**Backward Compatibility Strategy:**
- `audit_logger.py` → `from audit_logger import audit_logger` still works (wrapper)
- SDK `index.ts` → Re-exports all public methods from sub-modules

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 3.1 | Read `audit_logger.py` — understand all exports and usages | LOW | N/A |
| 3.2 | Create `services/audit_service.py` — extract core service | MEDIUM | Revert files |
| 3.3 | Create `services/audit_file_logger.py` — extract file writer | MEDIUM | Revert files |
| 3.4 | Create `services/audit_constants.py` — extract constants | LOW | Revert files |
| 3.5 | Create `handlers/auth_event_handler.py` | LOW | Revert files |
| 3.6 | Create `handlers/secret_event_handler.py` | LOW | Revert files |
| 3.7 | Create `handlers/admin_event_handler.py` | LOW | Revert files |
| 3.8 | Create `audit_logger.py` wrapper for backward compat | MEDIUM | Revert files |
| 3.9 | Update imports in all files referencing old `audit_logger.py` | MEDIUM | Revert files |
| 3.10 | Read `sdk/javascript/src/index.ts` — understand all exports | LOW | N/A |
| 3.11 | Create SDK `auth/` module | MEDIUM | Revert files |
| 3.12 | Create SDK `secrets/` module | MEDIUM | Revert files |
| 3.13 | Create SDK `environments/` module | MEDIUM | Revert files |
| 3.14 | Create SDK `ws/` module | MEDIUM | Revert files |
| 3.15 | Create SDK `audit/` module | MEDIUM | Revert files |
| 3.16 | Create SDK `core/` module | MEDIUM | Revert files |
| 3.17 | Create SDK `index.ts` re-exports for backward compat | MEDIUM | Revert files |
| 3.18 | Build SDK and verify npm package produces valid output | HIGH | Revert files |
| 3.19 | Validate all SDK tests still pass | HIGH | Revert files |

**Validation Checkpoints:**
- [ ] `python -c "from audit_logger import audit_logger; print('OK')"`
- [ ] All audit_logger usages in backend still work
- [ ] `npm run build` succeeds for SDK
- [ ] SDK tests pass
- [ ] No TypeScript errors in SDK

### Phase 4: Frontend/Backend Synchronization

**Goal:** Ensure API contracts, response envelopes, and websocket events are consistent.

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 4.1 | Audit all backend API response envelopes (`api_response()`) | LOW | N/A |
| 4.2 | Audit frontend `api.ts` response parsing | LOW | N/A |
| 4.3 | Fix response envelope inconsistencies | MEDIUM | Revert files |
| 4.4 | Audit all websocket event names in backend | LOW | N/A |
| 4.5 | Audit all websocket event handlers in frontend | LOW | N/A |
| 4.6 | Fix websocket event name mismatches | MEDIUM | Revert files |
| 4.7 | Audit pagination in backend endpoints | LOW | N/A |
| 4.8 | Audit pagination in frontend API client | LOW | N/A |
| 4.9 | Fix pagination inconsistencies | MEDIUM | Revert files |
| 4.10 | Validate end-to-end: API call → response → UI update | HIGH | Revert all |

**Validation Checkpoints:**
- [ ] All API calls return consistent envelope `{ success, data, error }`
- [ ] All websocket events handled correctly by frontend
- [ ] Pagination works on all paginated endpoints

### Phase 5: Flutter Synchronization

**Goal:** Verify Flutter uses backend JWT auth as single auth source, Firebase not used for auth.

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 5.1 | Check `pubspec.yaml` — ensure `firebase_auth` NOT present | LOW | Revert file |
| 5.2 | Check `firebase_options.dart` — verify non-auth Firebase init | LOW | Revert file |
| 5.3 | Verify Flutter `auth_repository.dart` uses backend JWT auth | LOW | N/A |
| 5.4 | Verify Flutter `auth_bloc.dart` handles token refresh | MEDIUM | Revert files |
| 5.5 | Verify Flutter websocket handler uses JWT auth | MEDIUM | Revert files |
| 5.6 | Verify Flutter secure storage for tokens | LOW | Revert files |
| 5.7 | Fix Flutter CI `flutter.yml` — correct flavor syntax | MEDIUM | Revert file |
| 5.8 | Validate Flutter login flow | HIGH | Revert all |

**Validation Checkpoints:**
- [ ] `firebase_auth` NOT in `pubspec.yaml`
- [ ] Flutter login → backend JWT auth → token stored in secure storage
- [ ] Token refresh works in Flutter
- [ ] Flutter QA build succeeds

### Phase 6: SDK Modularization

**Goal:** Split SDK into modules, maintain 100% API compatibility.

**Note:** This overlaps with Phase 3 (Priority 1 file split). Phase 6 focuses on ensuring public API stability.

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 6.1 | Document all public SDK API methods | LOW | N/A |
| 6.2 | Create SDK compatibility test suite | LOW | Revert files |
| 6.3 | Verify all public API methods re-exported from `index.ts` | MEDIUM | Revert files |
| 6.4 | Add compatibility wrapper for any changed internals | LOW | Revert files |
| 6.5 | Build SDK and verify TypeScript types valid | HIGH | Revert files |
| 6.6 | Publish SDK to npm (dry-run first) | HIGH | Revert publish |

**Validation Checkpoints:**
- [ ] All documented public APIs still accessible
- [ ] SDK builds without TypeScript errors
- [ ] SDK tests pass

### Phase 7: Cleanup & Stability

**Goal:** Remove dead code, improve maintainability.

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 7.1 | Identify dead code in backend | LOW | N/A |
| 7.2 | Remove unused imports | LOW | Revert files |
| 7.3 | Remove duplicate auth handlers | MEDIUM | Revert files |
| 4.4 | Standardize error response format | MEDIUM | Revert files |
| 7.5 | Improve logging consistency | LOW | Revert files |
| 7.6 | Verify no plaintext secrets in code | LOW | Revert files |

### Phase 8: Validation & Testing

**Goal:** Validate all refactors, no regressions.

**Tasks:**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| 8.1 | Run backend test suite | HIGH | Revert changes |
| 8.2 | Run Flutter analyzer | HIGH | Revert changes |
| 8.3 | Run SDK type check | HIGH | Revert changes |
| 8.4 | Run CLI build | HIGH | Revert changes |
| 8.5 | Manual WebSocket test | HIGH | Revert changes |
| 8.6 | Manual auth flow test (all clients) | HIGH | Revert changes |
| 8.7 | Docker deployment test | HIGH | Revert changes |

**Validation Checkpoints:**
- [ ] All tests pass
- [ ] All builds succeed
- [ ] No regressions in functionality

---

## 4. Migration Safety Notes

### Auth Migration Safety

1. **Dual response during transition:** Session endpoint returns BOTH JWT and cookie during transition period
2. **Feature flag:** Session cookie behavior can be toggled via environment variable
3. **Rollback:** Revert frontend files to cookie-reading state if issues arise

### WebSocket Migration Safety

1. **Client-first:** Upgrade client WebSocket handler before backend changes
2. **Graceful degradation:** Old clients without reconnect logic still work during transition
3. **Event versioning:** New event names don't break old clients

### File Split Safety

1. **Wrapper files:** Old imports continue to work via wrapper modules
2. **Import audit:** Every file importing old module must be updated
3. **Test coverage:** Existing tests must pass after split

---

## 5. Rollback Strategy

| Phase | Rollback Trigger | Rollback Steps |
|-------|-----------------|----------------|
| Phase 1 | Auth regression | Revert frontend auth files to cookie-based state |
| Phase 2 | WebSocket regression | Revert `websocket_server.py` and client handlers |
| Phase 3 | Import breakage | Revert all split files, restore originals |
| Phase 4 | API contract regression | Revert frontend API client |
| Phase 5 | Flutter auth regression | Revert Flutter auth files |
| Phase 6 | SDK build failure | Revert SDK modularization |
| Phase 7 | Any regression | Revert individual files |
| Phase 8 | Test failure | Revert changes, fix, re-validate |

---

## 6. Deployment Verification

1. **Docker build:** `docker-compose build` succeeds
2. **Docker run:** `docker-compose up` starts backend + postgres
3. **Health check:** `GET /healthz` returns 200
4. **Auth flow:** Login → token stored → API calls work
5. **WebSocket:** Connect → subscribe → receive events
6. **Secrets CRUD:** Create → read → update → delete secrets
7. **Audit log:** Actions appear in audit log

---

## 7. Files to Modify

### Backend (Python)
- `app.py` — Auth hookup
- `routes/auth_routes.py` — JWT response modification
- `routes/jwt_auth_routes.py` — Reference for JWT patterns
- `websocket_server.py` — Auth middleware fix
- `ws_service.py` — Productionization
- `audit_logger.py` — Split into modules
- `services/audit_service.py` (new)
- `services/audit_file_logger.py` (new)
- `services/audit_constants.py` (new)
- `handlers/auth_event_handler.py` (new)
- `handlers/secret_event_handler.py` (new)
- `handlers/admin_event_handler.py` (new)

### Frontend (TypeScript/TSX)
- `frontend/src/lib/auth-api.ts` — JWT response handling
- `frontend/src/lib/utils.ts` — localStorage for tokens
- `frontend/src/context/workspace-context.tsx` — Bearer header
- `frontend/src/lib/api.ts` — Response envelope consistency
- `frontend/src/components/providers.tsx` — WebSocket handler

### Flutter (Dart)
- `sem_mobile/pubspec.yaml` — Verify no firebase_auth
- `sem_mobile/lib/features/auth/data/repositories/auth_repository.dart` — Verify JWT auth
- `sem_mobile/lib/features/auth/presentation/bloc/auth_bloc.dart` — Token refresh
- `sem_mobile/.github/workflows/flutter.yml` — Fix flavor syntax

### SDK (TypeScript)
- `sdk/javascript/src/index.ts` — Split into modules
- `sdk/javascript/src/auth/` (new)
- `sdk/javascript/src/secrets/` (new)
- `sdk/javascript/src/environments/` (new)
- `sdk/javascript/src/ws/` (new)
- `sdk/javascript/src/audit/` (new)
- `sdk/javascript/src/core/` (new)

### CLI (TypeScript)
- `cli/src/commands/auth.ts` — Verify JWT auth
- `cli/src/commands/secrets.ts` — Verify API compatibility
- `cli/src/commands/ws.ts` — WebSocket handler

---

## 8. Non-Goals (Explicitly Excluded)

- Kubernetes deployment
- Redis clustering
- Multi-region architecture
- Microservice decomposition
- Redis-based WebSocket scaling
- Distributed caching
- Multi-tenant isolation beyond namespace

---

## 9. Success Criteria

1. All clients (web, mobile, SDK, CLI) use JWT auth exclusively
2. WebSocket connects, subscribes, and receives events reliably
3. No massive files over 1000 lines
4. All API contracts consistent across frontend/backend
5. Flutter uses backend JWT auth, Firebase only for crashlytics
6. SDK builds and publishes to npm without breaking changes
7. Docker deployment works end-to-end
8. No test regressions

---

## 10. Implementation Order

1. **Phase 1** (Auth) — Highest risk, do first with careful rollback plan
2. **Phase 5** (Flutter) — Quick verification, low risk
3. **Phase 2** (WebSocket) — Backend-heavy, validate before client changes
4. **Phase 4** (Sync) — API contracts, can parallelize with Phase 2
5. **Phase 3** (File Split) — Lower risk, do after major flows validated
6. **Phase 6** (SDK) — Overlaps with Phase 3
7. **Phase 7** (Cleanup) — Lower priority, do at end
8. **Phase 8** (Validation) — Gate for all prior phases

---

**SPEC STATUS:** APPROVED FOR IMPLEMENTATION
**NEXT STEP:** Invoke writing-plans skill to create phased implementation plan