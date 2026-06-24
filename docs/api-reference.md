# API Reference

The SEM API is a RESTful interface designed for programmatic access to secrets. All operations require authentication via **Bearer Tokens**.

## Authentication

To authenticate your requests, include the `Authorization` header with a valid token:

```http
Authorization: Bearer <your_api_token>
```

### Supported Tokens
1.  **Master API Token**: Full system access (admin only).
2.  **Dashboard Password Hash**: For administrative actions.
3.  **Namespace-Specific API Key**: Grants access *only* to a specific namespace.
4.  **Username + Password (JWT)**: Developer account credentials — returns JWT with role, scopes, and `must_change_password` flag.

## Metadata Endpoints

### 🟢 List Environments
List all environments accessible to the provided token.

- **Method**: `GET`
- **URL**: `/api/v1/meta/environments`
- **Response**:
  ```json
  {
    "environments": {
      "project-alpha": ["production", "staging"],
      "project-beta": ["main"]
    }
  }
  ```

### 📊 System Stats
Get a summary of system-wide metrics (admin only).

- **Method**: `GET`
- **URL**: `/api/v1/meta/stats`
- **Response**:
  ```json
  {
    "environment_count": 5,
    "secret_count": 42,
    "last_updated": "2024-04-03T14:30:00Z",
    "recent_activity": [...]
  }
  ```

## Environment Endpoints

### 🟢 Get Secrets
Retrieve all secrets for a specific namespace and environment.

- **Method**: `GET`
- **URL**: `/api/v1/{namespace}/{environment}`
- **Response**:
  ```json
  {
    "DATABASE_URL": "postgres://user:pass@host:5432/db",
    "API_KEY": "sk_test_..."
  }
  ```

### 🟡 Update Secrets (Partial)
Update specific secrets within an environment.

- **Method**: `PATCH`
- **URL**: `/api/v1/{namespace}/{environment}`
- **Request Body**:
  ```json
  {
    "NEW_VAR": "value",
    "EXISTING_VAR": "updated_value"
  }
  ```
- **Response**:
  ```json
  {
    "status": "updated",
    "count": 2
  }
  ```

### 🔴 Replace All Secrets
Overwrite the entire environment with a new set of secrets.

- **Method**: `PUT`
- **URL**: `/api/v1/{namespace}/{environment}`
- **Request Body**:
  ```json
  {
    "KEY1": "val1",
    "KEY2": "val2"
  }
  ```
- **Response**:
  ```json
  {
    "status": "replaced",
    "count": 2
  }
  ```

### 🗑️ Delete a Secret
Delete a single secret from an environment.

- **Method**: `DELETE`
- **URL**: `/api/v1/{namespace}/{environment}/keys/{key}`
- **Response**:
  ```json
  {
    "status": "deleted",
    "key": "DATABASE_URL"
  }
  ```

## History & Audit

### 🟢 View History
Retrieve the version history of an environment.

- **Method**: `GET`
- **URL**: `/api/v1/{namespace}/{environment}/history`
- **Response**:
  ```json
  {
    "history": [
      {
        "id": "abc123...",
        "timestamp": "2024-04-03T10:00:00Z",
        "action": "UPDATE",
        "actor": "api_key:project-alpha"
      }
    ]
  }
  ```

### 🟢 View Audit Logs
Retrieve the audit trail for an environment.

- **Method**: `GET`
- **URL**: `/api/v1/{namespace}/{environment}/audit`
- **Query Params**: `limit` (default: 100)

## User Management Endpoints

These endpoints manage developer accounts. All require admin authentication (master API token, dashboard password, or admin JWT).

### 🟢 Create User
Create a new developer account. Returns a temporary password shown once.

- **Method**: `POST`
- **URL**: `/api/v1/admin/users`
- **Auth**: Admin only
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "role": "developer",
    "email": "john@example.com",
    "scopes": ["production/main", "staging/dev"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user_id": "usr_a1b2c3d4e5f6g7h8",
      "username": "johndoe",
      "temp_password": "xK9mP2vR7sW4..."
    }
  }
  ```

### 🟢 List Users
Get all user accounts.

- **Method**: `GET`
- **URL**: `/api/v1/admin/users`
- **Auth**: Admin only
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {
          "user_id": "usr_a1b2...",
          "username": "johndoe",
          "email": "john@example.com",
          "role": "developer",
          "scopes": ["production/main"],
          "status": "active",
          "must_change_password": false,
          "created_at": "2026-06-24T10:00:00Z",
          "last_login": "2026-06-24T14:30:00Z"
        }
      ]
    }
  }
  ```

### 🟡 Update User
Modify a user's email, role, scopes, or status.

- **Method**: `PATCH`
- **URL**: `/api/v1/admin/users/{user_id}`
- **Auth**: Admin only
- **Request Body**:
  ```json
  {
    "email": "newemail@example.com",
    "role": "admin",
    "scopes": ["*"],
    "status": "active"
  }
  ```

### 🟠 Reset User Password
Admin resets a user's password to a new temporary password.

- **Method**: `POST`
- **URL**: `/api/v1/admin/users/{user_id}/reset-password`
- **Auth**: Admin only
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "temp_password": "aB3cD7eF9gH2..."
    }
  }
  ```

### 🔴 Delete User
Remove a user account.

- **Method**: `DELETE`
- **URL**: `/api/v1/admin/users/{user_id}`
- **Auth**: Admin only

### 🟢 Change Password (Self-Service)
Authenticated users change their own password. If `must_change_password` is true in JWT, this is enforced.

- **Method**: `POST`
- **URL**: `/api/v1/user/change-password`
- **Auth**: Any valid JWT
- **Request Body**:
  ```json
  {
    "new_password": "my-new-secure-password"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJ...",
      "refresh_token": "semr_...",
      "message": "Password changed successfully. Fresh JWT issued."
    }
  }
  ```

### Login with Username + Password

- **Method**: `POST`
- **URL**: `/api/v1/auth/login`
- **Request Body** (user mode):
  ```json
  {
    "username": "johndoe",
    "password": "user-password",
    "device_name": "Chrome on Windows",
    "device_type": "desktop",
    "platform": "web"
  }
  ```
- **Response**:
  ```json
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
      "must_change_password": false
    }
  }
  ```

## Error Responses

| Status Code | Description |
| :--- | :--- |
| `401` | Unauthorized (Missing or invalid Bearer token) |
| `403` | Forbidden (Token does not have access to this namespace) |
| `404` | Not Found (Invalid namespace or environment name) |
| `400` | Bad Request (Invalid JSON or key pattern) |
| `500` | Internal Server Error (Decryption failure or disk error) |

---

Next: [CLI Guide](cli-guide.md)
