"""
Constants patch for Secure Environment Manager.

This module provides runtime-derived values that depend on settings.
Prometheus counters are defined in app.py to avoid registration conflicts.

Import helpers from core.constants instead.
"""
import os
import threading
from werkzeug.security import generate_password_hash


# Lazily computed dashboard password hash (hashed once on first access)
_dashboard_password_hash: str | None = None
_dashboard_password_hash_lock = threading.Lock()


def get_dashboard_password_hash() -> str:
    """Get the hashed dashboard password, computing it on first call."""
    global _dashboard_password_hash
    if _dashboard_password_hash is None:
        with _dashboard_password_hash_lock:
            # Double-check after acquiring lock
            if _dashboard_password_hash is None:
                pwd = os.getenv("DASHBOARD_PASSWORD", "")
                if not pwd:
                    raise RuntimeError(
                        "DASHBOARD_PASSWORD environment variable is not set. "
                        "Please configure a secure dashboard password."
                    )
                _dashboard_password_hash = generate_password_hash(pwd)
    return _dashboard_password_hash