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
    _tz_now,
)
from core.step_up_auth import require_step_up_auth
from middleware.rate_limiter import check_step_up_rate_limit, is_ip_locked, track_failed_login
from audit_logger import audit_logger


auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


@auth_bp.route("/login", methods=["POST"])
def api_login():
    """JSON login endpoint returning JWT tokens.

    DEPRECATED: This endpoint now returns JWT tokens.
    Session cookie behavior is deprecated and will be removed.
    Use /api/v1/auth/jwt/login for programmatic access.

    Request Body:
        {
            "password": "dashboard_password",
            "namespace": "global" (optional),
            "environment": "main" (optional),
            "device_name": "Web Browser" (optional),
            "device_type": "web" (optional)
        }

    Returns:
        {
            "success": true,
            "data": {
                "access_token": "jwt_access_token",
                "refresh_token": "semr_...",
                "expires_in": 900,
                "token_type": "Bearer",
                "device_id": "..." (optional)
            }
        }
    """
    from core.jwt_auth import token_manager
    from core.sessions import _register_session
    from core.api_response import api_response, api_error, ErrorCode

    # Check IP lockout
    if is_ip_locked():
        return api_error(
            ErrorCode.AUTH_ACCOUNT_LOCKED[0],
            message="Too many failed attempts. Try again later.",
            status_code=429
        )

    data = request.get_json(silent=True) or {}
    namespace = data.get("namespace", "global")
    environment = data.get("environment", "main")
    password = data.get("password", "")

    if not password:
        return api_error(
            ErrorCode.VALIDATION_MISSING_FIELD[0],
            message="password is required",
            status_code=400
        )

    # Validate password
    if not check_password_hash(get_dashboard_password_hash(), password):
        track_failed_login()
        audit_logger.log_login_failure(
            namespace, environment, request.remote_addr or "unknown",
            reason="api_login_invalid_password"
        )
        return api_error(
            ErrorCode.AUTH_INVALID_CREDENTIALS[0],
            message="Invalid credentials",
            status_code=401
        )

    # Create server-side session
    session_id = _register_session(
        namespace=namespace,
        environment=environment,
    )

    # Determine if admin (dashboard password = admin)
    is_admin = True

    # Create JWT tokens
    access_token = token_manager.create_access_token(
        session_id=session_id,
        namespace=namespace,
        environment=environment,
        is_admin=is_admin,
    )
    refresh_token, _ = token_manager.create_refresh_token(
        session_id=session_id,
        user_agent=request.headers.get("User-Agent", "unknown"),
        ip_address=request.remote_addr or "unknown",
    )

    audit_logger.log_login_success(
        namespace, environment, "api_login", request.remote_addr or "unknown"
    )

    return api_response(data={
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": 900,
        "token_type": "Bearer",
    })


@auth_bp.route("/refresh", methods=["POST"])
def api_refresh():
    """Refresh access token using refresh token.

    DEPRECATED: Use /api/v1/auth/jwt/refresh instead.

    Request Body:
        {
            "refresh_token": "semr_..."
        }

    Returns:
        {
            "success": true,
            "data": {
                "access_token": "new_jwt_access_token",
                "refresh_token": "new_semr_...",
                "expires_in": 900
            }
        }
    """
    from core.jwt_auth import token_manager
    from core.api_response import api_response, api_error, ErrorCode

    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token")

    if not refresh_token:
        return api_error(
            ErrorCode.VALIDATION_MISSING_FIELD[0],
            message="refresh_token is required",
            status_code=400
        )

    result = token_manager.refresh_access_token(refresh_token)
    if not result:
        return api_error(
            ErrorCode.AUTH_REFRESH_FAILED[0],
            message="Invalid or expired refresh token",
            status_code=401
        )

    new_access, new_refresh = result

    return api_response(data={
        "access_token": new_access,
        "refresh_token": new_refresh,
        "expires_in": 900,
        "token_type": "Bearer",
    })


@auth_bp.route("/logout", methods=["POST"])
def api_logout():
    """Logout and revoke tokens.

    Headers:
        Authorization: Bearer <access_token>

    Returns:
        {
            "success": true,
            "data": {
                "message": "Logged out successfully"
            }
        }
    """
    from core.jwt_auth import token_manager, extract_bearer_token
    from core.api_response import api_response

    token = extract_bearer_token(request.headers.get("Authorization", ""))

    if token:
        payload = token_manager.validate_access_token(token)
        if payload:
            # Revoke all tokens for this session
            token_manager.revoke_all_session_tokens(payload.sub)
            # Invalidate server-side session
            _invalidate_session(payload.sub)

    audit_logger.log_logout(
        "global", "main", "api",
        request.remote_addr or "unknown"
    )

    return api_response(data={"message": "Logged out successfully"})


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

    # Check step-up rate limit before validating password
    allowed, rate_info = check_step_up_rate_limit()
    if not allowed:
        return jsonify({
            "error": "Too many step-up attempts. Try again later.",
            "code": "STEP_UP_RATE_LIMITED",
            "retry_after": rate_info.get("retry_after", 300)
        }), 429

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