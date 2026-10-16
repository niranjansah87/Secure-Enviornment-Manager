# Secure Environment Manager V2 — Deployment Guide

## Overview

Secure Environment Manager V2 is an enterprise multi-tenant secrets management platform built on:
- **NestJS + Fastify** API service (`@sem/api`, port 3001)
- **Next.js 15** frontend web interface (port 3000)
- **BullMQ + Redis 7** maintenance & email worker (`@sem/worker`)
- **PostgreSQL 16** with Drizzle ORM
- **AES-256-GCM envelope encryption** at rest
- **Nginx** reverse proxy with TLS termination and security headers (`infra/nginx/sem-v2.conf`)

---

## Architecture

```
                         Internet / Clients
                                 │
                                 ▼
                     Host Nginx (:80, :443)
                  infra/nginx/sem-v2.conf
                  TLS + CSP + Rate Limiting
                  WebSocket proxy (/socket.io/)
                                 │
           ┌─────────────────────┴─────────────────────┐
           │                                           │
           ▼                                           ▼
   API Service (:3001)                         Next.js App (:3000)
   NestJS Fastify                              Server-side Rendered
           │
     ┌─────┴───────────────┐
     ▼                     ▼
PostgreSQL 16         Redis 7 (Optional)
Database               Queue / Cache
     ▲                     ▲
     └─────────┬───────────┘
               │
         Worker Process
         BullMQ Maintenance
```

---

## Production Deployment with Docker Compose

SEM V2 includes an automated production stack configuration in `docker-compose.v2.yml`.

### 1. Configure Production Environment
Create `.env` based on `.env.example`:
```bash
cp .env.example .env
```
Populate production keys and credentials:
```bash
# Generate high-entropy cryptographic keys:
pnpm keys:generate
```
Ensure `POSTGRES_PASSWORD`, `DATABASE_URL`, `SEM_MASTER_KEY`, and `SEM_MASTER_TOKEN` are set securely.

### 2. Build & Launch Containers
```bash
docker compose -f docker-compose.v2.yml up --build -d
```
The compose stack automatically:
1. Provisions `postgres` and runs health checks.
2. Runs the database migration container (`migrate`).
3. Launches the API service on `127.0.0.1:3001`.
4. Launches the BullMQ worker.

### 3. Configure Nginx Reverse Proxy
Copy `infra/nginx/sem-v2.conf` to `/etc/nginx/sites-available/sem-v2.conf`:
```bash
sudo cp infra/nginx/sem-v2.conf /etc/nginx/sites-available/sem.example.com.conf
sudo ln -s /etc/nginx/sites-available/sem.example.com.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Health Checks & Verification

Verify the deployment is healthy:

```bash
# API liveness
curl http://localhost:3001/healthz
# Response: {"status":"ok","uptime":...}

# Stack readiness (PostgreSQL & Redis connectivity)
curl http://localhost:3001/readyz
# Response: {"status":"ok","checks":{"database":"ok","redis":"ok"}}

# Prometheus metrics
curl http://localhost:3001/metrics
```