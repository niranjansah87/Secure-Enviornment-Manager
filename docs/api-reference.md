# SEM V2 REST API Reference

The Secure Environment Manager V2 API is a RESTful interface designed for multi-tenant, envelope-encrypted secrets management.

All responses use the standard JSON envelope:
```json
{
  "success": true,
  "data": { ... }
}
```
In case of errors:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation"
  }
}
```

---

## Authentication

All protected endpoints require an ES256 JWT in the `Authorization` header:
```http
Authorization: Bearer <access_token>
```

### 1. `POST /api/v1/auth/login`
Authenticate using one of three credentials:
- **Master token**: `{ "master_token": "..." }`
- **Username + Password**: `{ "organization": "default", "username": "...", "password": "..." }`
- **API Key**: `{ "api_key": "sem_..." }`

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "<jwt>",
    "refresh_token": "<token>",
    "token_type": "Bearer",
    "expires_in": 900,
    "must_change_password": false
  }
}
```

### 2. `POST /api/v1/auth/refresh`
Rotate refresh token:
```json
{
  "refresh_token": "<token>"
}
```

### 3. `GET /api/v1/auth/me`
Retrieve the current authenticated user identity and claims.

---

## Projects & Environments

### `GET /api/v1/projects`
List all projects accessible within the authenticated organization.

### `POST /api/v1/projects`
Create a new project.
```json
{
  "name": "Backend Service",
  "slug": "backend-service"
}
```

### `GET /api/v1/projects/:projectId/environments`
List environments for a project (`production`, `staging`, etc.).

### `POST /api/v1/projects/:projectId/environments`
Create a new environment in a project.
```json
{
  "name": "Production",
  "slug": "production"
}
```

---

## Secrets Management

### `GET /api/v1/projects/:projectId/environments/:environmentId/secrets`
List secret metadata in the specified environment (keys, versions, update dates, sensitive flag). Plaintext values are never returned in list endpoints.

### `GET /api/v1/projects/:projectId/environments/:environmentId/secrets/:key/value`
Retrieve the decrypted plaintext value for a single secret.
```json
{
  "success": true,
  "data": {
    "key": "DATABASE_URL",
    "value": "postgres://user:pass@db:5432/prod"
  }
}
```

### `PUT /api/v1/projects/:projectId/environments/:environmentId/secrets/:key`
Create or update a secret:
```json
{
  "value": "secret_value_here",
  "description": "Primary database connection",
  "is_sensitive": true
}
```

### `DELETE /api/v1/projects/:projectId/environments/:environmentId/secrets/:key`
Delete a secret.

### `POST /api/v1/projects/:projectId/environments/:environmentId/secrets/bulk`
Bulk replace or import secrets into an environment.

### `GET /api/v1/projects/:projectId/environments/:environmentId/secrets/export?format=dotenv|json|yaml`
Export all decrypted secrets in the environment in dotenv, JSON, or YAML format.

---

## Templates

### `GET /api/v1/templates`
List all 22 production environment templates (Next.js Enterprise, Django Advanced, Node Microservice, FastAPI ML, Spring Boot, etc.).

### `POST /api/v1/projects/:projectId/environments/:environmentId/templates/:templateId/apply`
Apply a template directly to an environment.

---

## Remote Config & SDK Integration

### `GET /api/v1/remote/:projectSlug/:environmentSlug`
Fetch key-value configuration for applications and SDKs using Bearer tokens (obtained via API key login). Supports caching headers (`ETag`, `If-None-Match`).

---

## Audit Logs

### `GET /api/v1/audit`
Query system audit events.
Query parameters:
- `action`: Filter by action (e.g. `secret.read`, `auth.login`, `secret.update`)
- `from`: ISO timestamp start date
- `to`: ISO timestamp end date
- `limit`: Default 50, maximum 200
- `offset`: Pagination offset
