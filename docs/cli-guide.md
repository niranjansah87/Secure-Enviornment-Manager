# CLI Guide

The **Secure Environment Manager CLI (`dotenv-cli.py`)** is a powerful command-line interface for developers and DevOps engineers to manage secrets without leaving the terminal.

## Installation

The CLI is a standalone Python script located in the `scripts/` directory.

### Prerequisites
-   Python 3.10+
-   `requests` library installed (`pip install requests`)

### Quick Setup (Alias)
For easier access, add an alias to your `.bashrc` or `.zshrc`:
```bash
alias sem="python3 /path/to/Secure-Enviornment-Manager/scripts/dotenv-cli.py"
```

## Global Options

| Option | Description |
| :--- | :--- |
| `--url` | The URL of your SEM server (Default: `http://localhost:8070`) |
| `-n, --namespace` | The target namespace (Required) |
| `-e, --environment` | The target environment (Required) |

## Commands

### 📋 List Variables
List all secrets currently stored in an environment.
```bash
sem -n project-alpha -e production list
```

### 🔍 Get a Single Secret
Retrieve the value of a specific secret.
```bash
sem -n project-alpha -e production get DATABASE_URL
```

### ✏️ Set a Secret
Create or update a secret value.
```bash
sem -n project-alpha -e production set API_KEY "sk_test_12345"
```

### 🗑️ Delete a Secret
Remove a secret from the environment.
```bash
sem -n project-alpha -e production delete OLD_API_KEY
```

### 📤 Export Secrets
Download secrets in your preferred format.
```bash
# Export to .env (Default)
sem -n project-alpha -e production export --format env -o .env

# Export to JSON
sem -n project-alpha -e production export --format json
```

### 📥 Import Secrets
Bulk upload secrets from an existing `.env` file.
```bash
sem -n project-alpha -e production import .env.staging
```

## Integrating with CI/CD

The CLI is designed for automation. You can bypass the interactive password prompt by using the `API_TOKEN` environment variable:

### example: GitHub Actions
```yaml
steps:
  - name: Fetch Secrets
    run: |
      pip install requests
      python scripts/dotenv-cli.py -n project-alpha -e prod export --format env -o .env
    env:
      API_TOKEN: ${{ secrets.SEM_TOKEN }}
      SEM_URL: https://secrets.acme.com
```

## Troubleshooting the CLI

| Issue | Solution |
| :--- | :--- |
| **Authentication Failed** | Verify your password or API token. Check if the token has access to the namespace. |
| **Connection Refused** | Verify the `--url` points to a running SEM server and is reachable. |
| **Decryption Error** | The server `ENCRYPTION_KEY` has changed or is invalid for this data. |

---

Next: [Security Documentation](security.md)
