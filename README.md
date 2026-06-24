<div align="center">

<img src="frontend/public/logo.png" alt="Secure Environment Manager Logo" width="200" height="auto">

# 🔐 Secure Environment Manager

**The professional, open-source vault for your environment variables. Fully encrypted, audit-ready, and developer-obsessed.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/network)
[![Issues](https://img.shields.io/github/issues/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/issues)
[![Last Commit](https://img.shields.io/github/last-commit/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/commits/main)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [SDK &amp; CLI](#-sdk--cli) • [Dotenv Server](#-dotenv-server) • [Deployment](#-deployment)

</div>

---

## 🎯 What is SEM?

Secure Environment Manager (SEM) is a **self-hosted secrets management platform** designed for teams and enterprises who need:

- **Complete data ownership** - Your secrets never leave your infrastructure
- **Encrypted storage** - AES-256 encryption at rest
- **Multi-platform support** - Web, Mobile (Flutter), SDKs, and CLI
- **Enterprise-ready** - JWT auth, audit logs, API keys, WebSocket realtime

---

## ✨ Features

### 🔒 Security & Protection

- **AES-256 Encryption**: All secrets encrypted at rest using Fernet
- **JWT Authentication**: Bearer token auth with device tracking
- **API Key Management**: Admin-controlled keys with expiry
- **Audit Logging**: Complete trail of all access and changes
- **Secret Versioning**: Automatic snapshots and rollback
- **User Management**: Multi-developer accounts with role-based access control (admin/developer)
- **Password Security**: PBKDF2-SHA256 (480k iterations) with per-user random salt

### 🌐 Multi-Platform

- **Web UI**: Next.js 14 with modern React
- **Mobile App**: Flutter (iOS/Android)
- **JavaScript SDK**: TypeScript SDK for Node.js and Browser
- **CLI Tool**: Full-featured command-line interface
- **REST API**: Full programmatic access

### 📊 Advanced Management

- **Namespaces & Environments**: Organize secrets logically
- **Bulk Operations**: Import/export .env, JSON, YAML
- **Templates**: Quick-start for Django, React, Express, Flask
- **WebSocket Realtime**: Live updates on secret changes
- **Environment Comparison**: Detect drift between envs
- **User Accounts**: Per-developer accounts with scoped namespace/environment access
- **Email Integration**: Optional SMTP for welcome emails and password resets

### 🌐 Dotenv Server (Remote Config)

- **Centralized Secrets**: One source of truth for all your projects' environment variables
- **Startup Fetching**: Backends pull their config from SEM at boot — no `.env` files to sync
- **API Key Scoping**: Per-namespace keys limit blast radius
- **Automatic Merging**: Remote secrets win, local `.env` fills gaps, OS env overrides connection details
- **Multi-Language**: Python, Node.js, Go, or anything that can make an HTTP request

---

## 🚀 Quick Start

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Access the application
open https://localhost
```

### Manual Setup

```bash
# Clone the repository
git clone https://github.com/niranjansah87/Secure-Environment-Manager.git
cd Secure-Environment-Manager

# Configure environment
cp .env.example .env
# Edit .env with your keys (see Configuration section below for all options)

# Start backend
pip install -r requirements.txt
python app.py

# Start frontend (new terminal)
cd frontend && npm install && npm run dev
```

---

## 🏗️ Architecture

```
                         Internet
                              ↓
                    Host Nginx (:80/:443)
                    TLS + Security Headers
                    Rate Limiting
                    WebSocket Upgrade
                              ↓
         ┌────────────────────┴────────────────────┐
         │         Docker Compose (internal)        │
         │                                          │
         │  ┌───────────┐  ┌───────────┐         │
         │  │ Backend   │  │ Frontend   │         │
         │  │  :8070    │  │   :3000    │         │
         │  └─────┬─────┘  └─────┬─────┘         │
         │        └──────┬──────┘                │
         │               ↓                        │
         │    Encrypted JSON Storage               │
         │           (named volume)                │
         └─────────────────────────────────────────┘
```

---

## 🔑 Authentication Modes

SEM supports **three credential types** that coexist simultaneously, selectable from the login page:

| Mode | Icon | Description | Best For |
|------|------|-------------|----------|
| **Dashboard Password** | Shield | Admin dashboard password from `.env` | Initial setup, admin access |
| **Master API Token** | Key | Full-access master token from `.env` | Admin API access |
| **User Login** | User | Username + password (PBKDF2 hashed) | Daily developer use |

### User Account Features
- **Role-Based Access**: `admin` and `developer` roles with scoped permissions
- **Per-User Salt**: Each password hashed with a unique 16-byte random salt
- **Forced Password Change**: Temp password on first login, must change immediately
- **Email Integration**: Optional SMTP for welcome/reset emails (non-blocking if not configured)
- **Scoped Access**: Limit users to specific namespaces and environments

---

## 📦 SDK & CLI

### JavaScript/TypeScript SDK

```typescript
import { createSemSDK } from '@sem-org/sem-sdk';

const sem = createSemSDK({
  baseUrl: 'https://your-sem-server.com',
});

// Login
await sem.login({ password: 'your-password' });

// Get secrets
const { secrets } = await sem.getSecrets('global', 'main');

// Create secret
await sem.createSecret('global', 'main', {
  key: 'DATABASE_URL',
  value: 'postgres://...',
});

// WebSocket for realtime updates
sem.connectWs();
sem.on('secret:change', (event) => {
  console.log('Secret changed:', event);
});
```

### CLI Tool

```bash
# Login
sem auth login

# List secrets
sem secrets list -n global -e main

# Get a secret
sem secrets get API_KEY

# Set a secret
sem secrets set DATABASE_URL postgres://...

# Export as .env
sem env pull production > .env

# Run with secrets
sem run exec production -- npm start

# WebSocket realtime
sem ws events
```

### Install SDK/CLI

```bash
# SDK
npm install @sem-org/sem-sdk

# CLI
npm install -g @sem-org/sem-cli
```

---

## 🌐 Dotenv Server — Remote Config for Your Backends

SEM acts as a **centralized dotenv server**. Instead of scattering `.env` files across every project and server, you store secrets once in SEM and every backend pulls them at startup.

### How It Works

```
Your Backend (.env)                  SEM (dotenv server)
┌──────────────────────┐            ┌──────────────────────┐
│ Only 2 lines:        │  HTTPS    │ All your secrets:     │
│ DOTENV_SERVER_URL    │ ───────→  │ DATABASE_URL          │
│ DOTENV_SERVER_KEY    │ ←───────  │ REDIS_URL             │
│ (Fernet key)         │  JSON     │ OPENAI_API_KEY        │
│ That's it. Nothing   │           │ STRIPE_SECRET_KEY     │
│ else in .env!        │           │ JWT_SECRET_KEY        │
└──────────────────────┘           │ ... and everything else│
                                   └──────────────────────┘
```

**The `DOTENV_SERVER_KEY` is the Fernet encryption key** — the same key SEM uses for `ENCRYPTION_KEY` and `MASTER_API_TOKEN`. One key, triple purpose: encrypt secrets at rest, authenticate API requests, and authenticate your backend.

### Step 1: Generate Your Fernet Key

```bash
git clone https://github.com/niranjansah87/Secure-Environment-Manager.git
cd Secure-Environment-Manager

# Generate ONE Fernet key — this is your server key for everything
python scripts/generate_keys.py
# → ENCRYPTION_KEY='d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg='

# Generate Flask secret key (separate, for session signing)
python -c "import secrets; print('FLASK_SECRET_KEY=' + secrets.token_hex(32))"
```

### Step 2: Configure SEM's `.env`

Set **the same Fernet key** for both `ENCRYPTION_KEY` and `MASTER_API_TOKEN`:

```env
# SEM .env
FLASK_SECRET_KEY=<generated-above>
ENCRYPTION_KEY=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
MASTER_API_TOKEN=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
DASHBOARD_PASSWORD=<choose-strong-password>
```

> **Why the same key?** `ENCRYPTION_KEY` encrypts secrets at rest. `MASTER_API_TOKEN` authenticates API calls. By using the same Fernet key, you only need to distribute ONE key to your backends.

```bash
# Start SEM
docker-compose up -d
# Or manually: pip install -r requirements.txt && python app.py
```

### Step 3: Add Your App's Secrets to SEM

Open the SEM dashboard, pick a namespace (e.g., `myapp`) and environment (e.g., `production`), add your secrets:

```
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET_KEY=super-secret-jwt-key
```

### Step 4: Configure Your Backend's `.env`

```env
DOTENV_SERVER_URL=https://dotenv.your-domain.com/api/v1/myapp/production
DOTENV_SERVER_KEY=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
```

> **`DOTENV_SERVER_KEY` = the same Fernet key** generated in Step 1. Only two lines needed.

### Step 5: Add the Config Loader to Your Backend

```python
# config.py
import os, httpx
from pydantic_settings import BaseSettings

class BootstrapSettings(BaseSettings):
    DOTENV_SERVER_URL: str | None = None
    DOTENV_SERVER_KEY: str | None = None
    model_config = {"env_file": ".env", "extra": "ignore"}

def fetch_remote_config(url: str, api_key: str) -> dict:
    resp = httpx.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10)
    resp.raise_for_status()
    return resp.json()  # {"DATABASE_URL": "...", "SECRET_KEY": "...", ...}

# Merge: remote SEM wins, local .env fills gaps
bootstrap = BootstrapSettings()
remote = fetch_remote_config(bootstrap.DOTENV_SERVER_URL, bootstrap.DOTENV_SERVER_KEY)
settings = YourAppSettings(**{**bootstrap.model_dump(), **remote})
```

> **Any language works.** Pattern: `GET {url}` + `Authorization: Bearer {key}` → parse JSON → merge. [Full guide →](docs/DOTENV_SERVER.md)

### Deploying the Dotenv Server

```bash
# Docker Compose (recommended)
docker-compose up -d

# Systemd (manual)
sudo cp dotenv.service /etc/systemd/system/
sudo systemctl enable --now dotenv

# Nginx reverse proxy
sudo cp nginx/dotenv_soundchan_ai.conf /etc/nginx/sites-available/dotenv.conf
sudo ln -s /etc/nginx/sites-available/dotenv.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d dotenv.your-domain.com

# Verify
curl -H "Authorization: Bearer d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=" \
  https://dotenv.your-domain.com/api/v1/global/main
```

### Key Points

| Key | Set In | Purpose |
|-----|--------|---------|
| `ENCRYPTION_KEY` | SEM `.env` | Encrypts/decrypts secrets at rest |
| `MASTER_API_TOKEN` | SEM `.env` | **Same Fernet key** — authenticates API Bearer tokens |
| `DOTENV_SERVER_KEY` | Consumer `.env` | **Same Fernet key** — sent as Bearer token by your backend |
| `FLASK_SECRET_KEY` | SEM `.env` | Flask session signing (separate, random hex) |

**One Fernet key, three roles.** Generate once with `python scripts/generate_keys.py`, use everywhere.

- **Rotate once, update everywhere** — Change a secret in SEM, restart services, done
- **No `.env` sprawl** — Stop emailing `.env` files or storing them in 1Password
- **Audit trail** — Every fetch is logged, you know who accessed what and when

📖 **Full guide:** [docs/DOTENV_SERVER.md](docs/DOTENV_SERVER.md)

---

## 🖥️ Deployment Options

### Self-Hosted (Recommended)

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Configure Host Nginx
sudo cp nginx/sem.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/sem.conf /etc/nginx/sites-enabled/

# 3. Setup SSL
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem

# 4. Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Mobile Development

```bash
# Android Emulator
flutter run -d emulator

# Physical Device (same network)
# Configure: http://<server-ip>:8070

# Production Build
flutter build apk --release
flutter build ios --release
```

---

## 🔐 Security Highlights

> [!IMPORTANT]
> Your `ENCRYPTION_KEY` is the master key. Store it securely and never share it.

- **Encryption at Rest**: AES-256-CBC via Fernet protocol
- **Zero External Dependencies**: File-based storage eliminates DB attack vectors
- **Complete Audit Trail**: Every action logged with timestamp, IP, user
- **JWT with Device Tracking**: Know which devices have access
- **Non-root Containers**: Docker runs with dropped privileges
- **Rate Limiting**: Protection against brute force attacks

---

## 🛠️ Tech Stack

| Component  | Technology                         |
| ---------- | ---------------------------------- |
| Backend    | Flask + Gunicorn (Python 3.11)     |
| Frontend   | Next.js 14 + TypeScript + Tailwind |
| Mobile     | Flutter (iOS/Android)              |
| Database   | Encrypted JSON files               |
| Proxy      | Nginx (host-installed)             |
| Monitoring | Prometheus + Grafana               |
| Containers | Docker Compose                     |
| Auth       | PBKDF2-SHA256 + JWT (PyJWT)        |

---

## 📚 Documentation

- [Deployment Guide](docs/deployment.md) - Full deployment instructions
- [API Reference](docs/api-reference.md) - REST API documentation
- [Architecture](ARCHITECTURE.md) - System design
- [Security](SECURITY.md) - Security policy
- [Contributing](CONTRIBUTING.md) - How to contribute
- [User Management](docs/USER_MANAGEMENT_PLAN.md) - Multi-developer account system
- [Dotenv Server](docs/DOTENV_SERVER.md) - Use SEM as a remote config server for your backends

---

## 🔧 Configuration

### Environment Variables

```env
# Required
FLASK_SECRET_KEY=<32-byte-secret>
ENCRYPTION_KEY=<fernet-key>
DASHBOARD_PASSWORD=<admin-dashboard-password>
MASTER_API_TOKEN=<master-api-token>

# Generate keys:
#   ENCRYPTION_KEY:  python scripts/generate_keys.py
#   FLASK_SECRET_KEY: python -c "import secrets; print(secrets.token_hex(32))"
#   MASTER_API_TOKEN: python -c "import secrets; print(secrets.token_hex(32))"

# Optional - Admin Identity
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com

# Optional - User Management (SMTP)
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@example.com
EMAIL_SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@your-domain.com

# Optional - Session
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
CORS_ORIGINS_MOBILE=app://flutter.app,capacitor://localhost
```

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under **MIT License**. See `LICENSE` for more information.

---

## 💖 Sponsor & Support

If this project helps you or your team, consider sponsoring to keep it growing:

- ⭐ **Star the repo** — it helps others discover the project
- 💰 **Sponsor on GitHub** — [github.com/sponsors/niranjansah87](https://github.com/sponsors/niranjansah87)
- 🐛 **Report bugs & request features** — open an [issue](https://github.com/niranjansah87/Secure-Environment-Manager/issues)
- 🔧 **Contribute** — PRs are welcome! See [Contributing](#-contributing)

### 📬 Contact & Help

Have questions, need help integrating, or want to discuss your use case?

| Channel | Link |
|---------|------|
| 📧 **Email** | [niranjansah250@gmail.com](mailto:niranjansah250@gmail.com) |
| 💬 **WhatsApp** | Message me on WhatsApp for quick help |
| 🔗 **LinkedIn** | Connect for professional inquiries & collaboration |

> **Open source, built with ❤️.** Your sponsorship keeps this project maintained, secure, and evolving.

---

<p align="center">
  <b>Built for developers who care about security.</b><br>
  ⭐️ If this project helped you, give it a star on GitHub!
</p>
