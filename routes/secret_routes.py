"""
Secret management routes for Secure Environment Manager.
Handles adding, deleting, and bulk replacing variables.
"""
from flask import Blueprint, redirect, request

from core.auth import ensure_authenticated
from core.step_up_auth import require_step_up_auth
from core.sessions import current_identity

from utils.helpers import read_vars, write_vars
from audit_logger import audit_logger
from history_manager import HistoryManager
from core.config import settings


secret_bp = Blueprint("secret", __name__)


@secret_bp.route("/add/<namespace>/<environment>", methods=["POST"])
@ensure_authenticated
def add_variable(namespace: str, environment: str):
    """Add or update a variable in the environment."""
    key = request.form.get("key", "").strip()
    value = request.form.get("value", "").strip()

    if not key:
        return redirect(_spa_url(namespace, environment))

    # Check if update or create
    current_vars = read_vars(namespace, environment)
    is_update = key in current_vars
    old_value = current_vars.get(key, "")

    variables = read_vars(namespace, environment)
    variables[key] = value
    write_vars(namespace, environment, variables)

    # Save History Snapshot
    _get_history_manager().save_snapshot(
        namespace, environment, variables, "session",
        "UPDATE" if is_update else "CREATE",
        f"{'Updated' if is_update else 'Created'} variable '{key}'"
    )

    # Audit Log
    if is_update:
        audit_logger.log_variable_update(
            namespace, environment, key, old_value, value,
            "session", request.remote_addr or "unknown"
        )
    else:
        audit_logger.log_variable_create(
            namespace, environment, key, value,
            "session", request.remote_addr or "unknown"
        )

    return redirect(_spa_url(namespace, environment))


@secret_bp.route("/delete/<namespace>/<environment>/<key>", methods=["POST"])
@ensure_authenticated
def delete_variable(namespace: str, environment: str, key: str):
    """Delete a variable from the environment."""
    # Get value for log before deleting
    current_vars = read_vars(namespace, environment)
    value = current_vars.get(key, "")

    variables = read_vars(namespace, environment)
    if key in variables:
        variables.pop(key)
        write_vars(namespace, environment, variables)

        # Save History Snapshot
        _get_history_manager().save_snapshot(
            namespace, environment, variables, "session",
            "DELETE", f"Deleted variable '{key}'"
        )

    # Audit Log
    audit_logger.log_variable_delete(
        namespace, environment, key, value,
        "session", request.remote_addr or "unknown"
    )

    return redirect(_spa_url(namespace, environment))


@secret_bp.route("/bulk/<namespace>/<environment>", methods=["POST"])
@ensure_authenticated
@require_step_up_auth
def bulk_replace(namespace: str, environment: str):
    """Merge the environment with pasted .env payload (non-destructive)."""
    from core.auth import validate_csrf
    from core.constants import KEY_PATTERN

    validate_csrf()
    payload = request.form.get("bulk_payload", "").strip()
    if not payload:
        return redirect(_spa_url(namespace, environment))
    result: dict = {}
    for line in payload.splitlines():
        if not line or line.strip().startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not KEY_PATTERN.match(key):
            continue
        result[key] = value.strip()
    if not result:
        pass
    else:
        # Merge: read existing and update only matching keys, keep rest
        existing = read_vars(namespace, environment)
        if "error" in existing:
            existing = {}
        for key, value in result.items():
            existing[key] = value
        write_vars(namespace, environment, existing)

        # Save History Snapshot
        _get_history_manager().save_snapshot(
            namespace, environment, existing, "session",
            "BULK_MERGE", f"Bulk merged {len(result)} variables"
        )

    return redirect(_spa_url(namespace, environment))


@secret_bp.route("/rollback/<namespace>/<environment>/<snapshot_id>", methods=["POST"])
@ensure_authenticated
@require_step_up_auth
def rollback_version(namespace: str, environment: str, snapshot_id: str):
    """Rollback to a specific snapshot"""
    snapshot = _get_history_manager().get_snapshot(namespace, environment, snapshot_id)
    if not snapshot:
        return redirect(_spa_url(namespace, environment, "history"))

    # Restore variables
    write_vars(namespace, environment, snapshot["variables"])

    # Log the rollback
    _get_history_manager().save_snapshot(
        namespace, environment, snapshot["variables"], "session",
        "ROLLBACK", f"Rolled back to version from {snapshot['timestamp']}"
    )

    audit_logger.log_variable_update(
        namespace, environment, "ALL", "VARIOUS", "ROLLBACK",
        "session", request.remote_addr or "unknown"
    )

    return redirect(_spa_url(namespace, environment, "history"))


def _spa_url(namespace: str, environment: str, *extra: str) -> str:
    """Build SPA URL."""
    from core.config import spa_url as _spa_url_func
    return _spa_url_func(namespace, environment, *extra)


# Lazy singleton for history manager
_history_manager = None


def _get_history_manager() -> HistoryManager:
    """Get or create the history manager singleton."""
    global _history_manager
    if _history_manager is None:
        _history_manager = HistoryManager(settings.data_dir, str(settings.encryption_key))
    return _history_manager