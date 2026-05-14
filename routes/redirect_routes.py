"""
Legacy redirect routes for Secure Environment Manager.
Redirects old URL patterns to Next.js SPA routes.
"""
from flask import Blueprint, redirect, request

from core.auth import ensure_authenticated
from core.step_up_auth import require_step_up_auth
from core.config import spa_url, settings
from utils.helpers import read_vars, write_vars
from audit_logger import audit_logger
from history_manager import HistoryManager


redirect_bp = Blueprint("redirect", __name__)


@redirect_bp.route("/history/<namespace>/<environment>")
@ensure_authenticated
def view_history(namespace: str, environment: str):
    """Legacy path: history UI is on Next.js."""
    return redirect(spa_url(namespace, environment, "history"))


@redirect_bp.route("/compare/<namespace>/<environment>/<snapshot_id>")
@ensure_authenticated
def compare_version(namespace: str, environment: str, snapshot_id: str):
    """Diff UI removed with Jinja; use History on the Next.js app."""
    del snapshot_id  # legacy URL segment; diff is viewed from History in the SPA
    return redirect(spa_url(namespace, environment, "history"))


@redirect_bp.route("/rollback/<namespace>/<environment>/<snapshot_id>")
@ensure_authenticated
@require_step_up_auth
def rollback_version(namespace: str, environment: str, snapshot_id: str):
    """Rollback to a specific snapshot (web route)."""
    history_manager = HistoryManager(settings.data_dir, str(settings.encryption_key))
    snapshot = history_manager.get_snapshot(namespace, environment, snapshot_id)
    if not snapshot:
        return redirect(spa_url(namespace, environment, "history"))

    # Restore variables
    write_vars(namespace, environment, snapshot["variables"])

    # Log the rollback
    history_manager.save_snapshot(
        namespace, environment, snapshot["variables"], "session",
        "ROLLBACK", f"Rolled back to version from {snapshot['timestamp']}"
    )

    audit_logger.log_variable_update(
        namespace, environment, "ALL", "VARIOUS", "ROLLBACK",
        "session", request.remote_addr or "unknown"
    )

    return redirect(spa_url(namespace, environment, "history"))


@redirect_bp.route("/compare-environments/<namespace>/<environment>", methods=["GET", "POST"])
@ensure_authenticated
def compare_environments(namespace: str, environment: str):
    """Legacy path: compare UI is on Next.js (/compare)."""
    return redirect(spa_url(namespace, environment, "compare"))


@redirect_bp.route("/templates/<namespace>/<environment>")
@ensure_authenticated
def view_templates(namespace: str, environment: str):
    """Legacy path: templates UI is on Next.js."""
    return redirect(spa_url(namespace, environment, "templates"))


@redirect_bp.route("/templates/<namespace>/<environment>/apply", methods=["POST"])
@ensure_authenticated
def apply_template(namespace: str, environment: str):
    """Apply a template to the current environment."""
    import json
    import os
    import secrets
    from history_manager import HistoryManager

    template_key = request.form.get("template_key")

    templates_path = os.path.join(os.path.dirname(__file__), "..", "..", "templates_config.json")
    if not os.path.exists(templates_path):
        return redirect(spa_url(namespace, environment, "templates"))

    with open(templates_path, "r") as f:
        templates = json.load(f)

    if template_key not in templates:
        return redirect(spa_url(namespace, environment, "templates"))

    template = templates[template_key]
    new_vars = template["variables"].copy()

    # Process placeholders
    for key, value in new_vars.items():
        if value == "__GENERATE__":
            new_vars[key] = secrets.token_urlsafe(32)

    # Merge with existing variables
    current_vars = read_vars(namespace, environment)
    if "error" in current_vars:
        current_vars = {}

    current_vars.update(new_vars)

    write_vars(namespace, environment, current_vars)

    history_manager = HistoryManager(settings.data_dir, str(settings.encryption_key))
    history_manager.save_snapshot(
        namespace, environment, current_vars, "session",
        "APPLY_TEMPLATE", f"Applied template: {template['name']}"
    )

    audit_logger.log_event(
        "APPLY_TEMPLATE",
        "session",
        str(template_key),
        namespace,
        environment,
        request.remote_addr or "unknown",
        {"template_name": template["name"], "vars_count": len(new_vars)}
    )

    return redirect(spa_url(namespace, environment, "templates"))


@redirect_bp.route("/audit-logs/<namespace>/<environment>")
@ensure_authenticated
def view_audit_logs(namespace: str, environment: str):
    """Legacy path: audit UI is on Next.js."""
    return redirect(spa_url(namespace, environment, "audit"))