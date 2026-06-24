# Enterprise Backend Architecture - Implementation Summary

**Document Version:** 1.0
**Date:** 2026-05-14
**Status:** Implementation Complete

---

## Overview

This document describes the backend architecture improvements made to support mobile (Flutter), SDK, and CLI clients while maintaining the self-hosted, file-based, encrypted storage philosophy.

---

## Architecture Changes Summary

### 1. New Components Added

| Component | File | Purpose |
|-----------|------|---------|
| API Response Helpers | `core/api_response.py` | Standardized API response format |
| JWT Auth Module | `core/jwt_auth.py` | JWT token management with refresh tokens |
| Error Handling | `core/exceptions.py` | Centralized error handling |
| JWT Auth Routes | `routes/jwt_auth_routes.py` | Mobile/SDK authentication endpoints |
| WebSocket Service | `ws_service.py` | Real-time event scaffolding |
| User Service | `services/user_service.py` | Developer account management, PBKDF2 hashing |
| Email Service | `services/email_service.py` | Optional SMTP, fire-and-forget emails |
| User Routes | `routes/user_routes.py` | Admin user CRUD + user self-service |

### 2. Files Modified

| File | Changes |
|------|---------|
| `app.py` | Registered new blueprint, added error handlers |
| `requirements.txt` | Added PyJWT dependency |
| `core/config.py` | Added `admin_email`, `admin_username` settings |
| `core/jwt_auth.py` | Extended TokenPayload with `user_id`, `username`, `email`, `must_change_password`, `credential_type` |
| `routes/jwt_auth_routes.py` | Added username+password login branch, returns user identity in JWT |

---

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "abc123",
    "timestamp": "2026-05-14T12:00:00Z",
    "version": "v1"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "Invalid or expired token",
    "details": { ... }
  },
  "meta": {
    "request_id": "abc123",
    "timestamp": "2026-05-14T12:00:00Z",
    "version": "v1"
  }
}
```

---

## Authentication Architecture

### Token Types

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 min | Client (memory) | API authentication |
| Refresh Token | 7 days | Server (file) + Client | Token renewal |
| API Key | Configurable | Server (PBKDF2 hashed) | Programmatic access |
| User JWT | 15 min | Client (memory) | User-specific access |

### Authentication Flows

#### 1. Password Login (Mobile/SDK)

```
POST /api/v1/auth/login
{
  "namespace": "production",
  "environment": "main",
  "password": "dashboard_password",
  "device_name": "iPhone 15 Pro",
  "device_type": "mobile",
  "platform": "ios"
}

Response:
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "semr_...",
    "expires_in": 900,
    "token_type": "Bearer",
    "device_id": "dev_..."
  }
}
```

#### 2. Token Refresh

```
POST /api/v1/auth/refresh
{
  "refresh_token": "semr_..."
}

Response:
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "semr_...",
    "expires_in": 900
  }
}
```

#### 3. API Key Authentication (Existing)

```
GET /api/v1/production/main
Authorization: Bearer <api_key>

Response: Standard JSON secrets object
```

#### 4. Username + Password Login (Multi-Developer)

```
POST /api/v1/auth/login
{
  "username": "johndoe",
  "password": "user_password",
  "namespace": "production",
  "environment": "main",
  "device_name": "Chrome on Windows",
  "device_type": "desktop",
  "platform": "web"
}

Response (first login — temp password):
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "semr_...",
    "expires_in": 900,
    "token_type": "Bearer",
    "credential_type": "user_password",
    "user_id": "usr_a1b2...",
    "username": "johndoe",
    "email": "john@example.com",
    "must_change_password": true
  }
}

After password change:
POST /api/v1/user/change-password
→ Returns fresh JWT with must_change_password: false
```

### Backend Compatibility

| Client Type | Auth Method | Endpoint |
|-------------|-------------|----------|
| Web Dashboard | Session Cookie | `/<namespace>/<environment>` |
| Mobile App | JWT Bearer | `/api/v1/auth/login` |
| Flutter App | JWT Bearer | `/api/v1/auth/login` |
| CLI | JWT Bearer | `/api/v1/auth/login` |
| SDK | JWT Bearer | `/api/v1/auth/login` |
| API Key | Bearer Token | `/api/v1/*` (existing) |
| User Login | Username+Password → JWT | `/api/v1/auth/login` + `/api/v1/user/change-password` |

---

## API Endpoints

### Auth Endpoints (New JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Password login, returns JWT |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout, revoke tokens |
| GET | `/api/v1/auth/sessions` | List current sessions |
| GET | `/api/v1/auth/devices` | List user's devices |
| DELETE | `/api/v1/auth/devices/<id>` | Revoke device |
| GET | `/api/v1/auth/me` | Current user info |
| GET | `/api/v1/auth/admin/devices` | All devices (admin) |
| GET | `/api/v1/auth/admin/sessions` | All sessions (admin) |
| DELETE | `/api/v1/auth/admin/sessions/<id>` | Revoke session (admin) |

### Secrets Endpoints (Existing + Enhanced)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/<namespace>/<environment>` | Bearer | Get secrets |
| PUT | `/api/v1/<namespace>/<environment>` | Bearer | Replace secrets |
| PATCH | `/api/v1/<namespace>/<environment>` | Bearer | Update secrets |
| DELETE | `/api/v1/<namespace>/<environment>/keys/<key>` | Bearer | Delete secret |
| POST | `/api/v1/<namespace>/<environment>/bulk` | Bearer | Bulk merge |

### Meta Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/meta/environments` | List environments |
| GET | `/api/v1/meta/stats` | Aggregated stats |
| GET | `/api/v1/meta/analytics` | Activity trends |
| GET | `/api/v1/meta/health` | System health (admin) |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_REQUIRED | 401 | No authentication provided |
| AUTH_INVALID_TOKEN | 401 | Token invalid or malformed |
| AUTH_TOKEN_EXPIRED | 401 | Token has expired |
| AUTH_REFRESH_FAILED | 401 | Refresh token invalid |
| AUTH_INVALID_CREDENTIALS | 401 | Wrong password |
| AUTH_ACCOUNT_LOCKED | 429 | Too many failed attempts |
| AUTH_SESSION_EXPIRED | 401 | Server session expired |
| RESOURCE_NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Input validation failed |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |

---

## WebSocket Architecture (Scaffold)

### Event Types

| Event | Description |
|-------|-------------|
| `secret:created` | New secret added |
| `secret:updated` | Secret modified |
| `secret:deleted` | Secret removed |
| `secret:bulk_update` | Bulk operation completed |
| `audit:event` | Audit log entry created |
| `session:revoked` | Session invalidated |
| `device:revoked` | Device access revoked |
| `heartbeat` | Connection keepalive |

### Room Structure

Rooms are identified as `namespace:environment` (e.g., `production:main`).

### Integration Points

```python
# When a secret changes:
from ws_service import on_secret_change
on_secret_change("production", "main", "created", key="DATABASE_URL")

# When audit event occurs:
from ws_service import on_audit_event
on_audit_event("production", "main", {"action": "CREATE_VARIABLE", "key": "API_KEY"})
```

---

## Device Management

### Device Types

- `mobile` - Flutter/iOS/Android app
- `desktop` - Desktop clients
- `cli` - Command-line tools
- `sdk` - SDK integrations

### Device Session Flow

1. User logs in with device info
2. Device registered with unique ID
3. Device receives refresh token
4. Device uses refresh token to get access tokens
5. Device can be revoked remotely

### Multi-Device Support

Users can:
- See all their devices
- Revoke individual devices
- Force logout across all devices (admin)

---

## Security Considerations

### Token Storage

| Token | Client Storage | Server Storage |
|-------|----------------|-----------------|
| Access Token | Memory only | None ( stateless) |
| Refresh Token | Secure Storage | File (hash) |
| API Key | User's choice | PBKDF2 hashed |

### Password Storage

| Field | Storage | Format |
|-------|---------|--------|
| Password Hash | `data/users.json` | `pbkdf2_sha256$480000$<salt>$<hash>` |
| Per-User Salt | Embedded in hash | 16 random bytes, base64 encoded |
| Temp Password | Never stored plain | `secrets.token_urlsafe(12)` (~96 bits entropy) |

### File-Based Persistence

The following files are created for token management:

- `refresh_tokens.json` - Refresh token registry (hashed)
- `device_sessions.json` - Device session registry

These files are stored alongside encrypted secrets, maintaining the self-hosted philosophy.

---

## Future Enhancements

### Phase 2 (Not Implemented)

1. **flask-socketio Integration** - Full WebSocket support
2. **Redis Adapter** - For horizontal scaling
3. **Push Notifications** - FCM/APNs integration
4. **OAuth2/OIDC** - SSO integration
5. **LDAP/Active Directory** - Enterprise auth
6. **Multi-Factor Authentication** - TOTP/WebAuthn for developer accounts

### Production Checklist

- [ ] Configure SSL/TLS termination
- [ ] Set up reverse proxy (nginx/Caddy)
- [ ] Configure CORS for production domains
- [ ] Set up monitoring/alerting
- [ ] Implement rate limiting per-client
- [ ] Add request signing for high-security ops

---

## Migration Guide

### For Existing API Clients

Existing API key authentication continues to work unchanged:

```bash
curl -H "Authorization: Bearer <api_key>" \
     https://your-server.com/api/v1/production/main
```

### For New Mobile/SDK Clients

```python
import requests

# Login
response = requests.post("https://your-server.com/api/v1/auth/login", json={
    "namespace": "production",
    "environment": "main",
    "password": "your_password",
    "device_name": "My Device",
    "device_type": "sdk",
    "platform": "python"
})
tokens = response.json()["data"]

# Use access token
access_token = tokens["access_token"]
response = requests.get(
    "https://your-server.com/api/v1/production/main",
    headers={"Authorization": f"Bearer {access_token}"}
)
```

### For Flutter Clients

```dart
// Login
final response = await dio.post('/api/v1/auth/login', data: {
  'namespace': 'production',
  'environment': 'main',
  'password': password,
  'device_name': 'iPhone 15',
  'device_type': 'mobile',
  'platform': 'ios',
});

// Store tokens securely
await secureStorage.write('access_token', response.data['access_token']);
await secureStorage.write('refresh_token', response.data['refresh_token']);
```

---

*Document generated: 2026-05-14*
*Secure Environment Manager - Enterprise Backend Architecture v1.0*