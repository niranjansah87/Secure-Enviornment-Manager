"""
Constants patch for Secure Environment Manager.

This module provides runtime-derived values that depend on settings.
Prometheus counters are defined in app.py to avoid registration conflicts.

Import helpers from core.constants instead.
"""
import os
from werkzeug.security import generate_password_hash


# Lazily computed dashboard password hash (hashed once on first access)
_dashboard_password_hash: str | None = None


def get_dashboard_password_hash() -> str:
    """Get the hashed dashboard password, computing it on first call."""
    global _dashboard_password_hash
    if _dashboard_password_hash is None:
        _dashboard_password_hash = generate_password_hash(
            os.getenv("DASHBOARD_PASSWORD", "")
        )
    return _dashboard_password_hash