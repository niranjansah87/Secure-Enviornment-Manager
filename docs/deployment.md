# Secure Environment Manager - Deployment Guide

## Overview

The Secure Environment Manager (SEM) is a self-hosted secrets management platform:
- **Encrypted JSON file storage** (no external database)
- **JWT authentication** for web, mobile, SDK, and CLI
- **WebSocket support** for real-time updates
- **Docker Compose** for container orchestration
- **Host-installed Nginx** as reverse proxy

---

## Architecture

```
                         Internet
                              ↓
                    Host Nginx (:80, :443)
                    TLS + Security Headers
                    Rate Limiting
                    WebSocket Upgrade
                              ↓
         ┌────────────────────┴────────────────────┐
         │         Docker Compose (internal)       │
         │                                           │
         │  ┌───────────┐  ┌───────────┐            │
         │  │ Backend  │  │ Frontend  │            │
         │  │  :8070   │  │   :3000   │            │
         │  └─────┬─────┘  └─────┬─────┘            │
         │        └──────┬──────┘                  │
         │               ↓                          │
         │    Encrypted JSON Storage               │
         │           (named volume)                 │
         └─────────────────────────────────────────┘
```

**Key points:**
- Nginx runs on the **host machine** (not as Docker container)
- Docker services expose ports on **127.0.0.1** only
- Only Nginx is publicly accessible via ports 80/443
- Backend and frontend are **internal** to Docker network

---

## Prerequisites

1. **Docker Engine** (v20.10+)
2. **Docker Compose** (v2.0+)
3. **Nginx** installed on host (`sudo apt install nginx` or equivalent)
4. **OpenSSL** for SSL certificates

---

## Quick Start

### 1. Start Docker Services

```bash
# Start all services (backend, frontend, prometheus)
docker-compose up -d

# Verify all services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Configure Host Nginx

```bash
# Copy Nginx configuration
sudo cp nginx/sem.conf /etc/nginx/sites-available/sem.conf

# Enable the site
sudo ln -s /etc/nginx/sites-available/sem.conf /etc/nginx/sites-enabled/

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed SSL certificate (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Access the Application

| Service | URL |
|---------|-----|
| Web App | https://localhost |
| Backend API | https://localhost/api/v1 |
| Health Check | https://localhost/healthz |
| Metrics | http://localhost:9090 (Prometheus) |

---

## Production Deployment

### 1. Domain and SSL

```bash
# For Let's Encrypt certificates
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sem.example.com

# Or manually install certificates
sudo cp your/cert.pem /etc/nginx/ssl/cert.pem
sudo cp your/key.pem /etc/nginx/ssl/key.pem
```

### 2. Update Nginx Configuration

Edit `/etc/nginx/sites-available/sem.conf`:

```nginx
server_name sem.example.com;  # Update your domain
```

Reload Nginx:
```bash
sudo systemctl reload nginx
```

### 3. Start Docker Services

```bash
docker-compose up -d
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl https://localhost/healthz

# Check API
curl -H "Authorization: Bearer <token>" https://localhost/api/v1/global/main
```

---

## Mobile App Connectivity

The same backend supports:
- **Flutter mobile app** (iOS/Android)
- **SDKs** (any HTTP client)
- **CLI tools**

### Connection URLs

| Mobile Environment | API URL | WebSocket URL |
|-------------------|---------|---------------|
| Local (emulator) | http://10.0.2.2:8070 | ws://10.0.2.2:8070/ws |
| LAN (physical) | http://192.168.1.x:8070 | ws://192.168.1.x:8070/ws |
| Production HTTPS | https://your-domain.com | wss://your-domain.com/ws |

### Build Configuration

```dart
// Production build
flutter build --dart-define=ENVIRONMENT=production

// For self-hosted, configure API base URL
final env = Environments.selfHosted(
  apiBaseUrl: 'https://secrets.company.com',
  wsUrl: 'wss://secrets.company.com/ws',
);
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login with password, returns JWT |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/logout | Revoke tokens |
| GET | /api/v1/auth/me | Get current user info |

### Secrets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/{namespace}/{environment} | List secrets |
| GET | /api/v1/{namespace}/{environment}/{key} | Get secret |
| PUT | /api/v1/{namespace}/{environment}/{key} | Create/update secret |
| DELETE | /api/v1/{namespace}/{environment}/{key} | Delete secret |
| POST | /api/v1/{namespace}/{environment}/bulk | Bulk operations |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| connect | Client→Server | Connect with JWT token |
| subscribe | Client→Server | Subscribe to room |
| secret:updated | Server→Client | Secret was updated |
| session:revoked | Server→Client | Session invalidated |

---

## Environment Variables

Configure in `.env` file:

```env
# Flask
FLASK_SECRET_KEY=<32-byte-secret>
ENCRYPTION_KEY=<32-byte-encryption-key>
DASHBOARD_PASSWORD=<dashboard-password>

# Security
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=15

# CORS (add your domains)
CORS_ORIGINS=http://localhost:3000,https://your-domain.com

# Mobile CORS schemes
CORS_ORIGINS_MOBILE=app://flutter.app,capacitor://localhost

# Production settings
FLASK_ENV=production
SESSION_COOKIE_SECURE=true
BEHIND_PROXY=true
```

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| TLS 1.2+ only | Nginx ssl_protocols |
| Strong ciphers | ssl_ciphers (ECDHE suite) |
| Rate limiting | Nginx limit_req_zone |
| CORS | Per-origin validation |
| Security headers | X-Frame-Options, HSTS, etc. |
| Non-root containers | user: 1000:1000 |
| Capability dropping | cap_drop: ALL |

---

## Troubleshooting

### Services won't start

```bash
# Check backend logs
docker-compose logs backend

# Verify ports aren't in use
sudo netstat -tlnp | grep -E '8070|3000|9090'
```

### Nginx can't reach backend

```bash
# Verify backend is running
curl http://127.0.0.1:8070/healthz

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Mobile app can't connect

1. For Android emulator: use `http://10.0.2.2:8070` instead of localhost
2. For physical device: ensure server is reachable via LAN IP
3. Check firewall: `sudo ufw status`
4. For HTTPS: ensure device trusts your SSL certificate

### WebSocket connection fails

```bash
# Test WebSocket manually
curl --include \
  --no-buffer \
  --header "Connection: Upgrade" \
  --header "Upgrade: websocket" \
  --header "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  --header "Sec-WebSocket-Version: 13" \
  https://localhost/ws
```

---

## Monitoring

### Prometheus Metrics

```bash
# Prometheus UI
open http://localhost:9090

# Backend metrics
curl http://127.0.0.1:8070/metrics
```

### Health Checks

```bash
# Backend health
curl http://127.0.0.1:8070/healthz
# Returns: {"status": "healthy"}

# Via Nginx
curl https://localhost/healthz
```

---

## Future Enhancements

### Redis Integration (Optional)

For horizontal scaling and multi-instance deployment:

```bash
# Add Redis to docker-compose.yml
redis:
  image: redis:alpine
  networks:
    - sem-network
```

When Redis is configured, WebSocket sessions can be shared across instances.

---

## Quick Reference

| Item | Command/Path |
|------|--------------|
| Start services | `docker-compose up -d` |
| Stop services | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Shell into backend | `docker-compose exec backend sh` |
| Nginx config | `/etc/nginx/sites-available/sem.conf` |
| SSL certificates | `/etc/nginx/ssl/` |
| Docker logs | `/var/lib/docker/containers/` |
| Health check | `curl http://127.0.0.1:8070/healthz` |

---

## File Structure

```
Secure-Enviornment-Manager/
├── docker-compose.yml     # Docker services (backend, frontend, prometheus)
├── nginx/
│   └── sem.conf          # Host Nginx configuration
├── .env                  # Environment variables
├── app.py                # Flask backend entry point
├── core/
│   ├── jwt_auth.py       # JWT authentication
│   └── config.py         # Configuration management
├── websocket_server.py   # Flask-SocketIO integration
├── frontend/             # Next.js web app
└── sem_mobile/           # Flutter mobile app
```