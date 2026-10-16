"""
Security middleware for Secure Environment Manager.
Handles security headers, CORS, and request preprocessing.
"""
from datetime import datetime, timezone
from typing import Callable

from flask import Response, make_response, request


def update_last_seen() -> None:
    """Update last_active timestamp in session.

    Called as @app.before_request to track user activity.
    """
    from flask import session
    if "last_active" in session:
        session["last_active"] = _tz_now().isoformat()


def add_security_headers(response: Response) -> Response:
    """Add security headers to all responses.

    Called as @app.after_request to ensure consistent security headers.
    """
    from core.config import settings

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    response.headers.setdefault("Content-Security-Policy", settings.content_security_policy)
    response.headers.setdefault("Cache-Control", "no-store")

    if request.path.startswith("/api/v1"):
        origin = request.headers.get("Origin")
        if origin and origin in settings.cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        response.headers.setdefault(
            "Access-Control-Allow-Headers", "Authorization, Content-Type"
        )
        response.headers.setdefault(
            "Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
    return response


def api_cors_preflight() -> Response | None:
    """Handle CORS preflight requests for API endpoints.

    Called as @app.before_request for OPTIONS requests to /api/v1/*.
    """
    from core.config import settings

    if (
        request.method == "OPTIONS"
        and request.path.startswith("/api/v1")
    ):
        resp = make_response("", 204)
        origin = request.headers.get("Origin")
        if origin and origin in settings.cors_origins:
            resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
        return resp
    return None


def _tz_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)