"""
API routes for Secure Environment Manager.
All /api/v1/* endpoints for programmatic access.
"""
import hmac
import json
from pathlib import Path
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash

from core.auth import (
    extract_bearer_token,
    api_auth_ok,
    namespaces_visible_to_token,
    identify_token,
)
from core.config import settings
from core.constants import KEY_PATTERN
from core.constants_patch import get_dashboard_password_hash
from middleware.rate_limiter import is_ip_locked, get_login_failure_count
from utils.helpers import (
    read_vars,
    write_vars,
    get_metadata,
    list_all_environments,
    validate_segments,
)
from audit_logger import audit_logger
from history_manager import HistoryManager
from analytics_service import analytics_service
from health_service import health_service


api_bp = Blueprint("api", __name__, url_prefix="/api/v1")


def _token_is_admin(token: str) -> bool:
    """Return True if the token carries admin privileges (raw credential or JWT)."""
    if settings.master_api_token and hmac.compare_digest(settings.master_api_token, token):
        return True
    if check_password_hash(get_dashboard_password_hash(), token):
        return True
    from core.jwt_auth import token_manager
    payload = token_manager.validate_access_token(token)
    return payload is not None and payload.is_admin


def _log_api_auth_failure(
    namespace: str,
    environment: str,
    ip_address: str,
    reason: str,
    endpoint: str
) -> None:
    """Log failed API authentication attempt.

    Security hygiene: never log the full token, only a fingerprint.
    Does NOT track login failures — expired/invalid tokens on API routes
    should never count toward IP lockout.  Only the login endpoint itself
    calls track_failed_login() for actual brute-force protection.
    """
    audit_logger.log_login_failure(
        namespace,
        environment,
        ip_address,
        reason=f"api_auth_failure:{reason} endpoint={endpoint}"
    )


def _check_api_lockout() -> tuple[bool, dict]:
    """Check if the client IP is locked out. Returns (is_locked, info)."""
    locked = is_ip_locked()
    return locked, {"locked": locked, "failure_count": get_login_failure_count()}


def _is_expired_or_invalid_jwt(token: str) -> bool:
    """Return True if the token looks like a JWT but fails validation (expired/invalid).

    Used to decide between 401 (expired JWT → re-authenticate) and
    403 (valid token but insufficient permissions → forbidden).
    """
    # Quick check: JWTs have 3 dot-separated base64 segments
    if token.count(".") != 2:
        return False
    from core.jwt_auth import token_manager
    return token_manager.validate_access_token(token) is None


def _token_forbidden_response(token: str, default_message: str = "Invalid API token"):
    """Return the appropriate error response for an invalid/forbidden token.

    - Expired/invalid JWT → 401 (signal client to re-authenticate/refresh)
    - Unknown/no token      → 401
    - Valid token, no perms → 403
    """
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if _is_expired_or_invalid_jwt(token):
        return jsonify({"error": "Token expired or invalid", "code": "AUTH_TOKEN_EXPIRED"}), 401
    return jsonify({"error": default_message}), 403


# Lazy singleton for history manager
_history_manager = None


def _get_history_manager() -> HistoryManager:
    """Get or create the history manager singleton."""
    global _history_manager
    if _history_manager is None:
        _history_manager = HistoryManager(settings.data_dir, str(settings.encryption_key))
    return _history_manager


def _recent_audit_entries(visible_namespaces: set, limit: int = 15) -> list[Dict[str, Any]]:
    """Get recent audit entries for visible namespaces."""
    log_path = audit_logger.log_file
    if not log_path.exists():
        return []
    lines: list[str] = []
    try:
        with open(log_path, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
    except OSError:
        return []
    picked: list[Dict[str, Any]] = []
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        ns = entry.get("namespace")
        if ns not in visible_namespaces:
            continue
        picked.append(entry)
        if len(picked) >= limit:
            break
    return picked


@api_bp.route("/auth/validate-password", methods=["POST"])
def api_validate_password():
    """Validate any credential (dashboard password, master token, or API key).

    Accepts namespace/environment/password in JSON body.
    Returns token scope info if credential is valid.
    """
    locked, _ = _check_api_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts. Try again later.", "code": "AUTH_LOCKED_OUT"}), 429

    data = request.get_json() or {}
    namespace = data.get("namespace", "global")
    environment = data.get("environment", "main")
    password = data.get("password", "")

    if not password:
        return jsonify({"error": "Password required", "code": "VALIDATION_PASSWORD_REQUIRED"}), 400

    # Master API token
    master = settings.master_api_token
    if master and hmac.compare_digest(master, password):
        audit_logger.log_login_success(namespace, environment, "master_token", request.remote_addr or "unknown")
        return jsonify({"valid": True, "token_type": "master_token", "is_admin": True,
                        "namespace": namespace, "environment": environment})

    # Dashboard password
    if check_password_hash(get_dashboard_password_hash(), password):
        audit_logger.log_login_success(namespace, environment, "dashboard_password", request.remote_addr or "unknown")
        return jsonify({"valid": True, "token_type": "dashboard_password", "is_admin": True,
                        "namespace": namespace, "environment": environment})

    # API key
    from services.api_key_service import api_key_service
    is_valid, key_info = api_key_service.verify_key(password)
    if is_valid and key_info:
        allowed_namespaces = key_info.get("namespaces", [])
        audit_logger.log_login_success(namespace, environment, "api_key", request.remote_addr or "unknown")
        return jsonify({"valid": True, "token_type": "api_key", "is_admin": False,
                        "namespace": key_info.get("namespace", namespace),
                        "environment": environment,
                        "allowed_namespaces": allowed_namespaces})

    _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_credential", "auth/validate")
    return jsonify({"error": "Invalid credential", "code": "AUTH_INVALID_CREDENTIAL"}), 401


@api_bp.route("/meta/environments", methods=["GET"])
def api_meta_environments():
    """List all environments visible to the authenticated token."""
    # Check IP lockout first
    locked, _ = _check_api_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts. Try again later.", "code": "AUTH_LOCKED_OUT"}), 429

    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "missing_token", "meta/environments")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    visible = namespaces_visible_to_token(token)
    if not visible:
        token_name = identify_token(token)
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", f"forbidden_token:{token_name}", "meta/environments")
        return _token_forbidden_response(token)

    token_name = identify_token(token)
    audit_logger.log_login_success("system", "global", token_name, request.remote_addr or "unknown")

    all_envs = list_all_environments()
    result = {ns: all_envs.get(ns, []) for ns in visible if ns in all_envs}
    return jsonify({"environments": result})


@api_bp.route("/meta/is-admin", methods=["GET"])
def api_meta_is_admin():
    """Check if the current token has admin privileges."""
    token = extract_bearer_token()
    if not token:
        return jsonify({"is_admin": False}), 200

    # Raw credential check (master token or dashboard password)
    from core.constants_patch import get_dashboard_password_hash
    if (settings.master_api_token and hmac.compare_digest(settings.master_api_token, token)) or \
            check_password_hash(get_dashboard_password_hash(), token):
        return jsonify({"is_admin": True})

    # JWT check — read is_admin from the token payload
    from core.jwt_auth import token_manager
    payload = token_manager.validate_access_token(token)
    if payload:
        return jsonify({"is_admin": payload.is_admin})

    return jsonify({"is_admin": False})


@api_bp.route("/meta/stats", methods=["GET"])
def api_meta_stats():
    """Get aggregated statistics across visible environments."""
    # Check IP lockout first
    locked, _ = _check_api_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts. Try again later.", "code": "AUTH_LOCKED_OUT"}), 429

    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "missing_token", "meta/stats")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    visible = set(namespaces_visible_to_token(token))
    if not visible:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "forbidden_token", "meta/stats")
        return _token_forbidden_response(token)
    all_envs = list_all_environments()
    total_envs = 0
    total_secrets = 0
    last_modified: datetime | None = None
    for ns in visible:
        for env in all_envs.get(ns, []):
            total_envs += 1
            meta = get_metadata(ns, env)
            lm = meta.get("last_modified")
            if isinstance(lm, datetime) and (
                last_modified is None or lm > last_modified
            ):
                last_modified = lm
            variables = read_vars(ns, env)
            if "error" not in variables:
                total_secrets += len(variables)
    recent = _recent_audit_entries(visible, 12)
    return jsonify(
        {
            "environment_count": total_envs,
            "secret_count": total_secrets,
            "last_updated": last_modified.isoformat() if last_modified else None,
            "recent_activity": recent,
        }
    )


@api_bp.route("/meta/analytics", methods=["GET"])
def api_meta_analytics():
    """Get activity trends and distribution stats."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "missing_token", "meta/analytics")
        return jsonify({"error": "Authorization header missing"}), 401
    visible = set(namespaces_visible_to_token(token))
    if not visible:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "forbidden_token", "meta/analytics")
        return _token_forbidden_response(token)

    try:
        days = min(int(request.args.get("days", 7)), 30)
    except (ValueError, TypeError):
        days = 7

    trends = analytics_service.get_activity_trends(days=days)
    distribution = analytics_service.get_distribution_stats(settings.data_dir)
    summary = analytics_service.get_summary_stats(days=days)

    # Filter distribution to only visible namespaces
    distribution["namespaces"] = [ns for ns in distribution["namespaces"] if ns["name"] in visible]

    return jsonify({
        "trends": trends,
        "distribution": distribution,
        **summary
    })


@api_bp.route("/meta/health", methods=["GET"])
def api_meta_health():
    """Get system health information (admin only)."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "missing_token", "meta/health")
        return jsonify({"error": "Authorization header missing"}), 401
    if not _token_is_admin(token):
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "master_required", "meta/health")
        return jsonify({"error": "Forbidden: Requires administrative privileges"}), 403

    return jsonify(health_service.get_system_health())


@api_bp.route("/meta/logins", methods=["GET"])
def api_meta_logins():
    """Get recent login events."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "missing_token", "meta/logins")
        return jsonify({"error": "Authorization header missing"}), 401
    visible = set(namespaces_visible_to_token(token))
    if not visible:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "forbidden_token", "meta/logins")
        return _token_forbidden_response(token)

    limit = min(int(request.args.get("limit", 50)), 500)

    # Get recent audits globally and filter for logins
    recent = _recent_audit_entries({"system", "global"}.union(visible), limit=limit * 10)

    logins = []
    for entry in recent:
        if entry.get("action") in ("LOGIN_SUCCESS", "LOGIN_FAILURE"):
            logins.append(entry)
            if len(logins) >= limit:
                break
    return jsonify({"logins": logins})


@api_bp.route("/keys/<namespace>", methods=["GET"])
def api_keys_list(namespace: str):
    """List API keys for a namespace (does not reveal the actual keys)."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "missing_token", "keys/list")
        return jsonify({"error": "Authorization header missing or invalid"}), 401

    if not _token_is_admin(token):
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "master_required", "keys/list")
        return jsonify({"error": "Administrator access required", "code": "AUTH_MASTER_REQUIRED"}), 403

    from services.api_key_service import api_key_service
    keys = api_key_service.list_keys(namespace)
    return jsonify({"keys": keys})


@api_bp.route("/keys/<namespace>", methods=["POST"])
def api_keys_create(namespace: str):
    """Create a new API key for a namespace with RBAC support."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "missing_token", "keys/create")
        return jsonify({"error": "Authorization header missing or invalid"}), 401

    if not _token_is_admin(token):
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "master_required", "keys/create")
        return jsonify({"error": "Administrator access required", "code": "AUTH_MASTER_REQUIRED"}), 403

    # Parse request body for options
    body = request.get_json(silent=True) or {}
    description = body.get("description", "")
    validity_days = max(0, min(int(body.get("validity_days", 30)), 365))
    custom_key = body.get("custom_key") or None
    allowed_namespaces = body.get("namespaces") or None
    allowed_environments = body.get("environments") or None  # ["ns/env", ...], None = all
    bound_user_id = body.get("bound_user_id") or None

    # Validate bound_user_id if provided
    if bound_user_id:
        from services.user_service import user_service
        if not user_service.get_user(bound_user_id):
            return jsonify({"error": "Bound user not found"}), 404

    # Validate custom key if provided
    from services.api_key_service import api_key_service
    if custom_key:
        is_valid, error_msg = api_key_service.validate_custom_key_format(custom_key)
        if not is_valid:
            return jsonify({"error": f"Invalid custom key: {error_msg}"}), 400

    try:
        raw_key, key_id = api_key_service.create_key(
            namespace,
            created_by="master_token",
            description=description,
            validity_days=validity_days,
            custom_key=custom_key,
            allowed_namespaces=allowed_namespaces,
            allowed_environments=allowed_environments,
            bound_user_id=bound_user_id,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    audit_logger.log_event(
        "API_KEY_CREATED", "api_key", key_id,
        namespace, "global", request.remote_addr or "unknown",
        {"namespace": namespace, "key_id": key_id, "validity_days": validity_days, "custom_key": bool(custom_key)}
    )
    return jsonify({
        "key": raw_key,
        "key_id": key_id,
        "namespace": namespace,
        "description": description,
        "validity_days": validity_days,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=validity_days)).isoformat() if validity_days > 0 else None,
        "namespaces": allowed_namespaces if allowed_namespaces else [],
        "environments": allowed_environments if allowed_environments else [],
        "bound_user_id": bound_user_id,
        "message": "Store this key securely. It will not be shown again."
    }), 201


@api_bp.route("/keys/<namespace>/<key_id>", methods=["DELETE"])
def api_keys_revoke(namespace: str, key_id: str):
    """Revoke an API key for a namespace."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "missing_token", "keys/revoke")
        return jsonify({"error": "Authorization header missing or invalid"}), 401

    if not _token_is_admin(token):
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "master_required", "keys/revoke")
        return jsonify({"error": "Administrator access required", "code": "AUTH_MASTER_REQUIRED"}), 403

    from services.api_key_service import api_key_service
    success = api_key_service.revoke_key(namespace, key_id)
    if not success:
        return jsonify({"error": "Key not found"}), 404

    audit_logger.log_event(
        "API_KEY_REVOKED", "api_key", key_id,
        namespace, "global", request.remote_addr or "unknown",
        {"namespace": namespace, "key_id": key_id}
    )
    return jsonify({"status": "revoked", "key_id": key_id})


@api_bp.route("/keys/<namespace>/<key_id>", methods=["GET"])
def api_keys_get(namespace: str, key_id: str):
    """Get detailed info about a specific API key."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "missing_token", "keys/get")
        return jsonify({"error": "Authorization header missing or invalid"}), 401

    if not _token_is_admin(token):
        _log_api_auth_failure(namespace, "global", request.remote_addr or "unknown", "master_required", "keys/get")
        return jsonify({"error": "Administrator access required", "code": "AUTH_MASTER_REQUIRED"}), 403

    from services.api_key_service import api_key_service
    key_info = api_key_service.get_key_info(namespace, key_id)
    if not key_info:
        return jsonify({"error": "Key not found"}), 404

    return jsonify(key_info)


@api_bp.route("/<namespace>/<environment>", methods=["GET", "PUT", "PATCH"])
def api_environment(namespace: str, environment: str):
    """Get, replace, or update variables for an environment."""
    # Check IP lockout first
    locked, _ = _check_api_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts. Try again later.", "code": "AUTH_LOCKED_OUT"}), 429

    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")

    if request.method == "GET":
        variables = read_vars(namespace, environment)
        if "error" in variables:
            return jsonify(variables), 500
        return jsonify(variables)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "JSON body with key/value pairs is required"}), 400

    filtered: Dict[str, str] = {}
    for key, value in payload.items():
        if not KEY_PATTERN.match(str(key)):
            continue
        filtered[str(key)] = str(value)

    if request.method == "PUT":
        write_vars(namespace, environment, filtered)
        _get_history_manager().save_snapshot(
            namespace,
            environment,
            filtered,
            "api",
            "BULK_REPLACE",
            f"API PUT replaced {len(filtered)} variables",
        )
        audit_logger.log_bulk_replace(
            namespace, environment, len(filtered), "api", request.remote_addr or ""
        )
        return jsonify({"status": "replaced", "count": len(filtered)})

    existing = read_vars(namespace, environment)
    if "error" in existing:
        existing = {}
    for key, new_value in filtered.items():
        old_value = existing.get(key, "")
        is_update = key in existing
        if is_update:
            audit_logger.log_variable_update(
                namespace,
                environment,
                key,
                old_value,
                new_value,
                "api",
                request.remote_addr or "",
            )
        else:
            audit_logger.log_variable_create(
                namespace,
                environment,
                key,
                new_value,
                "api",
                request.remote_addr or "",
            )
    existing.update(filtered)
    write_vars(namespace, environment, existing)
    _get_history_manager().save_snapshot(
        namespace,
        environment,
        existing,
        "api",
        "UPDATE",
        f"API PATCH updated {len(filtered)} variables",
    )
    return jsonify({"status": "updated", "count": len(filtered)})


@api_bp.route("/<namespace>/<environment>/meta", methods=["GET"])
def api_environment_meta(namespace: str, environment: str):
    """Get metadata for an environment."""
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/meta")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/meta")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")
    meta = get_metadata(namespace, environment)
    lm = meta.get("last_modified")
    variables = read_vars(namespace, environment)
    if "error" in variables:
        return jsonify(variables), 500
    return jsonify(
        {
            "last_updated": lm.isoformat() if isinstance(lm, datetime) else None,
            "variable_count": len(variables),
        }
    )


@api_bp.route("/<namespace>/<environment>/keys/<key>", methods=["DELETE"])
def api_delete_key(namespace: str, environment: str, key: str):
    """Delete a specific variable key."""
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/keys")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/keys")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")
    if not KEY_PATTERN.match(key):
        return jsonify({"error": "Invalid key name"}), 400
    variables = read_vars(namespace, environment)
    if "error" in variables:
        return jsonify(variables), 500
    if key not in variables:
        return jsonify({"error": "Key not found"}), 404
    value = variables.pop(key)
    write_vars(namespace, environment, variables)
    _get_history_manager().save_snapshot(
        namespace,
        environment,
        variables,
        "api",
        "DELETE",
        f"Deleted variable '{key}'",
    )
    audit_logger.log_variable_delete(
        namespace, environment, key, value, "api", request.remote_addr or ""
    )
    return jsonify({"status": "deleted", "key": key})


@api_bp.route("/<namespace>/<environment>/bulk", methods=["POST"])
def api_bulk_replace(namespace: str, environment: str):
    """Bulk merge variables from .env format payload."""
    # Check IP lockout first
    locked, _ = _check_api_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts. Try again later.", "code": "AUTH_LOCKED_OUT"}), 429

    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/bulk")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/bulk")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON object required"}), 400
    payload = str(body.get("payload", "")).strip()
    if not payload:
        return jsonify({"error": "payload is required"}), 400
    result: Dict[str, str] = {}
    for line in payload.splitlines():
        if not line or line.strip().startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        if not KEY_PATTERN.match(k):
            continue
        result[k] = v.strip()
    if not result:
        return jsonify({"error": "No valid key/value pairs detected"}), 400
    # Merge: read existing and update only matching keys, keep rest
    existing = read_vars(namespace, environment)
    if "error" in existing:
        existing = {}
    for key, value in result.items():
        existing[key] = value
    write_vars(namespace, environment, existing)
    _get_history_manager().save_snapshot(
        namespace,
        environment,
        existing,
        "api",
        "BULK_MERGE",
        f"API bulk merged {len(result)} variables",
    )
    audit_logger.log_bulk_replace(
        namespace, environment, len(result), "api", request.remote_addr or ""
    )
    return jsonify({"status": "merged", "additions": len(result)})


@api_bp.route("/<namespace>/<environment>/history", methods=["GET"])
def api_history(namespace: str, environment: str):
    """Get version history for an environment."""
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/history")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/history")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")
    history = _get_history_manager().get_history(namespace, environment, limit=80)
    return jsonify({"history": history})


@api_bp.route("/<namespace>/<environment>/audit", methods=["GET"])
def api_audit(namespace: str, environment: str):
    """Get audit logs for an environment."""
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/audit")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/audit")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")
    limit = min(int(request.args.get("limit", "50")), 500)
    offset = max(0, int(request.args.get("offset", "0")))
    action_filter = request.args.get("action")
    user_filter = request.args.get("user_id")
    ip_filter = request.args.get("ip")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    logs = audit_logger.get_logs(
        namespace=namespace,
        environment=environment,
        limit=limit,
        offset=offset,
        action=action_filter,
        user_id=user_filter,
        ip_address=ip_filter,
        start_date=start_date,
        end_date=end_date,
    )
    total = audit_logger.count_logs(
        namespace=namespace,
        environment=environment,
        action=action_filter,
        user_id=user_filter,
        ip_address=ip_filter,
        start_date=start_date,
        end_date=end_date,
    )
    return jsonify({
        "logs": logs,
        "pagination": {
            "offset": offset,
            "limit": limit,
            "total": total,
            "has_more": offset + len(logs) < total
        }
    })


@api_bp.route("/templates", methods=["GET"])
def api_templates_list():
    """List available templates."""
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "missing_token", "templates")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not namespaces_visible_to_token(token):
        _log_api_auth_failure("system", "global", request.remote_addr or "unknown", "forbidden_token", "templates")
        return _token_forbidden_response(token)
    templates_path = Path(__file__).resolve().parent.parent / "templates_config.json"
    if not os.path.exists(templates_path):
        return jsonify({"templates": {}})
    with open(templates_path, "r", encoding="utf-8") as handle:
        templates = json.load(handle)
    return jsonify({"templates": templates if isinstance(templates, dict) else {}})


@api_bp.route("/<namespace>/<environment>/templates/apply", methods=["POST"])
def api_templates_apply(namespace: str, environment: str):
    """Apply a template to an environment."""
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/templates/apply")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/templates/apply")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON object required"}), 400
    template_key = str(body.get("template_key", "")).strip()
    templates_path = Path(__file__).resolve().parent.parent / "templates_config.json"
    if not os.path.exists(templates_path):
        return jsonify({"error": "Templates configuration not found"}), 404
    with open(templates_path, "r", encoding="utf-8") as handle:
        templates = json.load(handle)
    if template_key not in templates:
        return jsonify({"error": "Invalid template"}), 400
    template = templates[template_key]
    new_vars = dict(template["variables"])
    for var_key, var_val in new_vars.items():
        if var_val == "__GENERATE__":
            new_vars[var_key] = secrets.token_urlsafe(32)
    current_vars = read_vars(namespace, environment)
    if "error" in current_vars:
        current_vars = {}
    current_vars.update(new_vars)
    write_vars(namespace, environment, current_vars)
    _get_history_manager().save_snapshot(
        namespace,
        environment,
        current_vars,
        "api",
        "APPLY_TEMPLATE",
        f"Applied template: {template['name']}",
    )
    audit_logger.log_event(
        "APPLY_TEMPLATE",
        "api",
        template_key,
        namespace,
        environment,
        request.remote_addr or "",
        {"template_name": template["name"], "vars_count": len(new_vars)},
    )
    return jsonify(
        {"status": "ok", "template": template["name"], "keys_added": len(new_vars)}
    )


@api_bp.route("/<namespace>/<environment>/rollback", methods=["POST"])
def api_rollback(namespace: str, environment: str):
    """Rollback to a specific snapshot version."""
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/rollback")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/rollback")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON object required"}), 400
    snapshot_id = str(body.get("snapshot_id", "")).strip()
    if not snapshot_id:
        return jsonify({"error": "snapshot_id required"}), 400
    snapshot = _get_history_manager().get_snapshot(namespace, environment, snapshot_id)
    if not snapshot:
        return jsonify({"error": "Snapshot not found"}), 404
    write_vars(namespace, environment, snapshot["variables"])
    _get_history_manager().save_snapshot(
        namespace,
        environment,
        snapshot["variables"],
        "api",
        "ROLLBACK",
        f"Rolled back to version from {snapshot['timestamp']}",
    )
    audit_logger.log_variable_update(
        namespace,
        environment,
        "ALL",
        "VARIOUS",
        "ROLLBACK",
        "api",
        request.remote_addr or "",
    )
    return jsonify({"status": "rolled_back", "timestamp": snapshot["timestamp"]})


@api_bp.route("/<namespace>/<environment>/step-up", methods=["POST"])
def api_step_up(namespace: str, environment: str):
    """Request step-up authentication for sensitive API operations."""
    # Check IP lockout first
    locked, _ = _check_api_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts. Try again later.", "code": "AUTH_LOCKED_OUT"}), 429

    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "missing_token", "environment/step-up")
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token, environment):
        _log_api_auth_failure(namespace, environment, request.remote_addr or "unknown", "invalid_api_key", "environment/step-up")
        return _token_forbidden_response(token, "Invalid API Key for this namespace")

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400
    password = str(body.get("password", "")).strip()
    if not password:
        return jsonify({"error": "password required for step-up auth"}), 400

    if not check_password_hash(get_dashboard_password_hash(), password):
        audit_logger.log_login_failure(
            namespace, environment, request.remote_addr or "unknown",
            reason="step_up_invalid_password"
        )
        return jsonify({"error": "Invalid password"}), 401

    step_up_token = secrets.token_urlsafe(32)
    audit_logger.log_event(
        "STEP_UP_AUTH_GRANTED", "api", "step_up",
        namespace, environment, request.remote_addr or "unknown",
        {"method": "api"}
    )

    return jsonify({
        "status": "ok",
        "step_up_token": step_up_token,
        "expires_in": 300,  # STEP_UP_AUTH_WINDOW.total_seconds()
        "message": "Step-up authentication granted for 5 minutes"
    })