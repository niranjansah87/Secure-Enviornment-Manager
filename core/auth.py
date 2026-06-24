"""
Authentication and authorization for Secure Environment Manager.
Extracted from app.py for modular architecture.
"""
import hmac
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Dict, Tuple

from flask import Response, jsonify, redirect, request, session
from werkzeug.security import check_password_hash

from core.config import settings, logger
from core.sessions import (
    current_identity,
    clear_auth,
    _invalidate_session,
)
from middleware.rate_limiter import track_failed_login, reset_login_failures

# Global login attempt tracking
LOGIN_ATTEMPTS: Dict[str, Dict[str, Any]] = {}

# Lockout management
LOCKOUT_DELTA = timedelta(minutes=settings.lockout_minutes)
MAX_LOGIN_ATTEMPTS = settings.max_login_attempts


def _tz_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


def record_failed_attempt(identifier: str) -> None:
    """Record a failed login attempt and potentially lock the account."""
    entry = LOGIN_ATTEMPTS.setdefault(identifier, {"fails": 0, "locked_until": None})
    entry["fails"] += 1
    if entry["fails"] >= MAX_LOGIN_ATTEMPTS:
        entry["locked_until"] = _tz_now() + LOCKOUT_DELTA
        logger.warning("Locking %s until %s", identifier, entry["locked_until"])
    track_failed_login()


def reset_attempts(identifier: str) -> None:
    """Reset login attempts for an identifier."""
    if identifier in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS.pop(identifier, None)
    reset_login_failures()


def is_locked(identifier: str) -> Tuple[bool, datetime | None]:
    """Check if an identifier is currently locked out."""
    entry = LOGIN_ATTEMPTS.get(identifier)
    if not entry:
        return False, None
    locked_until = entry.get("locked_until")
    if locked_until and locked_until > _tz_now():
        return True, locked_until
    reset_attempts(identifier)
    return False, None


def generate_csrf_token() -> str:
    """Generate and store a CSRF token in the session."""
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def validate_csrf() -> None:
    """Validate the submitted CSRF token."""
    token = session.get("csrf_token")
    submitted = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
    if not token or not submitted or not hmac.compare_digest(token, submitted):
        from flask import abort
        abort(400, description="CSRF token missing or invalid")


# --- API Authentication ---


def require_api_auth(namespace: str, token: str | None, environment: str | None = None) -> bool:
    """Check if the API token is valid for the given namespace (and optionally environment)."""
    if not token:
        return False
    from services.api_key_service import api_key_service
    is_valid, key_info = api_key_service.verify_key(
        token, required_namespace=namespace, required_environment=environment
    )
    return is_valid


def extract_bearer_token() -> str | None:
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def api_auth_ok(namespace: str, token: str | None, environment: str | None = None) -> bool:
    """Verify API authentication is valid for the given namespace (and optionally environment)."""
    if not token:
        return False

    master = settings.master_api_token
    if master and hmac.compare_digest(master, token):
        return True

    from core.constants_patch import get_dashboard_password_hash
    if check_password_hash(get_dashboard_password_hash(), token):
        return True

    from core.jwt_auth import token_manager
    payload = token_manager.validate_access_token(token)
    if payload:
        if payload.is_admin:
            return True
        if payload.scopes:
            if "*" in payload.scopes:
                return True
            # Environment-level scope check ("namespace/environment")
            if environment and f"{namespace}/{environment}" in payload.scopes:
                return True
            # Namespace-level scope check
            if namespace in payload.scopes:
                return True
            return False
        if payload.namespace and payload.namespace != namespace:
            return False
        return True

    return require_api_auth(namespace, token, environment)


def namespaces_visible_to_token(token: str | None) -> list[str]:
    """Get list of namespaces visible to the given token."""
    if not token:
        return []
    master = settings.master_api_token
    if master and hmac.compare_digest(master, token):
        return list(_list_all_environments().keys())
    # Check if it's the dashboard password (for web dashboard login)
    from core.constants_patch import get_dashboard_password_hash
    if check_password_hash(get_dashboard_password_hash(), token):
        # Dashboard password grants access to all namespaces
        return list(_list_all_environments().keys())
    # JWT access token
    from core.jwt_auth import token_manager
    payload = token_manager.validate_access_token(token)
    if payload:
        # Admin tokens always see all namespaces
        if payload.is_admin:
            return list(_list_all_environments().keys())
        # Scoped API-key tokens: honour the scopes list
        if payload.scopes:
            if "*" in payload.scopes:
                return list(_list_all_environments().keys())
            valid_ns = set(_list_all_environments().keys())
            # Support both "namespace" and "namespace/environment" scope formats
            result = set()
            for scope in payload.scopes:
                ns = scope.split("/")[0] if "/" in scope else scope
                if ns in valid_ns:
                    result.add(ns)
            return list(result)
        # Non-admin token with a specific namespace
        if payload.namespace and payload.namespace != "global":
            return [payload.namespace]
        return list(_list_all_environments().keys())
    # API keys with RBAC - determine visible namespaces
    from services.api_key_service import api_key_service
    keys = api_key_service._load_keys()
    visible = []

    # Search all namespaces for matching key
    for ns, ns_keys in keys.items():
        for key_id, key_data in ns_keys.items():
            if key_data.get("status") != "active":
                continue
            # Check expiry
            expires_at = key_data.get("expires_at")
            if expires_at:
                try:
                    from datetime import datetime, timezone
                    expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    if datetime.now(timezone.utc) > expiry:
                        continue
                except (ValueError, TypeError):
                    pass
            # Verify key matches (supports both legacy SHA-256 and current PBKDF2)
            if api_key_service._verify_key(key_data["key"], token):
                allowed_environments = key_data.get("environments", [])
                allowed_namespaces = key_data.get("namespaces", [])
                valid_ns = set(_list_all_environments().keys())
                if allowed_environments:
                    # Environment-level scopes: extract unique namespaces
                    for scope in allowed_environments:
                        ns_part = scope.split("/")[0] if "/" in scope else scope
                        if ns_part in valid_ns:
                            visible.append(ns_part)
                elif allowed_namespaces:
                    for ns_item in allowed_namespaces:
                        if ns_item in valid_ns:
                            visible.append(ns_item)
                else:
                    # No restrictions = all namespaces
                    return list(valid_ns)

    return list(set(visible))


def identify_token(token: str | None) -> str:
    """Identify the type of token."""
    if not token:
        return "anonymous"
    master = settings.master_api_token
    if master and hmac.compare_digest(master, token):
        return "master_token"
    # Check if it's the dashboard password
    from core.constants_patch import get_dashboard_password_hash
    if check_password_hash(get_dashboard_password_hash(), token):
        return "dashboard_password"
    # Hash token to compare against stored API key hashes
    provided_hash = hashlib.sha256(token.encode()).hexdigest()
    for ns, key in _load_api_keys().items():
        if key and hmac.compare_digest(key, provided_hash):
            return f"api_key:{ns}"
    return "unknown_token"


# --- Dashboard Authentication ---


def ensure_authenticated(fn):
    """Decorator ensuring user is authenticated for web dashboard access."""
    @wraps(fn)
    def wrapper(namespace: str, environment: str, *args, **kwargs):
        from core import SESSION_MAX_LIFETIME
        from core.sessions import _update_session_activity

        from utils.helpers import validate_segments

        validate_segments(namespace, environment)
        record = current_identity(namespace, environment)
        last_active = session.get("last_active")
        session_created = session.get("session_created")
        session_id = record.get("id") if record else None

        # Check inactivity timeout
        if last_active:
            try:
                last_dt = datetime.fromisoformat(last_active)
                from core.constants import get_session_timeout
                if _tz_now() - last_dt > get_session_timeout():
                    clear_auth(namespace, environment)
                    if session_id:
                        _invalidate_session(session_id)
                    return _session_expired_redirect(namespace, environment)
            except ValueError:
                clear_auth(namespace, environment)
                return _session_expired_redirect(namespace, environment)

        # Check absolute session lifetime (24 hours)
        if session_created:
            try:
                created_dt = datetime.fromisoformat(session_created)
                if _tz_now() - created_dt > SESSION_MAX_LIFETIME:
                    clear_auth(namespace, environment)
                    if session_id:
                        _invalidate_session(session_id)
                    return _session_expired_redirect(namespace, environment)
            except ValueError:
                clear_auth(namespace, environment)
                return _session_expired_redirect(namespace, environment)

        if not record:
            if request.method in ("GET", "HEAD"):
                from core.config import spa_url
                return redirect(spa_url(namespace, environment))
            return Response(
                "Authentication required. POST password to /{}/{} first (legacy CLI)."
                .format(namespace, environment),
                401,
                mimetype="text/plain",
            )

        # Update activity timestamps
        session["last_active"] = _tz_now().isoformat()
        if session_id:
            _update_session_activity(session_id)

        return fn(namespace, environment, *args, **kwargs)

    return wrapper


def _session_expired_redirect(namespace: str, environment: str):
    """Redirect to login page with session expired message."""
    from flask import redirect
    from core.config import spa_url

    if request.accept_mimetypes["application/json"] >= request.accept_mimetypes["text/html"]:
        return jsonify({"error": "Session expired", "code": "SESSION_EXPIRED"}), 401
    # For browser requests, redirect to the login page with an expired flag
    return redirect(spa_url(namespace, environment, "?expired=1"))


def _load_api_keys() -> Dict[str, str]:
    """Load API keys from file."""
    import json
    import os
    from core.config import API_KEYS_FILE

    if not os.path.exists(API_KEYS_FILE):
        return {}
    try:
        with open(API_KEYS_FILE, "r", encoding="utf-8") as handle:
            data = json.load(handle)
            if isinstance(data, dict):
                return {str(k): str(v) for k, v in data.items()}
    except json.JSONDecodeError as exc:
        logger.error("Unable to parse api_keys file: %s", exc)
    return {}


def _list_all_environments() -> Dict[str, list[str]]:
    """List all available environments grouped by namespace."""
    from collections import defaultdict
    import os
    from core.config import DATA_DIR

    envs = defaultdict(list)
    if not os.path.exists(DATA_DIR):
        return envs

    for ns_dir in os.listdir(DATA_DIR):
        ns_path = os.path.join(DATA_DIR, ns_dir)
        if os.path.isdir(ns_path):
            for filename in os.listdir(ns_path):
                if filename.endswith(".enc"):
                    env_name = filename[:-4]
                    envs[ns_dir].append(env_name)
    return envs