# Security Documentation

The **Secure Environment Manager (SEM)** is built with a "Security-First" philosophy. This document provides a detailed look at the encryption, authentication, and audit mechanisms that protect your application's secrets.

## 1. Encryption Model (At-Rest)

SEM uses the **Fernet** symmetric encryption standard, which is part of the Python `cryptography` library.

### Technology Stack
- **Algorithm**: AES-256 in CBC mode.
- **Key Derivation**: Fernet uses a 128-bit AES key and 128-bit HMAC-SHA256 key.
- **Payload Structure**: `Version | Timestamp | IV | Ciphertext | HMAC`.

### The Encryption Process
1.  **Serialization**: Secrets are JSON-serialized into a UTF-8 byte stream.
2.  **Encryption**: The byte stream is encrypted using the `ENCRYPTION_KEY`.
3.  **Storage**: The resulting base64-encoded string is saved as a `.enc` file.

### Key Management
> [!CAUTION]
> **Zero-Knowledge Principle**: The `ENCRYPTION_KEY` is **NEVER** stored on the server's disk or in the database. It exists only in the server's memory while the process is running. This means that an attacker who steals the storage files but does not have the key cannot decrypt the secrets.

## 2. Authentication Model

SEM uses a multi-layered authentication system to control access to secrets.

### Programmatic Access (Bearer Tokens)
All API requests must include a `Bearer <TOKEN>` in the `Authorization` header.
- **Master API Token**: Grants full access to all namespaces.
- **Namespace API Keys**: Grants access *only* to a single namespace. 
- **Dashboard Password Hash**: Next.js frontend uses the dashboard password hash for session-based authentication.

### Session Security
- **Secure Cookies**: Cookies are set with `HttpOnly`, `Secure`, and `SameSite=Lax` flags.
- **Automatic Timeout**: Sessions expire after 60 minutes (configurable via `SESSION_TIMEOUT_MINUTES`).
- **Brute-Force Protection**: After 5 failed login attempts, the IP address is locked out for 15 minutes.

## 3. Audit Logging & Traceability

Every sensitive action in SEM is recorded in a tamper-evident audit log.

### Logged Events
- **CRUD Operations**: Creation, update, and deletion of any secret.
- **Access Events**: Every time a secret is read or exported.
- **Auth Events**: Successful and failed login attempts.
- **System Events**: Template applications and version rollbacks.

### Audit Log Structure
Each log entry includes:
- **Timestamp**: ISO 8601 UTC.
- **Action**: The operation performed (e.g., `VARIABLE_UPDATE`).
- **Actor**: The identity of the requester (e.g., `api_key:project-alpha`).
- **Source IP**: The requester's IP address.
- **Details**: Specific information about the change (e.g., "Updated DATABASE_URL from '...' to '...'").

## 4. Threat Considerations

| Threat | SEM Mitigation |
| :--- | :--- |
| **Disk Theft** | Data is encrypted at rest using AES-256. |
| **API Interception** | SEM requires HTTPS (via Nginx/Caddy) for all communications. |
| **Credential Stuffing** | Built-in IP-based rate limiting and lockout mechanisms. |
| **Insider Threat** | Full audit logs and per-namespace API keys minimize blast radius. |

## Best Practices

> [!IMPORTANT]
> **Rotate Keys Regularly**: Change your `MASTER_API_TOKEN` and `DASHBOARD_PASSWORD` periodically.
> **Use TLS**: Never run SEM in production without a valid SSL certificate (e.g., via Let's Encrypt).
> **Principle of Least Privilege**: Use namespace-specific API keys for CI/CD pipelines instead of the master token.

---

Next: [Deployment Guide](deployment.md)
