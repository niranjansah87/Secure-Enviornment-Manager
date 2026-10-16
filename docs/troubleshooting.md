# Troubleshooting (SEM V2)

If you encounter issues while setting up or operating Secure Environment Manager V2, use this guide for quick diagnosis and resolution.

---

## 🔴 Server & Connection Issues

### 1. "Cannot connect to backend" or Network Error
- **Cause**: Backend API is offline or running on a different port.
- **Solution**:
  1. Verify the backend is running:
     ```bash
     curl http://localhost:3001/healthz
     ```
  2. If offline, start it from repository root:
     ```bash
     pnpm dev:backend
     ```
  3. Verify `CORS_ORIGINS` in `.env` includes `http://localhost:3000`.

### 2. Readiness Probe Degraded (`503 Service Unavailable` on `/readyz`)
- **Cause**: PostgreSQL is not reachable or Redis was enabled (`REDIS_ENABLED=true`) but offline.
- **Solution**:
  1. Inspect the `/readyz` response:
     ```bash
     curl http://localhost:3001/readyz
     ```
  2. If `database: fail`: Check `DATABASE_URL` in `.env` and verify PostgreSQL service is active (`5432`).
  3. If `redis: fail`: Either start Redis on port `6379`, or set `REDIS_ENABLED=false` in `.env` to run in standalone database mode.

---

## 🟠 Authentication & Session Issues

### 1. "Invalid credentials" (401 Unauthorized)
- **Master Token**: Ensure `SEM_MASTER_TOKEN` matches the value configured in `.env`.
- **Developer Login**: Ensure the user exists in `users` table (`pnpm db:bootstrap` to create defaults).
- **Password Reset**: Admin can reset user credentials via:
  ```bash
  POST /api/v1/admin/users/:id/reset-password
  ```

### 2. "Token expired" or "Session is no longer active"
- SEM V2 uses 15-minute ES256 access tokens and 30-day refresh tokens.
- Frontend automatically rotates tokens on 401 via `refreshAccessToken()`. If the session was revoked or expired, sign in again.

### 3. "Too many login attempts. Try again later." (Account Lockout)
- Sliding window rate limiting triggers after repeated failed logins.
- Wait 15 minutes (`RATE_LOGIN_WINDOW=900`) for the cooldown, or restart the server if running in local in-memory fallback mode.

---

## 🟡 Encryption & Decryption Issues

### 1. "Ciphertext MAC check failed" or Decryption Errors
- **Cause**: Envelope key mismatch. Secrets are encrypted using an Environment Data Encryption Key (DEK) wrapped by a Project Key Encryption Key (KEK), wrapped by `SEM_MASTER_KEY`.
- **Solution**:
  1. Ensure `SEM_MASTER_KEY` in `.env` matches the key used when encrypting the rows.
  2. Never change or overwrite `SEM_MASTER_KEY` once projects and secrets have been created in PostgreSQL.

---

## 🟢 Logs & Observability

- **API Logs**: Pino structured JSON logs printed to stdout. Set `LOG_LEVEL=debug` for detailed request tracing.
- **Prometheus Metrics**:
  ```bash
  curl http://localhost:3001/metrics
  ```
- **Audit Logs**:
  Query append-only database logs in real time via:
  ```bash
  curl http://localhost:3001/api/v1/audit \
    -H "Authorization: Bearer <access_token>"
  ```
