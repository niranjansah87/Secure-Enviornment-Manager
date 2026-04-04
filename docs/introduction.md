# Introduction

Welcome to the **Secure Environment Manager (SEM)** documentation. SEM is a production-grade, self-hosted solution for managing application secrets and environment variables with a focus on security, transparency, and developer experience.

## The Problem
Modern applications rely on dozens of environment variables—from API keys to database credentials. Managing these across team members often leads to:
*   **Security Risks**: Sharing `.env` files over chat or email.
*   **Inconsistency**: "It works on my machine" bugs due to outdated local configs.
*   **Lack of Audit**: No visibility into who changed a secret or when.
*   **No Versioning**: Accidental deletions or overwrites are hard to recover from.

## The Solution
SEM provides a centralized, encrypted, and version-controlled platform to store and manage your environment variables. It bridges the gap between manual `.env` file management and complex enterprise solutions like HashiCorp Vault.

## Key Features

### 🔐 Zero-Knowledge Encryption
All secrets are encrypted at rest using **AES-256 (Fernet)**. The server never stores secrets in plain text, and only authorized users with the master encryption key can access the data.

### 📜 Version History & Rollback
Every change is captured as a snapshot. Accidentally deleted a critical API key? Use the **History** tab to compare versions and rollback to a previous state instantly.

### 🕵️ Full Audit Traceability
Every action—from a single variable update to a bulk export—is logged with the user's identity, IP address, and timestamp. Compliance and debugging have never been easier.

### 🚀 Developer-First Workflow
*   **Web Dashboard**: A beautiful, modern interface for easy management.
*   **CLI Tool**: Integration for terminal power users and CI/CD pipelines.
*   **Multi-Format Export**: Download secrets as `.env`, `JSON`, or `YAML`.
*   **Templates**: Bootstrap new environments using pre-defined patterns for Docker, Node.js, Python, and more.

## Who is it for?
SEM is designed for:
*   **Development Teams**: Who need a shared, secure "source of truth" for secrets.
*   **DevOps Engineers**: Automating environment setup and ensuring security compliance.
*   **Individual Developers**: Who want a professional way to manage their local and staging credentials.

---

Next: [Installation Guide](installation.md)
