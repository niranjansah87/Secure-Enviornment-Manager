# 🌐 Dotenv Server — Remote Configuration Management

SEM doubles as a **centralized dotenv server** that lets your other backends fetch their
environment variables at startup. Instead of scattering `.env` files across every project
and machine, you store secrets once in SEM and every service pulls them securely at boot.

---

## 🎯 How It Works

```
┌──────────────────────────────┐       HTTPS + Bearer Token         ┌──────────────────────┐
│  Your Backend (consumer)     │ ──── GET /api/v1/ns/env ────────→  │   SEM (dotenv server) │
│                              │ ←─── JSON {KEY: value, ...} ─────  │                      │
│  DOTENV_SERVER_URL=...       │                                    │  Encrypted at rest    │
│  DOTENV_SERVER_KEY=...       │                                    │  Audit logged         │
└──────────────────────────────┘                                    └──────────────────────┘
```

1. You store secrets in SEM under a namespace/environment (e.g., `production/main`)
2. **The `DOTENV_SERVER_KEY` is the Fernet encryption key** — the same key SEM uses for `ENCRYPTION_KEY` and `MASTER_API_TOKEN`
3. In your backend's `.env`, you set `DOTENV_SERVER_URL` and `DOTENV_SERVER_KEY` (the Fernet key)
4. Your backend calls SEM at startup, SEM validates the Bearer token (which checks `MASTER_API_TOKEN`, set to the same Fernet key), and returns all secrets as JSON
5. Those secrets are merged into your app config — **remote values always win** over local `.env` values

---

## 🚀 Quick Start

### Step 1: Deploy SEM (the dotenv server)

First, get SEM running on a server. See [Deployment Guide](deployment.md) for full details.

**Quick deploy with Docker Compose:**

```bash
# Clone and enter the repo
git clone https://github.com/niranjansah87/Secure-Environment-Manager.git
cd Secure-Environment-Manager

# Generate ONE Fernet key — this is your server key for everything
python scripts/generate_keys.py
# Output: ENCRYPTION_KEY='d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg='

# Generate Flask secret key (separate, for session signing)
python -c "import secrets; print('FLASK_SECRET_KEY=' + secrets.token_hex(32))"

# Create .env — same Fernet key for both ENCRYPTION_KEY and MASTER_API_TOKEN
cat > .env << 'EOF'
FLASK_SECRET_KEY=<generated-above>
ENCRYPTION_KEY=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
MASTER_API_TOKEN=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
DASHBOARD_PASSWORD=your-admin-dashboard-password
EOF

# Start the server
docker-compose up -d

# Or manually:
pip install -r requirements.txt
python app.py  # runs on port 8070
```

### Step 2: Store Secrets in SEM

Open the SEM dashboard (`https://your-sem-domain.com`), log in, navigate to your
namespace (e.g., `myapp`) and environment (e.g., `production`), and add your secrets:

```
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET_KEY=super-secret-jwt-key
```

### Step 3: Configure Your Backend's `.env`

In your backend project, add these two lines to `.env`:

```env
DOTENV_SERVER_URL=https://dotenv.your-domain.com/api/v1/myapp/production
DOTENV_SERVER_KEY=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
```

> **IMPORTANT:** `DOTENV_SERVER_KEY` = the SAME Fernet key generated in Step 1.
> It's identical to SEM's `ENCRYPTION_KEY` and `MASTER_API_TOKEN` — one key, three roles.
> These two lines are the ONLY things your backend needs in `.env`.

### Step 4: Add the Config Loader to Your Backend

Copy this pattern into your backend's `config.py` (or equivalent):

```python
# config.py — Remote dotenv server integration
import os
import httpx
import json
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional


def fetch_remote_config(url: str, api_key: str) -> dict:
    """Fetch configuration from your SEM dotenv server at startup."""
    if not all([url, api_key]):
        raise ValueError(
            "DOTENV_SERVER_URL and DOTENV_SERVER_KEY must be set in the environment."
        )

    headers = {"Authorization": f"Bearer {api_key}"}
    print(f"--> [Config] Fetching remote configuration from: {url}")

    try:
        response = httpx.get(url, headers=headers, timeout=10.0)
        response.raise_for_status()
        remote_data = response.json()
        print("--> [Config] Remote configuration fetched successfully.")
        return remote_data
    except httpx.RequestError as e:
        raise RuntimeError(
            f"FATAL: Could not fetch remote configuration. Network error: {e}"
        ) from e
    except httpx.HTTPStatusError as e:
        raise RuntimeError(
            f"FATAL: Could not fetch remote configuration. Status code: {e.response.status_code}"
        ) from e


class BootstrapSettings(BaseSettings):
    """Loads ONLY the variables needed to connect to the remote dotenv server."""
    DOTENV_SERVER_URL: Optional[str] = None
    DOTENV_SERVER_KEY: Optional[str] = None
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


class Settings(BaseSettings):
    """
    Your application settings.
    Remote dotenv server values take priority over local .env values.
    """

    # Connection to dotenv server
    DOTENV_SERVER_URL: Optional[str] = None
    DOTENV_SERVER_KEY: Optional[str] = None

    # App settings — these will be filled from SEM (or local .env as fallback)
    app_name: Optional[str] = None
    debug: Optional[bool] = None
    secret_key: Optional[str] = None
    jwt_secret_key: Optional[str] = None
    database_url: Optional[str] = None
    redis_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    # ... add all your app's config fields here

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=False, extra="ignore"
    )


def get_settings() -> Settings:
    """Initialize settings: remote dotenv server wins, local .env fills gaps."""
    print("--> [Config] Initializing settings...")
    bootstrap = BootstrapSettings()

    remote_config = {}
    if bootstrap.DOTENV_SERVER_URL and bootstrap.DOTENV_SERVER_KEY:
        try:
            remote_config = fetch_remote_config(
                url=bootstrap.DOTENV_SERVER_URL,
                api_key=bootstrap.DOTENV_SERVER_KEY,
            )
        except (ValueError, RuntimeError) as e:
            print(f"--> [Config] WARNING: Could not fetch remote config: {e}")

    # Priority: remote dotenv server > OS env > .env file
    combined = {**bootstrap.model_dump(), **remote_config}

    # Allow OS env to override connection details (hosts vary per deployment)
    connection_keys = ["redis_url", "redis_host", "redis_port",
                       "database_url", "db_host", "db_port"]
    for key in connection_keys:
        if not combined.get(key):
            env_val = os.environ.get(key.upper()) or os.environ.get(key)
            if env_val is not None:
                combined[key] = env_val

    return Settings(**combined)


settings = get_settings()
```

---

## 🔑 Key Generation

### For SEM (the dotenv server)

Generate ONE Fernet key — it serves all three roles:

| Key | How to Generate | Purpose |
|-----|----------------|---------|
| `ENCRYPTION_KEY` | `python scripts/generate_keys.py` | Fernet key — encrypts/decrypts secrets at rest |
| `MASTER_API_TOKEN` | **Same Fernet key as above** | Authenticates API Bearer tokens |
| `FLASK_SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` | Flask session signing (separate, random hex) |
| `DASHBOARD_PASSWORD` | Choose a strong password | Web dashboard login |

**One Fernet key, three roles:**

```env
# SEM .env
ENCRYPTION_KEY=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
MASTER_API_TOKEN=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
```

### For Your Consumer Backend

Only two values needed in `.env`:

```env
DOTENV_SERVER_URL=https://<sem-host>/api/v1/<namespace>/<environment>
DOTENV_SERVER_KEY=d2VkZGluZyBjb2RlIGlzIGxpa2UgcG9ldHJ5Cg=
```

The `DOTENV_SERVER_KEY` is the **exact same Fernet key** — identical to SEM's `ENCRYPTION_KEY` and `MASTER_API_TOKEN`.

---

## 🔐 How Auth Works (Under the Hood)

When your backend calls `GET /api/v1/myapp/production` with `Authorization: Bearer <DOTENV_SERVER_KEY>`, SEM's `api_auth_ok()` function checks the token in this order:

1. **`MASTER_API_TOKEN`** ← Your Fernet key matches this (it's the same value) → **full access granted**
2. `DASHBOARD_PASSWORD` hash
3. JWT token (user login)
4. Namespace-scoped API key (dashboard-generated)

Since the Fernet key is also set as `MASTER_API_TOKEN`, it gets unrestricted access to all namespaces and environments. The consumer backend is a trusted service, not an end-user.

> **Security note:** This key has full god-mode access. Guard it carefully.
> Only use it for server-to-server communication. For end-user or CI/CD access,
> create scoped API keys via the SEM dashboard instead.

---

## 📋 What Goes Where

### What to keep in `.env` (per deployment)

These two values — nothing else:

```env
DOTENV_SERVER_URL=https://dotenv.your-domain.com/api/v1/<namespace>/<environment>
DOTENV_SERVER_KEY=<the-fernet-key>
```

> **Why only these two?** Everything else (API keys, DB URLs, secrets) lives in SEM.
> When you rotate a secret, you update it in SEM once — every service picks it up on restart.
> No more SSH-ing into servers to edit `.env` files.

### What to store in SEM (the dotenv server)

Everything else — all secrets, API keys, and non-connection config:

```env
# In SEM, namespace=myapp, environment=production:
DATABASE_URL=postgres://user:pass@prod-host:5432/db
REDIS_URL=redis://prod-redis:6379/0
SECRET_KEY=<random-64-char-string>
JWT_SECRET_KEY=<another-random-string>
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENTRY_DSN=https://...@sentry.io/...
RESEND_API_KEY=re_...
# ... and any other secrets your app needs
```

### Per-deployment overrides (OS env, NOT in SEM)

Connection details that change per machine/deployment can be set as OS environment
variables **on that specific host**. These fill gaps when SEM didn't provide a value:

```bash
# Example: your local dev machine points to local Redis, but prod uses SEM's value
export REDIS_URL=redis://localhost:6379/0

# Example: staging uses a different DB host
export DB_HOST=staging-db.internal
```

> **Rule of thumb:** Secrets go in SEM. Infrastructure addresses go in OS env (or local `.env` fallback).

---

## 🚢 Deploying the Dotenv Server

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repo on your server
git clone https://github.com/niranjansah87/Secure-Environment-Manager.git
cd Secure-Environment-Manager

# 2. Generate keys
python scripts/generate_keys.py
# Copy the ENCRYPTION_KEY output

python -c "import secrets; print('MASTER_API_TOKEN=' + secrets.token_hex(32))"
# Copy the MASTER_API_TOKEN output — this is your DOTENV_SERVER_KEY

python -c "import secrets; print('FLASK_SECRET_KEY=' + secrets.token_hex(32))"
# Copy the FLASK_SECRET_KEY output

# 3. Create .env
cat > .env << 'EOF'
FLASK_SECRET_KEY=<generated-flask-secret-key>
ENCRYPTION_KEY=<generated-fernet-key>
DASHBOARD_PASSWORD=<choose-a-strong-password>
MASTER_API_TOKEN=<generated-master-api-token>
SESSION_COOKIE_SECURE=true
BEHIND_PROXY=true
CORS_ORIGINS=https://your-domain.com,https://dotenv.your-domain.com
EOF

# 4. Start services
docker-compose up -d

# 5. Verify
curl http://localhost:8070/healthz
# → {"status": "healthy"}

# 6. Test remote fetch from another machine
curl -H "Authorization: Bearer <MASTER_API_TOKEN>" \
  https://your-domain.com/api/v1/global/main
# → {"KEY1": "value1", ...}
```

### Option 2: Manual Deployment (systemd)

```bash
# 1. Clone and setup as above (Steps 1-3)

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and enable the systemd service
sudo cp dotenv.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dotenv
sudo systemctl start dotenv

# 4. Configure Nginx reverse proxy
sudo cp nginx/dotenv_soundchan_ai.conf /etc/nginx/sites-available/dotenv.conf
# Edit the config with your domain
sudo nano /etc/nginx/sites-available/dotenv.conf
sudo ln -s /etc/nginx/sites-available/dotenv.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. Setup SSL with Certbot
sudo certbot --nginx -d dotenv.your-domain.com

# 6. Verify
curl https://dotenv.your-domain.com/healthz
```

### Option 3: Behind Caddy (simpler reverse proxy)

```caddy
dotenv.your-domain.com {
    reverse_proxy 127.0.0.1:8070
}
```

---

## 🔗 URL Format

The `DOTENV_SERVER_URL` follows this pattern:

```
https://<sem-host>/api/v1/<namespace>/<environment>
```

| Part | Description | Example |
|------|-------------|---------|
| `<sem-host>` | Your SEM instance domain | `dotenv.soundchan.ai` |
| `<namespace>` | The namespace in SEM | `myapp`, `kumari`, `production` |
| `<environment>` | The environment in SEM | `main`, `dev`, `staging` |

### Examples

```env
# Production app
DOTENV_SERVER_URL=https://dotenv.soundchan.ai/api/v1/production/main

# Staging app
DOTENV_SERVER_URL=https://dotenv.soundchan.ai/api/v1/staging/dev

# Local development (SEM running locally)
DOTENV_SERVER_URL=http://localhost:8070/api/v1/myapp/development
```

---

## 🔄 Startup Flow

```
App starts
    │
    ▼
┌─────────────────────────────────────┐
│ 1. BootstrapSettings loads          │
│    DOTENV_SERVER_URL + KEY from .env│
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 2. fetch_remote_config()            │
│    GET {URL}                        │
│    Authorization: Bearer {KEY}     │
│    → SEM checks MASTER_API_TOKEN    │
│    → Match → Returns JSON secrets   │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 3. Merge config                     │
│    Remote secrets (priority 1)      │
│    OS env vars (priority 2)         │
│    .env file vars (priority 3)      │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 4. Settings object is ready         │
│    App starts with full config      │
└─────────────────────────────────────┘
```

---

## 🔐 Security Considerations

### Master API Token
- The `MASTER_API_TOKEN` has **full access** to all namespaces and environments
- **Never** expose it in client-side code, git repos, or logs
- Rotate it periodically by updating SEM's `.env` and all consumer `.env` files
- Use a strong random value: `python -c "import secrets; print(secrets.token_hex(32))"`

### For Less-Privileged Access
If you don't want to give a consumer full master access, create a **scoped API key**
via the SEM dashboard and use that as `DOTENV_SERVER_KEY` instead:

```env
# Instead of the MASTER_API_TOKEN, use a scoped API key:
DOTENV_SERVER_KEY=sem_a1b2c3d4e5f6...  # API key scoped to only "myapp" namespace
```

### Network Security
- Always use **HTTPS** for `DOTENV_SERVER_URL` in production
- SEM should be behind a reverse proxy (Nginx/Caddy) with TLS
- Consider **firewall rules** to restrict which IPs can reach SEM

### Local Development
- For local dev, run SEM locally via Docker Compose and use `http://localhost:8070`
- Never commit real `DOTENV_SERVER_KEY` values to git — use `.env` (gitignored)
- Each developer can point to their own local SEM instance

### Secret Rotation
1. Update the secret in SEM's dashboard (or via API)
2. Restart your backend services — they fetch fresh config on startup
3. No need to touch individual servers or `.env` files

---

## 🐍 Python Integration (Reference Implementation)

The config loader code shown in Step 4 above uses:

| Library | Purpose |
|---------|---------|
| `pydantic-settings` | Settings management with `.env` loading |
| `httpx` | HTTP client for fetching remote config |
| `python-dotenv` | `.env` file parsing |

### Minimal Example (no Pydantic)

```python
import os
import requests

# Load from .env (or set these as OS env vars)
SEM_URL = os.getenv("DOTENV_SERVER_URL")
SEM_KEY = os.getenv("DOTENV_SERVER_KEY")

if SEM_URL and SEM_KEY:
    resp = requests.get(
        SEM_URL,
        headers={"Authorization": f"Bearer {SEM_KEY}"},
        timeout=10
    )
    resp.raise_for_status()
    config = resp.json()  # {"DATABASE_URL": "...", "SECRET_KEY": "...", ...}
    # Merge into os.environ or your app config
    for key, value in config.items():
        os.environ.setdefault(key, value)
```

---

## 🟢 Node.js / TypeScript Integration

```typescript
// config.ts
interface RemoteConfig {
  [key: string]: string;
}

async function fetchRemoteConfig(url: string, apiKey: string): Promise<RemoteConfig> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch remote config: ${response.status}`);
  }

  return response.json();
}

// Usage at startup
const SEM_URL = process.env.DOTENV_SERVER_URL;
const SEM_KEY = process.env.DOTENV_SERVER_KEY;

if (SEM_URL && SEM_KEY) {
  const remoteConfig = await fetchRemoteConfig(SEM_URL, SEM_KEY);
  // Merge into process.env (remote wins)
  for (const [key, value] of Object.entries(remoteConfig)) {
    process.env[key] = value;
  }
}
```

---

## 🐳 Docker / docker-compose

```yaml
# docker-compose.yml
services:
  app:
    image: your-app:latest
    environment:
      - DOTENV_SERVER_URL=https://dotenv.soundchan.ai/api/v1/myapp/production
      - DOTENV_SERVER_KEY=${DOTENV_SERVER_KEY}  # Pass from host .env or secrets manager
    # No other secrets needed — they come from SEM at startup
```

---

## 📊 Environment Strategy

A typical multi-environment setup:

```
SEM Namespace/Environment      DOTENV_SERVER_URL (in consumer .env)
────────────────────────────────────────────────────────────────────
myapp/production          →    https://dotenv.company.com/api/v1/myapp/production
myapp/staging             →    https://dotenv.company.com/api/v1/myapp/staging
myapp/development         →    http://localhost:8070/api/v1/myapp/development
```

Each environment has its own secrets in SEM. The consumer's `.env` only changes the URL
to point at the right environment — the secrets themselves live in SEM.

---

## ❓ FAQ

**Q: What if SEM is down when my app starts?**
A: By default, the app will log a warning and proceed with local `.env` values as fallback.
   You can change this behavior to hard-fail if you prefer (remove the try/except in `get_settings()`).

**Q: Can I cache the remote config?**
A: Yes. Some teams write the fetched config to a local file and use it as a cache.
   On the next start, they try SEM first, and fall back to the cached file if SEM is unreachable.

**Q: Does this work with Kubernetes?**
A: Yes. Set `DOTENV_SERVER_URL` and `DOTENV_SERVER_KEY` as Kubernetes Secrets
   and inject them as environment variables into your pods.

**Q: What format does the SEM API return?**
A: A flat JSON object: `{"KEY1": "value1", "KEY2": "value2", ...}`.
   This maps directly to environment variables.

**Q: Is `DOTENV_SERVER_KEY` the same as an API key from the dashboard?**
A: No. It's the **Fernet encryption key** — the same key SEM uses for `ENCRYPTION_KEY` and `MASTER_API_TOKEN`.
   Dashboard API keys are scoped to specific namespaces and intended for CI/CD or limited access.
   You CAN use a dashboard API key if you want to limit the consumer to specific namespaces.

**Q: How is this different from HashiCorp Vault / AWS Secrets Manager?**
A: SEM is simpler and self-hosted. No additional infrastructure (consul, raft, etc.).
   Encrypted JSON files on disk. Ideal for teams that want secrets management without
   the operational complexity of Vault.

---

## 💖 Sponsor & Support

If this project helps you or your team, consider sponsoring to keep it maintained and growing:

- ⭐ **Star the repo** — [github.com/niranjansah87/Secure-Environment-Manager](https://github.com/niranjansah87/Secure-Environment-Manager)
- 💰 **Sponsor on GitHub** — [github.com/sponsors/niranjansah87](https://github.com/sponsors/niranjansah87)
- 🐛 **Report bugs** — [open an issue](https://github.com/niranjansah87/Secure-Environment-Manager/issues)

### 📬 Questions? Need Help?

| Channel | Contact |
|---------|---------|
| 📧 **Email** | [niranjansah250@gmail.com](mailto:niranjansah250@gmail.com) |
| 💬 **WhatsApp** | Message for quick help & setup guidance |
| 🔗 **LinkedIn** | Connect for professional inquiries & collaboration |

> **Open source, built with ❤️.** Your sponsorship keeps this project maintained, secure, and evolving.

---

## 📚 Related Docs

- [API Reference](api-reference.md) — Full REST API documentation
- [Deployment Guide](deployment.md) — How to deploy SEM
- [Setup Guide](SETUP.md) — Initial setup instructions
- [CLI Guide](cli-guide.md) — Command-line tools
- [Security](security.md) — Security architecture
