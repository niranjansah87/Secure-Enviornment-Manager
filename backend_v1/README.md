# Legacy Backend (v1 — Python/Flask)

This directory contains the historical Python/Flask backend for Secure Environment Manager.

## Purpose

- Preserved for historical and migration reference (e.g. `tools/migrate/` data migration from Fernet-encrypted JSON files).
- The active, production-ready backend is located in `backend/` (NestJS + Fastify + PostgreSQL + Drizzle ORM).

## Components Preserved

- `app.py`: Flask entry point and core routing
- `core/`: Authentication, JWT, sessions, exceptions, and configuration
- `routes/`: Blueprint endpoints (auth, API, users, etc.)
- `services/`: Business services (API keys, users, analytics, health, email)
- `storage/`: Fernet encryption, file storage, and atomic writes
- `audit_logger.py`: Append-only audit logger
- `history_manager.py`: Snapshot and rollback manager
- `tests/`: Original Python test suite
- `requirements.txt`: Python package dependencies

