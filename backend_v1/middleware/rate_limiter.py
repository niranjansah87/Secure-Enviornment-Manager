"""
Rate limiting and abuse protection for Secure Environment Manager.
"""
import time
from collections import defaultdict
from threading import Lock
from typing import Dict, Tuple, Optional

from flask import request


class RateLimiter:
    """Token bucket rate limiter with IP-based tracking."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)
        self.lock = Lock()

    def _get_client_key(self) -> str:
        """Get client identifier for rate limiting."""
        # Use X-Forwarded-For if behind proxy, otherwise remote_addr
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            # Take first IP in chain (original client)
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.remote_addr or "unknown"
        return f"{client_ip}:{request.endpoint or 'unknown'}"

    def is_allowed(self) -> Tuple[bool, Dict]:
        """Check if request is allowed under rate limit.

        Returns:
            Tuple of (is_allowed, info_dict)
        """
        key = self._get_client_key()
        now = time.time()
        window_start = now - self.window_seconds

        with self.lock:
            # Clean old requests outside window
            self.requests[key] = [
                ts for ts in self.requests[key] if ts > window_start
            ]

            # Check if under limit
            if len(self.requests[key]) < self.max_requests:
                self.requests[key].append(now)
                current_len = len(self.requests[key])
                return True, {
                    "limit": self.max_requests,
                    "remaining": max(0, self.max_requests - current_len),
                    "reset": int(now + self.window_seconds),
                }
            else:
                oldest = min(self.requests[key])
                reset_time = int(oldest + self.window_seconds)
                return False, {
                    "limit": self.max_requests,
                    "remaining": 0,
                    "reset": reset_time,
                    "retry_after": reset_time - int(now),
                }

    def reset(self, client_ip: Optional[str] = None) -> None:
        """Reset rate limit for a specific IP or all IPs."""
        with self.lock:
            if client_ip:
                # Reset specific IP across all endpoints
                keys_to_remove = [k for k in self.requests if k.startswith(client_ip)]
                for k in keys_to_remove:
                    del self.requests[k]
            else:
                self.requests.clear()


# Global rate limiters for different operations
_login_limiter = RateLimiter(max_requests=10, window_seconds=60)  # 10 logins per minute
_step_up_limiter = RateLimiter(max_requests=5, window_seconds=300)  # 5 step-ups per 5 minutes
_export_limiter = RateLimiter(max_requests=20, window_seconds=60)  # 20 exports per minute
_api_limiter = RateLimiter(max_requests=100, window_seconds=60)  # 100 API calls per minute


def check_login_rate_limit() -> Tuple[bool, Dict]:
    """Check login rate limit. Returns (allowed, info)."""
    return _login_limiter.is_allowed()


def check_step_up_rate_limit() -> Tuple[bool, Dict]:
    """Check step-up auth rate limit. Returns (allowed, info)."""
    return _step_up_limiter.is_allowed()


def check_export_rate_limit() -> Tuple[bool, Dict]:
    """Check export rate limit. Returns (allowed, info)."""
    return _export_limiter.is_allowed()


def check_api_rate_limit() -> Tuple[bool, Dict]:
    """Check general API rate limit. Returns (allowed, info)."""
    return _api_limiter.is_allowed()


def get_client_ip() -> str:
    """Get client IP address considering proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


# Brute force login tracking
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