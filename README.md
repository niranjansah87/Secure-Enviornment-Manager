<div align="center">

<img src="frontend/public/logo.png" alt="Secure Environment Manager Logo" width="200" height="auto">

# 🔐 Secure Environment Manager

**The professional, open-source vault for your environment variables. Fully encrypted, audit-ready, and developer-obsessed.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/network)
[![Issues](https://img.shields.io/github/issues/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/issues)
[![Last Commit](https://img.shields.io/github/last-commit/niranjansah87/Secure-Environment-Manager?style=flat-square)](https://github.com/niranjansah87/Secure-Environment-Manager/commits/main)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [SDK & CLI](#-sdk--cli) • [Deployment](#-deployment)

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
# Edit .env with your keys

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

| Component | Technology |
|-----------|------------|
| Backend | Flask + Gunicorn (Python 3.11) |
| Frontend | Next.js 14 + TypeScript + Tailwind |
| Mobile | Flutter (iOS/Android) |
| Database | Encrypted JSON files |
| Proxy | Nginx (host-installed) |
| Monitoring | Prometheus + Grafana |
| Containers | Docker Compose |

---

## 📚 Documentation

- [Deployment Guide](docs/deployment.md) - Full deployment instructions
- [API Reference](docs/api-reference.md) - REST API documentation
- [Architecture](ARCHITECTURE.md) - System design
- [Security](SECURITY.md) - Security policy
- [Contributing](CONTRIBUTING.md) - How to contribute

---

## 🔧 Configuration

### Environment Variables

```env
# Required
FLASK_SECRET_KEY=<32-byte-secret>
ENCRYPTION_KEY=<fernet-key>
DASHBOARD_PASSWORD=<password>

# Optional
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

<p align="center">
  <b>Built for developers who care about security.</b><br>
  ⭐️ If this project helped you, give it a star on GitHub!
</p>