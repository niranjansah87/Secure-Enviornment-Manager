# SEM Platform Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize SEM platform by unifying auth (JWT everywhere), productionizing WebSocket, splitting massive files, and synchronizing all client layers.

**Architecture:** JWT-based auth with single endpoint, Flask-SocketIO for WebSocket, modular file split with backward compatibility wrappers, all clients use Bearer token + localStorage.

**Tech Stack:** Python/Flask (backend), TypeScript/Next.js (frontend), Dart/Flutter (mobile), TypeScript/Node (SDK+CLI), Flask-SocketIO (WebSocket)

---

## Phase 1: Auth Unification (JWT Everywhere)

### Phase 1.1: Read Existing Session Auth

**Files:**
- Read: `routes/auth_routes.py`
- Read: `routes/jwt_auth_routes.py` (reference)
- Read: `core/sessions.py`

- [ ] **Step 1: Read routes/auth_routes.py**

Read the full file to understand current session-based login flow.

- [ ] **Step 2: Read routes/jwt_auth_routes.py**

Note how JWT login is implemented — this is the pattern to follow.

- [ ] **Step 3: Read core/sessions.py**

Understand session registry and `_register_session()`.

---

### Phase 1.2: Modify Session Auth to Return JWT

**Files:**
- Modify: `routes/auth_routes.py`
- Modify: `core/api_response.py`

- [ ] **Step 1: Read core/api_response.py**

Check the `api_response()` and `api_error()` helpers used for consistent envelopes.

```python
# Read to understand: api_response(data, status_code=200) format
```

- [ ] **Step 2: Modify routes/auth_routes.py login() to return JWT**

In `routes/auth_routes.py`, find the `/login` route (around line 30-70). Modify it to:

1. Keep existing password validation
2. Call `token_manager.create_access_token()` and `token_manager.create_refresh_token()` (from `core/jwt_auth`)
3. Return JSON: `{ "success": true, "data": { "access_token": "...", "refresh_token": "...", "expires_in": 900 } }`

**Code change for login route:**
```python
from core.jwt_auth import token_manager
from core.api_response import api_response, api_error, ErrorCode

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    password = data.get("password", "")
    namespace = data.get("namespace", "global")
    environment = data.get("environment", "main")

    if not password:
        return api_error(ErrorCode.VALIDATION_MISSING_FIELD[0], "password is required", 400)

    # Validate password (existing logic)
    if not check_password_hash(get_dashboard_password_hash(), password):
        track_failed_login()
        audit_logger.log_login_failure(namespace, environment, request.remote_addr or "unknown", "invalid_password")
        return api_error(ErrorCode.AUTH_INVALID_CREDENTIALS[0], "Invalid credentials", 401)

    # Create server-side session
    session_id = _register_session(namespace=namespace, environment=environment)

    # Create JWT tokens (same as jwt_auth_routes.py)
    access_token = token_manager.create_access_token(
        session_id=session_id,
        namespace=namespace,
        environment=environment,
        is_admin=True,
    )
    refresh_token, _ = token_manager.create_refresh_token(
        session_id=session_id,
        user_agent=request.headers.get("User-Agent", "unknown"),
        ip_address=request.remote_addr or "unknown",
    )

    audit_logger.log_login_success(namespace, environment, "session_login", request.remote_addr or "unknown")

    # Return JWT response instead of setting session cookie
    return api_response(data={
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": 900,
        "token_type": "Bearer",
    })
```

- [ ] **Step 3: Run backend to verify no import errors**

```bash
cd C:/Secure-Enviornment-Manager && python -c "from routes.auth_routes import auth_bp; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add routes/auth_routes.py
git commit -m "feat(auth): modify session login to return JWT tokens"
```

---

### Phase 1.3: Update Frontend auth-api.ts

**Files:**
- Modify: `frontend/src/lib/auth-api.ts`

- [ ] **Step 1: Read frontend/src/lib/auth-api.ts**

Read the file to understand current login function and how it handles the response.

- [ ] **Step 2: Modify login() to extract JWT from response**

Find the `login()` function. Currently it may expect a session cookie. Update to:

1. POST password to `/api/v1/auth/login`
2. Extract `access_token` and `refresh_token` from JSON response
3. Return tokens (caller stores in localStorage)

**Code change (login function):**
```typescript
async function login(password: string, namespace = "global", environment = "main"): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, namespace, environment }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || "Login failed");
  }
  return {
    access_token: data.data.access_token,
    refresh_token: data.data.refresh_token,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/auth-api.ts
git commit -m "feat(frontend): update login to use JWT from response"
```

---

### Phase 1.4: Update Frontend utils.ts — Token Storage

**Files:**
- Modify: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Read frontend/src/lib/utils.ts**

Find the token loading/storing functions.

- [ ] **Step 2: Update token storage to use localStorage**

Verify functions `saveAuthTokens()`, `loadAccessToken()`, `loadRefreshToken()`, `clearAuthTokens()` use localStorage (not cookies).

**Expected localStorage keys:**
- `sem_access_token`
- `sem_refresh_token`
- `sem_device_id`

- [ ] **Step 3: Verify no cookie-based token reading remains**

Search for `document.cookie` in utils.ts — should not be used for token storage.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/utils.ts
git commit -m "feat(frontend): use localStorage for JWT token storage"
```

---

### Phase 1.5: Update Frontend workspace-context.tsx — Bearer Header

**Files:**
- Modify: `frontend/src/context/workspace-context.tsx`

- [ ] **Step 1: Read frontend/src/context/workspace-context.tsx**

Focus on how `token` is used in API calls.

- [ ] **Step 2: Verify Bearer token is sent in Authorization header**

In `api.ts` or context, verify:
```typescript
headers["Authorization"] = `Bearer ${token}`;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/workspace-context.tsx
git commit -m "feat(frontend): ensure Bearer token sent in Authorization header"
```

---

### Phase 1.6-1.8: Verify Flutter/CLI/SDK Auth Endpoints

**Files:**
- Read: `sem_mobile/lib/features/auth/data/repositories/auth_repository.dart`
- Read: `cli/src/commands/auth.ts`
- Read: `sdk/javascript/src/index.ts` (auth section)

- [ ] **Step 1: Verify Flutter uses /api/v1/auth/jwt/login**

Check `auth_repository.dart` — should POST to `/api/v1/auth/jwt/login`. If it does, no change needed.

- [ ] **Step 2: Verify CLI uses /api/v1/auth/jwt/login**

Check `cli/src/commands/auth.ts` — should POST to `/api/v1/auth/jwt/login`. If it does, no change needed.

- [ ] **Step 3: Verify SDK uses /api/v1/auth/jwt/login**

Check SDK auth exports — should use same JWT endpoint. If they do, no change needed.

- [ ] **Step 4: Commit only if changes made**

```bash
git add <changed-files>
git commit -m "fix(auth): update auth endpoints where needed"
```

---

### Phase 1.9: Add Deprecation Notice

**Files:**
- Modify: `routes/auth_routes.py` (comment added)

- [ ] **Step 1: Add deprecation comment to login route**

```python
@auth_bp.route("/login", methods=["POST"])
def login():
    # DEPRECATED: This endpoint now returns JWT tokens.
    # Session cookie behavior is deprecated and will be removed.
    # Use /api/v1/auth/jwt/login for programmatic access.
    ...
```

- [ ] **Step 2: Commit**

```bash
git add routes/auth_routes.py
git commit -m "docs: add deprecation notice to session login endpoint"
```

---

### Phase 1.10: Validate Auth Flow

**Validation Checkpoints:**
- [ ] Start backend: `python app.py`
- [ ] Web login: POST to `/api/v1/auth/login` with password → returns JWT tokens
- [ ] API call: `curl -H "Authorization: Bearer <token>" /api/v1/global/main`
- [ ] Token refresh: POST to `/api/v1/auth/jwt/refresh` with refresh_token
- [ ] Flutter login works
- [ ] CLI login works

---

## Phase 2: WebSocket Productionization

### Phase 2.1: Read WebSocket Server

**Files:**
- Read: `websocket_server.py`
- Read: `ws_service.py`

- [ ] **Step 1: Read websocket_server.py**

Understand current connect handler, auth validation, and event handlers.

- [ ] **Step 2: Read ws_service.py**

Understand event hook system and broadcast mechanisms.

---

### Phase 2.2: Fix JWT Auth in WebSocket Connect

**Files:**
- Modify: `websocket_server.py`

- [ ] **Step 1: Fix JWT validation in connect handler**

Current code at line ~47-65:
```python
@sio.on('connect')
def handle_connect():
    token = request.args.get('token') or request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        disconnect()
        return False
    from core.jwt_auth import token_manager
    payload = token_manager.validate_access_token(token)
    if not payload:
        disconnect()
        return False
    # Store identity
    request.environ['session_id'] = payload.sub
    request.environ['namespace'] = payload.namespace or 'global'
    request.environ['environment'] = payload.environment or 'main'
    request.environ['is_admin'] = payload.is_admin
    ...
```

**This is already correct!** Verify it works and move to Phase 2.3.

- [ ] **Step 2: Commit only if changes made**

---

### Phase 2.3: Add Room Tracking

**Files:**
- Modify: `websocket_server.py`
- Modify: `ws_service.py`

- [ ] **Step 1: Add session → room mapping in ws_service.py**

In `WebSocketConnection`, add `session_id` tracking. Already present at line ~79.

In `ws_service.py`, the `join_room()` at line ~131 already tracks rooms.

**No change needed if connection already tracks session_id.**

- [ ] **Step 2: Commit only if changes made**

---

### Phase 2.4: Implement Heartbeat

**Files:**
- Modify: `websocket_server.py`

- [ ] **Step 1: Verify ping/pong handler exists**

At line ~144-147:
```python
@sio.on('ping')
def handle_ping():
    emit('pong', {'timestamp': datetime.now(timezone.utc).isoformat()})
```

**This is already present!** No change needed.

- [ ] **Step 2: Commit only if changes made**

---

### Phase 2.5-2.6: Read and Productionize ws_service.py

**Files:**
- Modify: `ws_service.py`

- [ ] **Step 1: Read ws_service.py cleanup_stale_connections**

At line ~276-296, `cleanup_stale_connections()` checks `is_alive()` based on heartbeat.

**This is already production-grade.** No change needed.

- [ ] **Step 2: Commit only if changes made**

---

### Phase 2.7: Read Frontend WebSocket Handler

**Files:**
- Read: `frontend/src/components/providers.tsx`

- [ ] **Step 1: Read providers.tsx**

Find WebSocket connection logic.

---

### Phase 2.8: Fix Frontend WebSocket Reconnect

**Files:**
- Modify: `frontend/src/components/providers.tsx`

- [ ] **Step 1: Identify WebSocket handler in providers.tsx**

Check how `socket.io` client is connected.

- [ ] **Step 2: Add reconnect logic if missing**

Ensure client has:
1. `reconnect: true` in socket options
2. Auto re-subscribe on reconnect event
3. JWT token passed on reconnect

**Code addition if missing:**
```typescript
const socket = io(apiBase().replace('http', 'ws'), {
  auth: { token: accessToken },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

socket.on('connect', () => {
  socket.emit('subscribe', { namespace, environment });
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/providers.tsx
git commit -m "fix(frontend): add WebSocket reconnect logic"
```

---

### Phase 2.9: Fix Flutter WebSocket Handler

**Files:**
- Modify: `sem_mobile/lib/features/connectivity/`

- [ ] **Step 1: Find Flutter WebSocket handler**

Search for `web_socket_channel` usage in Flutter code.

```bash
grep -r "web_socket_channel" sem_mobile/lib/
```

- [ ] **Step 2: Add reconnect + JWT auth to Flutter WebSocket**

Ensure Flutter websocket:
1. Connects with JWT auth token
2. Reconnects on disconnect
3. Re-subscribes on reconnect

- [ ] **Step 3: Commit**

```bash
git add <flutter-websocket-files>
git commit -m "fix(flutter): add WebSocket reconnect with JWT auth"
```

---

### Phase 2.10: Validate WebSocket Flow

**Validation Checkpoints:**
- [ ] WebSocket connects with JWT auth
- [ ] Subscribe to namespace:environment room
- [ ] Secret change event received
- [ ] Client reconnect re-subscribes
- [ ] Stale connections cleaned up

---

## Phase 3: Massive File Modularization

### Phase 3.1: Read audit_logger.py

**Files:**
- Read: `audit_logger.py`

- [ ] **Step 1: Read audit_logger.py**

Identify:
- Main class: `AuditLogger`
- Key methods: `log_event`, `log_login_success`, `log_login_failure`, `log_logout`, `log_secret_access`
- Constants: event types
- File writing logic

---

### Phase 3.2-3.4: Split audit_logger.py into services/

**Files:**
- Create: `services/audit_constants.py`
- Create: `services/audit_file_logger.py`
- Create: `services/audit_service.py`
- Modify: `audit_logger.py` (wrapper)

- [ ] **Step 1: Create services/audit_constants.py**

Extract event type constants:
```python
# services/audit_constants.py
class AuditEventType:
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    SECRET_CREATED = "SECRET_CREATED"
    SECRET_UPDATED = "SECRET_UPDATED"
    SECRET_DELETED = "SECRET_DELETED"
    # ... all other event types from audit_logger.py

class AuditSeverity:
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
```

- [ ] **Step 2: Create services/audit_file_logger.py**

Extract file append-only writer:
```python
# services/audit_file_logger.py
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

class AuditFileLogger:
    def __init__(self, log_file_path: str):
        self.log_file = Path(log_file_path)

    def append(self, entry: Dict[str, Any]) -> None:
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")

    def get_entries(self, limit: int = 100) -> list:
        # Read entries from file
        ...
```

- [ ] **Step 3: Create services/audit_service.py**

Extract main audit service:
```python
# services/audit_service.py
from .audit_file_logger import AuditFileLogger
from .audit_constants import AuditEventType, AuditSeverity

class AuditService:
    def __init__(self, log_dir: str = "audit_logs"):
        ...

    def log_event(self, event_type: str, resource_type: str, resource_id: str,
                 namespace: str, environment: str, ip_address: str,
                 details: Dict[str, Any] = None) -> None:
        ...

    def log_login_success(self, namespace: str, environment: str, ip_address: str,
                         auth_method: str = "unknown") -> None:
        ...

    # ... all other log_* methods
```

- [ ] **Step 4: Create services/__init__.py**

```python
# services/__init__.py
from .audit_constants import AuditEventType, AuditSeverity
from .audit_file_logger import AuditFileLogger
from .audit_service import AuditService

__all__ = ["AuditService", "AuditFileLogger", "AuditEventType", "AuditSeverity"]
```

- [ ] **Step 5: Update audit_logger.py as wrapper**

```python
# audit_logger.py
"""
Backward compatibility wrapper.
All functionality moved to services/audit_service.py
"""
from services.audit_service import AuditService

# Create singleton instance
audit_logger = AuditService()
```

- [ ] **Step 6: Verify imports still work**

```bash
python -c "from audit_logger import audit_logger; print('OK')"
```
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add services/audit_constants.py services/audit_file_logger.py services/audit_service.py services/__init__.py audit_logger.py
git commit -m "refactor: split audit_logger.py into services/"
```

---

### Phase 3.5-3.7: Create event handlers

**Files:**
- Create: `handlers/__init__.py`
- Create: `handlers/auth_event_handler.py`
- Create: `handlers/secret_event_handler.py`
- Create: `handlers/admin_event_handler.py`

- [ ] **Step 1: Create handlers/auth_event_handler.py**

```python
# handlers/auth_event_handler.py
from services.audit_service import AuditService

class AuthEventHandler:
    def __init__(self, audit_service: AuditService):
        self.audit = audit_service

    def on_login_success(self, namespace: str, environment: str, ip_address: str, auth_method: str):
        self.audit.log_login_success(namespace, environment, ip_address, auth_method)

    def on_login_failure(self, namespace: str, environment: str, ip_address: str, reason: str):
        self.audit.log_login_failure(namespace, environment, ip_address, reason)

    def on_logout(self, namespace: str, environment: str, ip_address: str, auth_method: str):
        self.audit.log_logout(namespace, environment, ip_address, auth_method)
```

- [ ] **Step 2: Create handlers/__init__.py**

```python
# handlers/__init__.py
from .auth_event_handler import AuthEventHandler
from .secret_event_handler import SecretEventHandler
from .admin_event_handler import AdminEventHandler

__all__ = ["AuthEventHandler", "SecretEventHandler", "AdminEventHandler"]
```

- [ ] **Step 3: Commit**

```bash
git add handlers/
git commit -m "refactor: create event handlers for audit events"
```

---

### Phase 3.8-3.9: Update imports

**Files:**
- Modify: All files importing `audit_logger`
- Check: `app.py`, `routes/api_routes.py`, `routes/auth_routes.py`, `routes/jwt_auth_routes.py`

- [ ] **Step 1: Find all files importing audit_logger**

```bash
grep -r "from audit_logger import" --include="*.py" .
```

- [ ] **Step 2: Verify imports still work via wrapper**

Files importing `from audit_logger import audit_logger` should still work via the wrapper.

- [ ] **Step 3: Commit only if changes needed**

---

### Phase 3.10-3.19: SDK Modularization

**Files:**
- Create: `sdk/javascript/src/auth/`
- Create: `sdk/javascript/src/secrets/`
- Create: `sdk/javascript/src/environments/`
- Create: `sdk/javascript/src/ws/`
- Create: `sdk/javascript/src/audit/`
- Create: `sdk/javascript/src/core/`
- Modify: `sdk/javascript/src/index.ts`

- [ ] **Step 1: Read sdk/javascript/src/index.ts**

Understand all exported functions.

- [ ] **Step 2: Create sdk/javascript/src/core/api-base.ts**

```typescript
// sdk/javascript/src/core/api-base.ts
export interface ApiOptions {
  baseUrl: string;
  token?: string;
}

export async function apiRequest<T>(options: ApiOptions, path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, token } = options;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (init?.body && typeof init.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || "API request failed");
  }
  return data.data as T;
}
```

- [ ] **Step 3: Create sdk/javascript/src/core/errors.ts**

```typescript
// sdk/javascript/src/core/errors.ts
export class SdkError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "SdkError";
  }
}
```

- [ ] **Step 4: Create sdk/javascript/src/auth/client.ts**

```typescript
// sdk/javascript/src/auth/client.ts
import { apiRequest } from "../core/api-base";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function login(baseUrl: string, password: string, namespace = "global", environment = "main"): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    { baseUrl },
    "/api/v1/auth/login",
    { method: "POST", body: JSON.stringify({ password, namespace, environment }) }
  );
}

export async function refreshToken(baseUrl: string, refreshToken: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    { baseUrl },
    "/api/v1/auth/jwt/refresh",
    { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }
  );
}
```

- [ ] **Step 5: Create sdk/javascript/src/auth/index.ts**

```typescript
// sdk/javascript/src/auth/index.ts
export { login, refreshToken } from "./client";
export type { LoginResponse } from "./client";
```

- [ ] **Step 6: Create sdk/javascript/src/secrets/client.ts**

```typescript
// sdk/javascript/src/secrets/client.ts
import { apiRequest } from "../core/api-base";

export async function getSecrets(baseUrl: string, token: string, namespace: string, environment: string) {
  return apiRequest<Record<string, string>>(
    { baseUrl, token },
    `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}`
  );
}

export async function setSecret(baseUrl: string, token: string, namespace: string, environment: string, key: string, value: string) {
  return apiRequest(
    { baseUrl, token },
    `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}`,
    { method: "PATCH", body: JSON.stringify({ [key]: value }) }
  );
}
```

- [ ] **Step 7: Create sdk/javascript/src/secrets/index.ts**

```typescript
// sdk/javascript/src/secrets/index.ts
export { getSecrets, setSecret } from "./client";
```

- [ ] **Step 8: Create remaining modules (environments, ws, audit) following same pattern**

- [ ] **Step 9: Update sdk/javascript/src/index.ts re-exports**

```typescript
// sdk/javascript/src/index.ts
export * from "./auth";
export * from "./secrets";
export * from "./environments";
export * from "./ws";
export * from "./audit";
export * from "./core";
```

- [ ] **Step 10: Build SDK**

```bash
cd sdk/javascript && npm run build
```

- [ ] **Step 11: Commit**

```bash
git add sdk/javascript/src/
git commit -m "refactor(sdk): modularize SDK into separate modules"
```

---

## Phase 4: Frontend/Backend Synchronization

### Phase 4.1-4.3: API Response Envelopes

**Files:**
- Read: `core/api_response.py`
- Read: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Audit backend api_response() usage**

Check `routes/api_routes.py` — all endpoints should return `api_response(data={...})` or `api_error(...)`.

- [ ] **Step 2: Audit frontend api.ts response parsing**

In `frontend/src/lib/api.ts`, the `request()` function at line ~104 handles:
- `rawData.success === false` → error
- `rawData.success === true` → extract `rawData.data`
- Legacy format (no success field) → return raw data directly

**This is already correct!** No change needed.

- [ ] **Step 3: Commit only if changes made**

---

### Phase 4.4-4.6: WebSocket Event Names

**Files:**
- Read: `websocket_server.py` (broadcast functions)
- Read: `frontend/src/components/providers.tsx` (event handlers)
- Modify: mismatches found

- [ ] **Step 1: Audit backend event names**

In `websocket_server.py`, broadcast functions at line ~150-189:
- `secret:created`
- `secret:updated`
- `secret:deleted`
- `secret:bulk_update`
- `audit:event`
- `session:revoked`
- `device:revoked`

- [ ] **Step 2: Audit frontend event handlers**

In `providers.tsx` or `api.ts`, find `socket.on()` calls:
```typescript
socket.on('secret:created', ...)
socket.on('secret:updated', ...)
```

**Verify names match exactly.**

- [ ] **Step 3: Commit only if changes made**

---

### Phase 4.7-4.9: Pagination

**Files:**
- Read: `routes/api_routes.py` (audit endpoint)
- Read: `frontend/src/lib/api.ts` (audit function)
- Modify: inconsistencies found

- [ ] **Step 1: Audit backend pagination**

In `routes/api_routes.py`, `/audit` endpoint uses `limit` and `offset` params.

- [ ] **Step 2: Audit frontend pagination**

In `frontend/src/lib/api.ts`, `audit()` function passes `limit` and `offset` params.

**Verify the parameter names match.**

- [ ] **Step 3: Commit only if changes made**

---

## Phase 5: Flutter Synchronization

### Phase 5.1: Verify firebase_auth NOT in pubspec.yaml

**Files:**
- Read: `sem_mobile/pubspec.yaml`

- [ ] **Step 1: Check pubspec.yaml**

Search for `firebase_auth` in `pubspec.yaml` — should NOT be present.

**Expected (GOOD):**
```yaml
dependencies:
  flutter:
    sdk: flutter
  # Firebase ONLY for crashlytics/analytics
  firebase_core: ^3.0.0
  firebase_crashlytics: ^4.0.0
  firebase_analytics: ^22.0.0
  # NO firebase_auth
```

- [ ] **Step 2: Commit only if changes made**

---

### Phase 5.2: Verify firebase_options.dart

**Files:**
- Read: `sem_mobile/lib/firebase_options.dart`

- [ ] **Step 1: Check firebase_options.dart**

Should only initialize Firebase core, crashlytics, and analytics — NOT auth.

- [ ] **Step 2: Commit only if changes made**

---

### Phase 5.3-5.6: Verify Flutter Auth Flow

**Files:**
- Read: `sem_mobile/lib/features/auth/data/repositories/auth_repository.dart`
- Read: `sem_mobile/lib/features/auth/presentation/bloc/auth_bloc.dart`

- [ ] **Step 1: Verify auth_repository.dart uses JWT endpoint**

Should POST to `/api/v1/auth/jwt/login` with password.

- [ ] **Step 2: Verify auth_bloc.dart handles refresh**

Should call refresh endpoint when token expires.

- [ ] **Step 3: Verify secure storage for tokens**

Should use `flutter_secure_storage` for token storage.

- [ ] **Step 4: Commit only if changes made**

---

### Phase 5.7: Fix Flutter CI Flavor Syntax

**Files:**
- Modify: `.github/workflows/flutter.yml`

- [ ] **Step 1: Fix flavor syntax**

Current (WRONG):
```yaml
flutter build apk --debug -- Flavor=qa
```

Correct syntax:
```yaml
flutter build apk --debug --dart-define=FLAVOR=qa
```

OR use build flavors in `build.gradle`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/flutter.yml
git commit -m "fix(flutter): correct flavor build syntax in CI"
```

---

## Phase 6: SDK Modularization (see Phase 3.10-3.19)

Already covered in Phase 3 SDK tasks.

---

## Phase 7: Cleanup & Stability

### Phase 7.1-7.6: Remove Dead Code

**Files:**
- Modify: Various backend files

- [ ] **Step 1: Find unused imports**

```bash
cd C:/Secure-Enviornment-Manager && python -c "import ast; [print(f) for f in ast.__dict__.keys() if not f.startswith('_')]" 2>/dev/null || true
```

Better: Run `flake8 --unused-imports` on backend.

- [ ] **Step 2: Find duplicate auth handlers**

```bash
grep -r "def login" --include="*.py" .
```

- [ ] **Step 3: Commit cleanup**

```bash
git add <cleanup-files>
git commit -m "refactor: remove dead code and duplicate handlers"
```

---

## Phase 8: Validation & Testing

### Phase 8.1-8.7: Run Validation

**Files:**
- None (validation only)

- [ ] **Step 1: Run backend tests**

```bash
cd C:/Secure-Enviornment-Manager && pytest tests/ -v
```

- [ ] **Step 2: Run Flutter analyzer**

```bash
cd sem_mobile && flutter analyze
```

- [ ] **Step 3: Run SDK type check**

```bash
cd sdk/javascript && npm run typecheck
```

- [ ] **Step 4: Build CLI**

```bash
cd cli && npm run build
```

- [ ] **Step 5: Manual auth flow test**

Start backend, test login from web, mobile, CLI.

- [ ] **Step 6: Docker deployment test**

```bash
docker-compose build && docker-compose up -d
curl http://localhost:8070/healthz
```

---

## Rollback Protocol

| Phase | Trigger | Rollback Command |
|-------|---------|------------------|
| Phase 1 | Auth broken | `git revert HEAD~1` |
| Phase 2 | WS broken | `git revert HEAD~1` |
| Phase 3 | Import broken | `git revert HEAD~N` (revert entire split) |
| Phase 4 | API broken | `git revert HEAD~1` |
| Phase 5 | Flutter broken | `git revert HEAD~1` |
| Phase 8 | Tests fail | `git revert HEAD~N` (revert all changes) |

---

## File Change Summary

### Files to CREATE:
- `services/audit_constants.py`
- `services/audit_file_logger.py`
- `services/audit_service.py`
- `services/__init__.py`
- `handlers/auth_event_handler.py`
- `handlers/secret_event_handler.py`
- `handlers/admin_event_handler.py`
- `handlers/__init__.py`
- `sdk/javascript/src/auth/client.ts`
- `sdk/javascript/src/auth/index.ts`
- `sdk/javascript/src/secrets/client.ts`
- `sdk/javascript/src/secrets/index.ts`
- `sdk/javascript/src/environments/` (module)
- `sdk/javascript/src/ws/` (module)
- `sdk/javascript/src/audit/` (module)
- `sdk/javascript/src/core/api-base.ts`
- `sdk/javascript/src/core/errors.ts`
- `sdk/javascript/src/core/index.ts`

### Files to MODIFY:
- `routes/auth_routes.py`
- `frontend/src/lib/auth-api.ts`
- `frontend/src/lib/utils.ts`
- `frontend/src/context/workspace-context.tsx`
- `frontend/src/components/providers.tsx`
- `audit_logger.py` (become wrapper)
- `.github/workflows/flutter.yml`

### Files to READ (verify no changes needed):
- `routes/jwt_auth_routes.py`
- `core/sessions.py`
- `core/api_response.py`
- `websocket_server.py`
- `ws_service.py`
- `sem_mobile/pubspec.yaml`
- `sem_mobile/lib/features/auth/data/repositories/auth_repository.dart`
- `cli/src/commands/auth.ts`
- `sdk/javascript/src/index.ts`

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between phases, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**