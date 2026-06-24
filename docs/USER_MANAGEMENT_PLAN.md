# User Management System — Design Plan

## Overview

Add multi-developer user accounts to SEM while keeping all existing credential systems intact.
Developers log in with username + password. Admin manages accounts. Email is optional and non-blocking.

---

## Credential System (all three coexist)

| Credential | Who uses it | How |
|---|---|---|
| Dashboard Password | Admin | Existing — unchanged |
| Master API Token | Admin/CI | Existing — unchanged |
| Username + Password | Developers | **New** |

Login page lets user pick which mode. Dashboard password and master token remain admin-only.

---

## Data Model — `users.json`

```json
{
  "usr_<uuid8>": {
    "user_id": "usr_a1b2c3d4",
    "username": "alice",
    "email": "alice@company.com",
    "password_hash": "pbkdf2:sha256:480000$...",
    "role": "developer",
    "scopes": ["production/main", "staging/dev"],
    "must_change_password": true,
    "status": "active",
    "created_by": "admin",
    "created_at": "2026-06-24T10:00:00Z",
    "last_login": null,
    "password_changed_at": null
  }
}
```

**Scope formats (reuses existing):**
- `"*"` — full access (admin users only)
- `"production"` — all environments in production namespace
- `"production/main"` — single environment

**Roles:**
- `admin` — full access, can manage users
- `developer` — scoped access only

---

## File: `services/user_service.py`

Functions to build:
- `create_user(username, email, role, scopes, created_by)` → `(user_id, temp_password)`
- `verify_password(username, password)` → `user | None`
- `change_password(user_id, new_password, current_password=None)` → `bool`
- `admin_reset_password(user_id)` → `temp_password`
- `list_users()` → `[user_info, ...]` (no hashes)
- `get_user(user_id)` → `user_info`
- `update_user(user_id, updates)` → update scopes/role/email/status
- `disable_user(user_id)` → `bool`
- `delete_user(user_id)` → `bool`

Password hashing: PBKDF2-SHA256, same as API keys (480k iterations).
Temp password: `secrets.token_urlsafe(12)` — readable, 16+ chars of entropy.

---

## File: `services/email_service.py`

Optional. Reads SMTP config from env. If not configured, logs and skips silently.

```
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=noreply@company.com
EMAIL_SMTP_PASSWORD=app_password
EMAIL_FROM=SEM <noreply@company.com>
```

Functions:
- `send_welcome_email(to_email, username, temp_password)` → non-blocking, fire-and-forget
- `send_password_reset_email(to_email, username, temp_password)` → same

If email fails or is not configured: operation continues, temp password returned to admin via API response to share out-of-band.

---

## Backend Routes — `routes/user_routes.py`

All admin-only (`_token_is_admin` required):

```
POST   /api/v1/admin/users               Create user
GET    /api/v1/admin/users               List all users
GET    /api/v1/admin/users/:id           Get user detail
PATCH  /api/v1/admin/users/:id           Update scopes/role/email/status
POST   /api/v1/admin/users/:id/reset-password   Admin resets password
DELETE /api/v1/admin/users/:id           Delete user
```

User-accessible (requires valid JWT):
```
POST   /api/v1/user/change-password      Change own password (must_change or voluntary)
GET    /api/v1/user/me                   Already exists at /api/v1/auth/me
```

---

## Login Flow Changes — `routes/jwt_auth_routes.py`

Add a third credential branch in `jwt_login()`:

```python
# Branch 1: master token — existing, unchanged
# Branch 2: dashboard password — existing, unchanged
# Branch 3: username + password — NEW
else:
    from services.user_service import user_service
    user = user_service.verify_password(username_field, password)
    if user and user["status"] == "active":
        credential_type = "user_password"
        scopes = user["scopes"]
        is_admin = user["role"] == "admin"
        must_change = user["must_change_password"]
        user_id = user["user_id"]
```

JWT payload additions:
- `user_id` — for identifying the user across requests
- `must_change_password` — frontend redirects to change-password screen
- `credential_type` — `"user_password"` for audit logs

---

## JWT Payload Extension

Add to `TokenPayload` dataclass in `core/jwt_auth.py`:
```python
user_id: Optional[str] = None
must_change_password: bool = False
credential_type: str = "unknown"
```

---

## Force Password Change Flow

1. User logs in with temp password
2. JWT is issued with `must_change_password: true`
3. Frontend detects this flag (decode JWT payload)
4. Frontend shows change-password screen (full-page overlay, blocks navigation)
5. User submits new password → `POST /api/v1/user/change-password`
6. Backend issues new JWT with `must_change_password: false`
7. Normal session begins

---

## Frontend Changes

### 1. Login Page — Credential selector

Three tabs or a segmented control:

```
[ Dashboard Password ]  [ Master API Token ]  [ User Login ]
```

- Dashboard Password: existing password field (unchanged)
- Master API Token: existing token field (unchanged)
- User Login: username + password fields (new)

### 2. Force Change Password Screen

Full-screen overlay rendered when JWT has `must_change_password: true`.
Cannot be dismissed. Blocks all navigation until password is changed.

Fields: new password + confirm password.
Validation: min 8 chars, not same as temp.

### 3. User Management Page — `/admin/users`

Admin-only page in sidebar (hidden for non-admins).

Features:
- Table of all users (username, email, role, scopes, status, last login)
- Create User dialog (username, email optional, role, scope selector reusing env picker)
- Shows temp password once after creation (copy button)
- Edit user (scopes, role, status)
- Reset password (shows new temp password once)
- Disable / delete user

---

## Build Order

### Phase 1 — Backend core (no frontend yet)
1. `services/user_service.py`
2. `services/email_service.py` (optional/non-blocking)
3. `routes/user_routes.py`
4. Update `routes/jwt_auth_routes.py` — add user_password branch
5. Update `core/jwt_auth.py` — add `user_id`, `must_change_password`, `credential_type` to payload
6. Register blueprint in `app.py`

### Phase 2 — Frontend
7. Update login page — credential type selector
8. `useWorkspace` / workspace context — handle `must_change_password` flag
9. Force change password component
10. User Management page (`/admin/users`)
11. Add "Users" link in sidebar (admin-only)

### Phase 3 — Polish (later)
- Email delivery status in admin UI
- User activity audit log view
- Bulk scope assignment

---

## Security Rules

- Passwords: PBKDF2-SHA256, 480k iterations (same as API keys, consistent)
- Temp passwords: `secrets.token_urlsafe(12)` — cryptographically random
- `must_change_password` enforced server-side (not just frontend) — API rejects non-password-change requests
- Admin cannot read any password hash via API
- Reset generates new temp, old password immediately invalid
- Email is fire-and-forget — failure is logged, never blocks the API response
- Users cannot change their own role or scopes (admin-only)
- Disabled users: JWT still validates until it expires (15 min window acceptable) — status checked on login

---

## What Does NOT Change

- `DASHBOARD_PASSWORD` in config — still works, still admin
- `MASTER_API_TOKEN` in config — still works, still admin
- API keys — still machine credentials, unchanged
- All existing JWT token architecture — extended, not replaced
- All existing routes and auth middleware — unchanged
