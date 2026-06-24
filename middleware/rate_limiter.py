"""
Brute-force login protection for Secure Environment Manager.

Only tracks actual failed login attempts — expired/invalid tokens on API routes
are handled by the auth layer and are NOT counted here.
"""
import time
from threading import Lock
from typing import Dict, Tuple

from flask import request


def get_client_ip() -> str:
    """Get client IP address considering proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


# ------------------------------------------------------------------ #
#  Brute-force login tracking (keep — critical security)
# ------------------------------------------------------------------ #

LOGIN_FAILURES: Dict[str, Tuple[int, float]] = {}  # IP -> (count, first_failure_time)
_FAILURE_LOCK = Lock()
MAX_LOGIN_FAILURES = 5
LOCKOUT_DURATION = 900  # 15 minutes


def track_failed_login() -> bool:
    """Track failed login attempt. Returns True if now locked out."""
    ip = get_client_ip()
    now = time.time()

    with _FAILURE_LOCK:
        count, first_time = LOGIN_FAILURES.get(ip, (0, now))

        # Reset if lockout period expired
        if first_time and (now - first_time) > LOCKOUT_DURATION:
            count = 0
            first_time = now

        count += 1
        LOGIN_FAILURES[ip] = (count, first_time)

        return count >= MAX_LOGIN_FAILURES


def get_login_failure_count() -> int:
    """Get current failure count for client IP."""
    ip = get_client_ip()
    with _FAILURE_LOCK:
        count, first_time = LOGIN_FAILURES.get(ip, (0, 0))
        if first_time and (time.time() - first_time) > LOCKOUT_DURATION:
            return 0
        return count


def is_ip_locked() -> bool:
    """Check if client IP is currently locked out."""
    return get_login_failure_count() >= MAX_LOGIN_FAILURES


def reset_login_failures() -> None:
    """Reset failure tracking for client IP (called on successful login)."""
    ip = get_client_ip()
    with _FAILURE_LOCK:
        LOGIN_FAILURES.pop(ip, None)
