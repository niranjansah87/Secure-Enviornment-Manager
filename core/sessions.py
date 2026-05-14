"""
Session management for Secure Environment Manager.
Extracted from app.py for modular architecture.
"""
import secrets
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any, Dict, Optional

from flask import request

from audit_logger import audit_logger
from core.config import settings, logger
from core.constants import SESSION_MAX_LIFETIME, STEP_UP_AUTH_WINDOW


# --- Server-side Session Registry ---
_ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}
_SESSION_REGISTRY_LOCK = Lock()


def _generate_session_id() -> str:
    """Generate a unique session ID for tracking."""
    return secrets.token_urlsafe(32)


def _tz_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


def _register_session(namespace: str, environment: str) -> str:
    """Register a new session and return its ID."""
    session_id = _generate_session_id()
    with _SESSION_REGISTRY_LOCK:
        _ACTIVE_SESSIONS[session_id] = {
            "namespace": namespace,
            "environment": environment,
            "created": _tz_now().isoformat(),
            "last_active": _tz_now().isoformat(),
            "ip": request.remote_addr or "unknown",
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "step_up_auth": None,
        }
    audit_logger.log_session_created(
        namespace, environment, session_id, request.remote_addr or "unknown",
        request.headers.get("User-Agent", "unknown")
    )
    return session_id


def _update_session_activity(session_id: str) -> None:
    """Update last_active timestamp for a session."""
    with _SESSION_REGISTRY_LOCK:
        if session_id in _ACTIVE_SESSIONS:
            _ACTIVE_SESSIONS[session_id]["last_active"] = _tz_now().isoformat()


def _invalidate_session(session_id: str) -> None:
    """Invalidate a specific session."""
    with _SESSION_REGISTRY_LOCK:
        if session_id in _ACTIVE_SESSIONS:
            info = _ACTIVE_SESSIONS.pop(session_id)
            audit_logger.log_session_revoked(
                info["namespace"], info["environment"],
                session_id, request.remote_addr or "unknown"
            )


def _invalidate_all_sessions() -> int:
    """Invalidate all sessions. Returns count of invalidated sessions."""
    with _SESSION_REGISTRY_LOCK:
        count = len(_ACTIVE_SESSIONS)
        _ACTIVE_SESSIONS.clear()
    audit_logger.log_event(
        "ALL_SESSIONS_REVOKED", "system", "global", "system", "global",
        request.remote_addr or "unknown", {"count": count}
    )
    return count


def _is_session_valid(session_id: str) -> bool:
    """Check if a session is still valid (not expired by absolute lifetime)."""
    with _SESSION_REGISTRY_LOCK:
        info = _ACTIVE_SESSIONS.get(session_id)
        if not info:
            return False
        try:
            created = datetime.fromisoformat(info["created"])
            if _tz_now() - created > SESSION_MAX_LIFETIME:
                _ACTIVE_SESSIONS.pop(session_id, None)
                return False
            return True
        except (ValueError, KeyError):
            return False


def _check_step_up_auth(session_id: str) -> bool:
    """Check if session has valid step-up authentication for sensitive operations."""
    with _SESSION_REGISTRY_LOCK:
        info = _ACTIVE_SESSIONS.get(session_id)
        if not info:
            return False
        step_up = info.get("step_up_auth")
        if not step_up:
            return False
        try:
            step_up_time = datetime.fromisoformat(step_up)
            return (_tz_now() - step_up_time) < STEP_UP_AUTH_WINDOW
        except (ValueError, KeyError):
            return False


def _regenerate_session_id(session_id: str, namespace: str, environment: str) -> Optional[str]:
    """Regenerate session ID to prevent session fixation attacks.

    Preserves step_up_auth status and transfers session to new ID.
    Returns the new session ID, or None if the old session doesn't exist.
    """
    with _SESSION_REGISTRY_LOCK:
        old_info = _ACTIVE_SESSIONS.get(session_id)
        if not old_info:
            return None

        new_session_id = _generate_session_id()
        _ACTIVE_SESSIONS[new_session_id] = {
            "namespace": namespace,
            "environment": environment,
            "created": old_info.get("created", _tz_now().isoformat()),
            "last_active": _tz_now().isoformat(),
            "ip": request.remote_addr or old_info.get("ip", "unknown"),
            "user_agent": old_info.get("user_agent", "unknown"),
            "step_up_auth": old_info.get("step_up_auth"),  # Preserve step-up status
        }
        # Remove old session
        _ACTIVE_SESSIONS.pop(session_id, None)

    return new_session_id


def _grant_step_up_auth(session_id: str) -> None:
    """Grant step-up authentication for sensitive operations."""
    with _SESSION_REGISTRY_LOCK:
        if session_id in _ACTIVE_SESSIONS:
            _ACTIVE_SESSIONS[session_id]["step_up_auth"] = _tz_now().isoformat()


def session_key_for(namespace: str, environment: str) -> str:
    """Build session key string for Flask session storage."""
    return f"{namespace}:{environment}:authed"


def current_identity(namespace: str, environment: str) -> Dict[str, Any]:
    """Get session identity from Flask session."""
    from flask import session
    session_key = session_key_for(namespace, environment)
    return session.get(session_key, {})


def mark_authenticated(namespace: str, environment: str) -> None:
    """Mark a session as authenticated and register it."""
    from flask import session
    session_key = session_key_for(namespace, environment)
    session_id = _register_session(namespace, environment)
    session[session_key] = {"ts": _tz_now().isoformat(), "id": session_id}
    session.permanent = True
    session["last_active"] = _tz_now().isoformat()
    session["session_created"] = _tz_now().isoformat()


def clear_auth(namespace: str, environment: str) -> None:
    """Clear authentication from session."""
    from flask import session
    session_key = session_key_for(namespace, environment)
    record = session.get(session_key, {})
    session_id = record.get("id") if record else None
    # Remove server-side session entry
    if session_id:
        _invalidate_session(session_id)
    session.pop(session_key, None)


def get_active_sessions() -> list:
    """Get list of all active sessions for management UI."""
    with _SESSION_REGISTRY_LOCK:
        sessions = []
        for sid, info in _ACTIVE_SESSIONS.items():
            try:
                created = datetime.fromisoformat(info["created"])
                last_active = datetime.fromisoformat(info["last_active"])
                is_valid = (_tz_now() - created) < SESSION_MAX_LIFETIME
                sessions.append({
                    "id": sid[:16] + "...",
                    "namespace": info["namespace"],
                    "environment": info["environment"],
                    "created": created,
                    "last_active": last_active,
                    "ip": info["ip"],
                    "user_agent": info["user_agent"][:80] if info["user_agent"] else "unknown",
                    "has_step_up": info.get("step_up_auth") is not None,
                    "is_valid": is_valid,
                })
            except (ValueError, KeyError):
                continue
        return sessions