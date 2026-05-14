"""
Authentication routes for Secure Environment Manager.
Handles login, logout, and step-up authentication.
"""
from flask import (
    Blueprint,
    Response,
    jsonify,
    redirect,
    request,
    session,
)
from werkzeug.security import check_password_hash

from core.auth import (
    LOGIN_ATTEMPTS,
    MAX_LOGIN_ATTEMPTS,
    is_locked,
    record_failed_attempt,
    reset_attempts,
    generate_csrf_token,
)
from core.config import settings, spa_url
from core.constants_patch import get_dashboard_password_hash
from metrics import LOGIN_SUCCESS_COUNTER, LOGIN_FAILURE_COUNTER
from core.sessions import (
    current_identity,
    mark_authenticated,
    clear_auth,
    _invalidate_session,
)
from core.step_up_auth import require_step_up_auth
from middleware.rate_limiter import check_step_up_rate_limit


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/<namespace>/<environment>", methods=["GET", "POST"])
def dashboard(namespace: str, environment: str):
    """Browser UI lives on Next.js; this route redirects or handles legacy password POST (CLI)."""
    from utils.helpers import validate_segments

    validate_segments(namespace, environment)
    session_key = f"{namespace}:{environment}:authed"
    identifier = f"{request.remote_addr}:{session_key}"

    if request.method == "POST" and not session.get(session_key):
        locked, until = is_locked(identifier)
        if locked:
            from utils.helpers import format_timestamp
            return Response(
                f"Too many attempts. Try again after {format_timestamp(until)}.",
                429,
                mimetype="text/plain",
            )

        password = request.form.get("password", "")
        if password and check_password_hash(get_dashboard_password_hash(), password):
            LOGIN_SUCCESS_COUNTER.inc()
            mark_authenticated(namespace, environment)
            reset_attempts(identifier)
            try:
                session.modified = True
            except Exception:
                pass
            return redirect(spa_url(namespace, environment))

        reason = "invalid_password" if password else "missing_password"
        LOGIN_FAILURE_COUNTER.labels(reason=reason).inc()
        record_failed_attempt(identifier)
        remaining = max(0, MAX_LOGIN_ATTEMPTS - LOGIN_ATTEMPTS[identifier]["fails"])
        return Response(
            f"Invalid password. {remaining} attempts remaining.",
            401,
            mimetype="text/plain",
        )

    return redirect(spa_url(namespace, environment))


@auth_bp.route("/logout/<namespace>/<environment>")
def logout(namespace: str, environment: str):
    """Logout and invalidate session."""
    from audit_logger import audit_logger

    record = current_identity(namespace, environment)
    session_id = record.get("id") if record else None

    # Audit Log
    audit_logger.log_logout(
        namespace, environment, "session", request.remote_addr or "unknown"
    )

    # Invalidate session in registry
    if session_id:
        _invalidate_session(session_id)

    clear_auth(namespace, environment)
    return redirect(spa_url(namespace, environment))


@auth_bp.route("/step-up/<namespace>/<environment>", methods=["POST"])
def step_up_auth(namespace: str, environment: str):
    """Grant step-up authentication for sensitive operations.

    Requires recent password re-entry to enable operations like
    export, bulk import, and rollback for 5 minutes.
    """
    from audit_logger import audit_logger
    from core.sessions import _grant_step_up_auth, _regenerate_session_id
    from core.constants import STEP_UP_AUTH_WINDOW

    record = current_identity(namespace, environment)
    session_id = record.get("id") if record else None

    if not session_id:
        return jsonify({"error": "No active session"}), 401

    password = request.form.get("password", "")
    if not password:
        return jsonify({"error": "Password required"}), 400

    if not check_password_hash(get_dashboard_password_hash(), password):
        audit_logger.log_login_failure(
            namespace, environment, request.remote_addr or "unknown",
            reason="step_up_invalid_password"
        )
        return jsonify({"error": "Invalid password"}), 401

    _grant_step_up_auth(session_id)
    # Regenerate session ID to prevent session fixation attack
    new_session_id = _regenerate_session_id(session_id, namespace, environment)
    if new_session_id:
        from flask import session
        session_key = f"{namespace}:{environment}:authed"
        session[session_key] = {"ts": _tz_now().isoformat(), "id": new_session_id}

    audit_logger.log_event(
        "STEP_UP_AUTH_GRANTED", "session", "step_up",
        namespace, environment, request.remote_addr or "unknown",
        {"session_id": (new_session_id or session_id)[:16] + "...", "session_regenerated": new_session_id is not None}
    )

    return jsonify({
        "status": "ok",
        "expires_in": int(STEP_UP_AUTH_WINDOW.total_seconds()),
        "message": "Step-up authentication granted for 5 minutes",
        "session_regenerated": new_session_id is not None
    })