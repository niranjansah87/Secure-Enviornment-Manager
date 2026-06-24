"""
Mobile and SDK authentication routes.
Provides JWT-based authentication for Flutter, CLI, and SDK clients.

Supports:
- Password authentication with JWT issuance
- Token refresh
- Device registration
- Session management
- Multi-device support
"""
import hmac as _hmac

from flask import Blueprint, request, g
from werkzeug.security import check_password_hash

from core.api_response import api_response, api_error, ErrorCode
from core.config import settings
from core.jwt_auth import (
    token_manager,
    extract_jwt_from_header,
    extract_refresh_token_from_header,
    require_jwt,
    require_admin,
)
from core.constants_patch import get_dashboard_password_hash
from core.sessions import (
    _register_session,
    _invalidate_session,
    _tz_now,
)
from audit_logger import audit_logger
from middleware.rate_limiter import check_login_rate_limit, is_ip_locked, track_failed_login, reset_login_failures


jwt_auth_bp = Blueprint("jwt_auth", __name__, url_prefix="/api/v1/auth")


@jwt_auth_bp.route("/login", methods=["POST"])
def jwt_login():
    """Authenticate with password and return JWT tokens.

    Request Body:
        {
            "username": "namespace/environment" (optional, defaults to global/main),
            "password": "dashboard_password",
            "device_name": "iPhone 15 Pro" (optional),
            "device_type": "mobile" (optional, one of: mobile, desktop, cli, sdk),
            "platform": "ios" (optional)
        }

    Returns:
        {
            "success": true,
            "data": {
                "access_token": "jwt_access_token",
                "refresh_token": "semr_...",
                "expires_in": 900,
                "token_type": "Bearer"
            }
        }
    """
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
    device_name = data.get("device_name", "Unknown Device")
    device_type = data.get("device_type", "unknown")
    platform = data.get("platform", "unknown")

    if not password:
        return api_error(
            ErrorCode.VALIDATION_MISSING_FIELD[0],
            message="password is required",
            status_code=400
        )

    # Identify credential type and resolve permissions
    is_admin = False
    scopes: list[str] = []
    credential_type = "unknown"
    allowed_namespaces: list[str] = []

    master = settings.master_api_token
    if master and _hmac.compare_digest(master, password):
        is_admin = True
        credential_type = "master_token"

    elif check_password_hash(get_dashboard_password_hash(), password):
        is_admin = True
        credential_type = "dashboard_password"

    else:
        from services.api_key_service import api_key_service
        is_valid, key_info = api_key_service.verify_key(password)
        if is_valid and key_info:
            credential_type = "api_key"
            allowed_environments = key_info.get("environments", [])
            allowed_namespaces = key_info.get("namespaces", [])
            # Environment-level scopes take priority over namespace-level
            if allowed_environments:
                scopes = allowed_environments
            elif allowed_namespaces:
                scopes = allowed_namespaces
            else:
                scopes = ["*"]
            if namespace == "global" and key_info.get("namespace"):
                namespace = key_info["namespace"]
        else:
            track_failed_login()
            audit_logger.log_login_failure(
                namespace, environment, request.remote_addr or "unknown",
                reason="invalid_credential"
            )
            return api_error(
                ErrorCode.AUTH_INVALID_CREDENTIALS[0],
                message="Invalid credentials",
                status_code=401
            )

    # Clear failed-login counter so a successful auth lifts any lockout
    reset_login_failures()

    # Create server-side session
    session_id = _register_session(
        namespace=namespace,
        environment=environment,
    )

    # Create JWT tokens
    access_token = token_manager.create_access_token(
        session_id=session_id,
        namespace=namespace,
        environment=environment,
        is_admin=is_admin,
        scopes=scopes,
    )
    refresh_token, _ = token_manager.create_refresh_token(
        session_id=session_id,
        user_agent=request.headers.get("User-Agent", "unknown"),
        ip_address=request.remote_addr or "unknown",
    )

    # Register device if device info provided
    device_id = None
    if device_type != "unknown":
        device_id = token_manager.register_device(
            session_id=session_id,
            device_name=device_name,
            device_type=device_type,
            platform=platform,
            user_agent=request.headers.get("User-Agent", "unknown"),
            ip_address=request.remote_addr or "unknown",
        )

    audit_logger.log_login_success(
        namespace, environment, credential_type, request.remote_addr or "unknown"
    )
    audit_logger.log_event(
        "JWT_TOKEN_ISSUED", "session", session_id[:16],
        namespace, environment, request.remote_addr or "unknown",
        {
            "credential_type": credential_type,
            "device_id": device_id,
            "device_type": device_type,
            "platform": platform,
            "is_admin": is_admin,
        }
    )

    return api_response(
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": 900,
            "token_type": "Bearer",
            "device_id": device_id,
            "is_admin": is_admin,
            "credential_type": credential_type,
            "allowed_namespaces": allowed_namespaces,
        },
        status_code=200
    )


@jwt_auth_bp.route("/refresh", methods=["POST"])
def jwt_refresh():
    """Refresh access token using refresh token.

    Request Body:
        {
            "refresh_token": "semr_..."
        }

    Returns:
        {
            "success": true,
            "data": {
                "access_token": "new_jwt_access_token",
                "refresh_token": "new_semr_...",  # Token rotation
                "expires_in": 900
            }
        }
    """
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

    return api_response(
        data={
            "access_token": new_access,
            "refresh_token": new_refresh,
            "expires_in": 900,
            "token_type": "Bearer",
        },
        status_code=200
    )


@jwt_auth_bp.route("/logout", methods=["POST"])
@require_jwt
def jwt_logout():
    """Logout and revoke current session's tokens.

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
    payload = g.jwt_payload

    # Revoke all tokens for this session
    count = token_manager.revoke_all_session_tokens(payload.sub)

    # Invalidate server-side session
    _invalidate_session(payload.sub)

    audit_logger.log_logout(
        payload.namespace or "global",
        payload.environment or "main",
        "jwt",
        request.remote_addr or "unknown"
    )
    audit_logger.log_event(
        "JWT_SESSION_REVOKED", "session", payload.sub[:16],
        payload.namespace or "global",
        payload.environment or "main",
        request.remote_addr or "unknown",
        {"tokens_revoked": count}
    )

    return api_response(
        data={"message": "Logged out successfully", "tokens_revoked": count},
        status_code=200
    )


@jwt_auth_bp.route("/sessions", methods=["GET"])
@require_jwt
def jwt_list_sessions():
    """List all sessions for the current user.

    Headers:
        Authorization: Bearer <access_token>

    Returns:
        {
            "success": true,
            "data": {
                "sessions": [
                    {
                        "session_id": "...",
                        "devices": [...],
                        "tokens": [...]
                    }
                ]
            }
        }
    """
    payload = g.jwt_payload

    # Get devices for this session
    devices = token_manager.get_session_devices(payload.sub)
    tokens = token_manager.get_session_tokens(payload.sub)

    return api_response(
        data={
            "session_id": payload.sub,
            "namespace": payload.namespace,
            "environment": payload.environment,
            "devices": devices,
            "tokens": tokens,
            "is_admin": payload.is_admin,
        },
        status_code=200
    )


@jwt_auth_bp.route("/devices", methods=["GET"])
@require_jwt
def jwt_list_devices():
    """List all devices for the current user.

    Headers:
        Authorization: Bearer <access_token>

    Returns:
        {
            "success": true,
            "data": {
                "devices": [...]
            }
        }
    """
    payload = g.jwt_payload
    devices = token_manager.get_session_devices(payload.sub)

    return api_response(
        data={"devices": devices},
        status_code=200
    )


@jwt_auth_bp.route("/devices/<device_id>", methods=["DELETE"])
@require_jwt
def jwt_revoke_device(device_id: str):
    """Revoke a specific device and all its tokens.

    Headers:
        Authorization: Bearer <access_token>

    Returns:
        {
            "success": true,
            "data": {
                "message": "Device revoked"
            }
        }
    """
    payload = g.jwt_payload

    # Verify device belongs to this session
    device = token_manager.get_device(device_id)
    if not device:
        return api_error(
            ErrorCode.RESOURCE_NOT_FOUND[0],
            message="Device not found",
            status_code=404
        )

    if device.session_id != payload.sub:
        return api_error(
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS[0],
            message="Cannot revoke device from another session",
            status_code=403
        )

    token_manager.revoke_device(device_id)

    audit_logger.log_event(
        "DEVICE_REVOKED", "device", device_id,
        payload.namespace or "global",
        payload.environment or "main",
        request.remote_addr or "unknown",
        {"device_name": device.device_name}
    )

    return api_response(
        data={"message": "Device revoked"},
        status_code=200
    )


@jwt_auth_bp.route("/devices/<device_id>", methods=["GET"])
@require_jwt
def jwt_get_device(device_id: str):
    """Get details of a specific device.

    Headers:
        Authorization: Bearer <access_token>

    Returns:
        {
            "success": true,
            "data": {
                "device": {...}
            }
        }
    """
    payload = g.jwt_payload

    device = token_manager.get_device(device_id)
    if not device:
        return api_error(
            ErrorCode.RESOURCE_NOT_FOUND[0],
            message="Device not found",
            status_code=404
        )

    if device.session_id != payload.sub:
        return api_error(
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS[0],
            message="Cannot access device from another session",
            status_code=403
        )

    return api_response(
        data={
            "device": {
                "device_id": device.device_id,
                "device_name": device.device_name,
                "device_type": device.device_type,
                "platform": device.platform,
                "created_at": device.created_at,
                "last_active": device.last_active,
                "is_revoked": device.is_revoked,
                "user_agent": device.user_agent,
                "ip_address": device.ip_address,
            }
        },
        status_code=200
    )


# Admin-only endpoints

@jwt_auth_bp.route("/admin/devices", methods=["GET"])
@require_jwt
@require_admin
def jwt_admin_list_all_devices():
    """List all registered devices (admin only).

    Headers:
        Authorization: Bearer <admin_access_token>

    Returns:
        {
            "success": true,
            "data": {
                "devices": [...]
            }
        }
    """
    devices = token_manager.get_all_devices()

    return api_response(
        data={"devices": devices},
        status_code=200
    )


@jwt_auth_bp.route("/admin/sessions", methods=["GET"])
@require_jwt
@require_admin
def jwt_admin_list_all_sessions():
    """List all active sessions (admin only).

    Headers:
        Authorization: Bearer <admin_access_token>

    Returns:
        {
            "success": true,
            "data": {
                "sessions": [...]
            }
        }
    """
    from core.sessions import get_active_sessions

    sessions = get_active_sessions()

    return api_response(
        data={"sessions": sessions},
        status_code=200
    )


@jwt_auth_bp.route("/admin/sessions/<session_id>", methods=["DELETE"])
@require_jwt
@require_admin
def jwt_admin_revoke_session(session_id: str):
    """Revoke a specific session and all its tokens (admin only).

    Headers:
        Authorization: Bearer <admin_access_token>

    Returns:
        {
            "success": true,
            "data": {
                "message": "Session revoked"
            }
        }
    """
    # Revoke all tokens for this session
    count = token_manager.revoke_all_session_tokens(session_id)

    # Invalidate server-side session
    _invalidate_session(session_id)

    audit_logger.log_event(
        "ADMIN_SESSION_REVOKED", "session", session_id[:16],
        "system", "global",
        request.remote_addr or "unknown",
        {"tokens_revoked": count}
    )

    return api_response(
        data={"message": "Session revoked", "tokens_revoked": count},
        status_code=200
    )


@jwt_auth_bp.route("/admin/devices/<device_id>", methods=["DELETE"])
@require_jwt
@require_admin
def jwt_admin_revoke_device(device_id: str):
    """Revoke a specific device (admin only).

    Headers:
        Authorization: Bearer <admin_access_token>

    Returns:
        {
            "success": true,
            "data": {
                "message": "Device revoked"
            }
        }
    """
    device = token_manager.get_device(device_id)
    if device:
        device_name = device.device_name
    else:
        device_name = "unknown"

    token_manager.revoke_device(device_id)

    audit_logger.log_event(
        "ADMIN_DEVICE_REVOKED", "device", device_id,
        "system", "global",
        request.remote_addr or "unknown",
        {"device_name": device_name}
    )

    return api_response(
        data={"message": "Device revoked"},
        status_code=200
    )


# Utility endpoint for token introspection

@jwt_auth_bp.route("/me", methods=["GET"])
@require_jwt
def jwt_me():
    """Get current user info from token.

    Headers:
        Authorization: Bearer <access_token>

    Returns:
        {
            "success": true,
            "data": {
                "session_id": "...",
                "namespace": "...",
                "environment": "...",
                "is_admin": true,
                "device_id": "...",
                "expires_at": "..."
            }
        }
    """
    payload = g.jwt_payload

    import jwt
    from datetime import datetime, timezone

    # Decode to get expiration
    token = g.access_token
    decoded = jwt.decode(token, options={"verify_signature": False})

    return api_response(
        data={
            "session_id": payload.sub,
            "namespace": payload.namespace,
            "environment": payload.environment,
            "is_admin": payload.is_admin,
            "device_id": payload.device_id,
            "scopes": payload.scopes,
            "expires_at": datetime.fromtimestamp(payload.exp, tz=timezone.utc).isoformat(),
            "token_type": "access",
        },
        status_code=200
    )