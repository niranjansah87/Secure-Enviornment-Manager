"""
User management routes — admin CRUD for developer accounts.
All admin endpoints require _token_is_admin().
User self-service endpoints require a valid JWT.
"""
from flask import Blueprint, request, g

from core.api_response import api_response, api_error, ErrorCode
from core.jwt_auth import require_jwt
from services.user_service import user_service
from services.email_service import send_welcome_email, send_password_reset_email, is_email_configured


user_bp = Blueprint("users", __name__, url_prefix="/api/v1")


def _require_admin():
    """Return an error response if caller is not admin, else None."""
    from routes.api_routes import _token_is_admin, extract_bearer_token
    token = extract_bearer_token()
    if not token or not _token_is_admin(token):
        return api_error(
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS[0],
            message="Administrator access required",
            status_code=403,
        )
    return None


# ------------------------------------------------------------------ #
#  Admin — user management                                            #
# ------------------------------------------------------------------ #

@user_bp.route("/admin/users", methods=["POST"])
def admin_create_user():
    """Create a new developer account. Returns temp password once."""
    err = _require_admin()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    email = (body.get("email") or "").strip()
    role = body.get("role", "developer")
    scopes = body.get("scopes") or []

    if not username:
        return api_error(ErrorCode.VALIDATION_MISSING_FIELD[0], message="username is required", status_code=400)
    if not isinstance(scopes, list):
        return api_error(ErrorCode.VALIDATION_MISSING_FIELD[0], message="scopes must be an array", status_code=400)

    try:
        user_id, temp_password = user_service.create_user(
            username=username,
            role=role,
            scopes=scopes,
            email=email or None,
            created_by="admin",
        )
    except ValueError as e:
        return api_error(ErrorCode.VALIDATION_MISSING_FIELD[0], message=str(e), status_code=400)

    # Fire-and-forget email — never blocks response
    if email:
        send_welcome_email(email, username, temp_password)

    return api_response(
        data={
            "user_id": user_id,
            "username": username,
            "email": email,
            "role": role,
            "scopes": scopes,
            "temp_password": temp_password,
            "must_change_password": True,
            "email_sent": bool(email and is_email_configured()),
            "message": "Store the temp_password and share it with the user. It will not be shown again.",
        },
        status_code=201,
    )


@user_bp.route("/admin/users", methods=["GET"])
def admin_list_users():
    """List all user accounts (no password hashes)."""
    err = _require_admin()
    if err:
        return err

    users = user_service.list_users()
    return api_response(data={"users": users})


@user_bp.route("/admin/users/<user_id>", methods=["GET"])
def admin_get_user(user_id: str):
    """Get a single user's details."""
    err = _require_admin()
    if err:
        return err

    user = user_service.get_user(user_id)
    if not user:
        return api_error(ErrorCode.RESOURCE_NOT_FOUND[0], message="User not found", status_code=404)

    return api_response(data={"user": user})


@user_bp.route("/admin/users/<user_id>", methods=["PATCH"])
def admin_update_user(user_id: str):
    """Update a user's email, role, scopes, or status."""
    err = _require_admin()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    allowed_keys = {"email", "role", "scopes", "status"}
    updates = {k: v for k, v in body.items() if k in allowed_keys}

    if not updates:
        return api_error(
            ErrorCode.VALIDATION_MISSING_FIELD[0],
            message=f"Provide at least one of: {', '.join(allowed_keys)}",
            status_code=400,
        )

    try:
        updated = user_service.update_user(user_id, updates)
    except ValueError as e:
        return api_error(ErrorCode.VALIDATION_MISSING_FIELD[0], message=str(e), status_code=400)

    if not updated:
        return api_error(ErrorCode.RESOURCE_NOT_FOUND[0], message="User not found", status_code=404)

    return api_response(data={"user": updated})


@user_bp.route("/admin/users/<user_id>/reset-password", methods=["POST"])
def admin_reset_password(user_id: str):
    """Reset a user's password to a new temp password."""
    err = _require_admin()
    if err:
        return err

    temp_password = user_service.admin_reset_password(user_id)
    if not temp_password:
        return api_error(ErrorCode.RESOURCE_NOT_FOUND[0], message="User not found", status_code=404)

    # Send email if user has one and SMTP is configured
    user = user_service.get_user(user_id)
    email_sent = False
    if user and user.get("email"):
        send_password_reset_email(user["email"], user["username"], temp_password)
        email_sent = is_email_configured()

    return api_response(
        data={
            "user_id": user_id,
            "temp_password": temp_password,
            "must_change_password": True,
            "email_sent": email_sent,
            "message": "Share this temp password with the user. It will not be shown again.",
        }
    )


@user_bp.route("/admin/users/<user_id>", methods=["DELETE"])
def admin_delete_user(user_id: str):
    """Permanently delete a user account."""
    err = _require_admin()
    if err:
        return err

    deleted = user_service.delete_user(user_id)
    if not deleted:
        return api_error(ErrorCode.RESOURCE_NOT_FOUND[0], message="User not found", status_code=404)

    return api_response(data={"message": "User deleted", "user_id": user_id})


# ------------------------------------------------------------------ #
#  User self-service                                                  #
# ------------------------------------------------------------------ #

@user_bp.route("/user/change-password", methods=["POST"])
@require_jwt
def user_change_password():
    """
    Change own password. Required on first login (must_change_password).
    For voluntary changes, current_password must also be provided.
    """
    payload = g.jwt_payload
    user_id = getattr(payload, "user_id", None)

    if not user_id:
        return api_error(
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS[0],
            message="Only user accounts can change passwords via this endpoint.",
            status_code=403,
        )

    body = request.get_json(silent=True) or {}
    new_password = body.get("new_password", "")
    current_password = body.get("current_password") or None  # Optional for must-change flow

    if not new_password:
        return api_error(ErrorCode.VALIDATION_MISSING_FIELD[0], message="new_password is required", status_code=400)

    # On must_change_password flow, skip current_password verification
    must_change = getattr(payload, "must_change_password", False)
    if not must_change and current_password is None:
        return api_error(
            ErrorCode.VALIDATION_MISSING_FIELD[0],
            message="current_password is required for voluntary password changes.",
            status_code=400,
        )

    try:
        ok = user_service.change_password(
            user_id=user_id,
            new_password=new_password,
            current_password=None if must_change else current_password,
        )
    except ValueError as e:
        return api_error(ErrorCode.VALIDATION_MISSING_FIELD[0], message=str(e), status_code=400)

    if not ok:
        return api_error(
            ErrorCode.AUTH_INVALID_CREDENTIALS[0],
            message="Current password is incorrect or user not found.",
            status_code=401,
        )

    # Issue a fresh JWT with must_change_password cleared
    from core.jwt_auth import token_manager
    from core.sessions import _register_session

    user = user_service.get_user(user_id)
    session_id = _register_session(
        namespace=payload.namespace or "global",
        environment=payload.environment or "main",
    )
    access_token = token_manager.create_access_token(
        session_id=session_id,
        namespace=payload.namespace or "global",
        environment=payload.environment or "main",
        is_admin=payload.is_admin,
        scopes=payload.scopes,
        user_id=user_id,
        username=getattr(payload, "username", None),
        email=getattr(payload, "email", None),
        must_change_password=False,
        credential_type="user_password",
    )
    refresh_token, _ = token_manager.create_refresh_token(
        session_id=session_id,
        user_agent=request.headers.get("User-Agent", "unknown"),
        ip_address=request.remote_addr or "unknown",
    )

    return api_response(
        data={
            "message": "Password changed successfully.",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": 900,
            "token_type": "Bearer",
        }
    )
