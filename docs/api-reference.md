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
