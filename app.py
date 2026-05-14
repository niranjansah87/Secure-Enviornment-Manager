# app.py - Secure Environment Manager Bootstrap
"""Thin Flask bootstrap that wires together the modular architecture."""
import html
import logging
import os
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Dict

from dotenv import load_dotenv
from flask import Flask, request, session, make_response, Response, jsonify, g
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv()

# Import the modular components
from core.config import settings, DATA_LOCKS, spa_url
from core.auth import ensure_authenticated
from core.step_up_auth import require_step_up_auth
from core.sessions import (
    current_identity,
    clear_auth,
    mark_authenticated,
    session_key_for,
    _invalidate_session,
    _update_session_activity,
    _invalidate_all_sessions,
    _is_session_valid,
    _check_step_up_auth,
    _grant_step_up_auth,
    _SESSION_REGISTRY_LOCK,
    _ACTIVE_SESSIONS,
)
from core.constants import SESSION_MAX_LIFETIME, STEP_UP_AUTH_WINDOW
from core.constants_patch import get_dashboard_password_hash
from metrics import (
    LOGIN_SUCCESS_COUNTER,
    LOGIN_FAILURE_COUNTER,
    SECRET_UPDATE_COUNTER,
    SECRET_ACCESS_COUNTER,
)
from routes.api_routes import api_bp
from routes.auth_routes import auth_bp
from routes.secret_routes import secret_bp
from routes.export_routes import export_bp
from routes.redirect_routes import redirect_bp
from routes.jwt_auth_routes import jwt_auth_bp

# Services
from audit_logger import audit_logger

# Prometheus
from prometheus_flask_exporter import PrometheusMetrics
from prometheus_client import CollectorRegistry
try:
    from prometheus_client import multiproc  # type: ignore
except ImportError:
    multiproc = None

# --- Logging Setup ---
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

# --- Production Log Rotation ---
try:
    from middleware.log_rotation import setup_log_rotation
    setup_log_rotation()
except Exception as e:
    logger.warning(f"Log rotation setup failed: {e}")

# --- Flask App Setup ---
app = Flask(__name__)

# --- Request ID Middleware ---
@app.before_request
def add_request_id():
    """Add unique request ID for tracing."""
    import uuid
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4())[:16])
app.config["SECRET_KEY"] = settings.flask_secret_key
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=settings.session_cookie_secure,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=settings.session_timeout_minutes),
)

if settings.behind_proxy:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)  # type: ignore[attr-defined]

# --- Prometheus Monitoring Setup ---
def _get_metrics_registry():
    registry = CollectorRegistry()
    if os.getenv("PROMETHEUS_MULTIPROC_DIR") and multiproc:
        multiproc.MultiProcessCollector(registry)
    return registry

metrics = PrometheusMetrics(app, registry=_get_metrics_registry())
metrics.info("sem_app_info", "Secure Environment Manager Info", version="1.0.0")

# --- Centralized Error Handling ---
try:
    from core.exceptions import setup_error_handlers
    setup_error_handlers(app)
except Exception as e:
    logger.warning(f"Error handler setup failed: {e}")

# --- Register Blueprints ---
app.register_blueprint(api_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(secret_bp)
app.register_blueprint(export_bp)
app.register_blueprint(redirect_bp)
app.register_blueprint(jwt_auth_bp)

# --- Helper Functions (delegated to modules) ---
def _tz_now() -> datetime:
    return datetime.now(timezone.utc)

def namespaced_identifier(namespace: str, environment: str) -> str:
    return f"{namespace}:{environment}"

def format_timestamp(dt: datetime | None) -> str | None:
    if not dt:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

def wants_json_response() -> bool:
    return request.path.startswith("/api/") or request.accept_mimetypes["application/json"] >= request.accept_mimetypes["text/html"]

# --- Flask Hooks ---
@app.before_request
def update_last_seen():
    if "last_active" in session:
        session["last_active"] = _tz_now().isoformat()

@app.after_request
def add_security_headers(response: Response):
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
            if "Origin" not in response.headers.get("Vary", ""):
                response.headers.add("Vary", "Origin")
        response.headers.setdefault(
            "Access-Control-Allow-Headers", "Authorization, Content-Type"
        )
        response.headers.setdefault(
            "Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
    return response

@app.before_request
def api_cors_preflight() -> Response | None:
    if request.method == "OPTIONS" and request.path.startswith("/api/v1"):
        resp = make_response("", 204)
        origin = request.headers.get("Origin")
        if origin and origin in settings.cors_origins:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return resp
    return None

# --- Centralized Request Logging ---
@app.before_request
def log_request_start():
    """Log incoming request details to access log."""
    from middleware.log_rotation import get_logger
    access_logger = get_logger("app.access")
    g.start_time = _tz_now()
    access_logger.info(
        f"request_start method={request.method} path={request.path} ip={request.remote_addr or 'unknown'} "
        f"user_agent={request.user_agent.string[:100] if request.user_agent else 'unknown'}"
    )

@app.after_request
def log_request_complete(response: Response):
    """Log request completion details to access log."""
    from middleware.log_rotation import get_logger
    access_logger = get_logger("app.access")
    duration_ms = 0
    if hasattr(g, "start_time"):
        duration_ms = (_tz_now() - g.start_time).total_seconds() * 1000

    access_logger.info(
        f"request_complete method={request.method} path={request.path} status={response.status_code} "
        f"duration_ms={round(duration_ms, 2)}"
    )

    # Log errors to error log
    if response.status_code >= 500:
        error_logger = get_logger("app.error")
        error_logger.error(
            f"server_error method={request.method} path={request.path} status={response.status_code} "
            f"ip={request.remote_addr or 'unknown'}"
        )

    # Log auth events to security log
    if request.path.startswith("/api/v1/auth/"):
        security_logger = get_logger("app.security")
        if response.status_code == 401:
            security_logger.warning(
                f"auth_failure method={request.method} path={request.path} ip={request.remote_addr or 'unknown'} "
                f"status=401 reason=unauthorized"
            )
        elif response.status_code == 200 and request.method == "POST":
            security_logger.info(
                f"auth_success method={request.method} path={request.path} ip={request.remote_addr or 'unknown'} "
                f"status=200"
            )

    # Log secret access to audit log
    if request.path.startswith("/api/v1/") and request.method in ["GET", "PUT", "PATCH", "DELETE"]:
        if any(seg in request.path for seg in ["/keys/", "/bulk", "/rollback", "/templates/apply"]):
            audit_logger = get_logger("app.audit")
            audit_logger.info(
                f"secret_access method={request.method} path={request.path} "
                f"ip={request.remote_addr or 'unknown'} status={response.status_code}"
            )

    return response

# --- Web Dashboard Routes ---
@app.route("/")
def index():
    """Serve the beautiful index page."""
    index_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read(), 200, {"Content-Type": "text/html; charset=utf-8"}
    return """<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>SEM</title></head>
<body style="font-family:system-ui;max-width:800px;margin:50px auto;padding:20px;background:#0a0a0f;color:#e4e4e7">
<h1 style="color:#8b5cf6">🔐 Secure Environment Manager</h1>
<p>Backend is running. Open <a href="http://localhost:3000" style="color:#a78bfa">http://localhost:3000</a> for the web dashboard.</p>
<p><small>API: <code>GET /api/v1/{namespace}/{environment}</code> (requires Bearer token)</small></p>
</body></html>""", 200

@app.route("/healthz")
def health_check():
    """Health check endpoint for Docker and monitoring."""
    return jsonify({"status": "healthy"}), 200

# --- Error Handler ---
@app.errorhandler(Exception)
def handle_errors(err):
    code = getattr(err, "code", 500)
    description = getattr(err, "description", "Unexpected error")
    logger.exception("Unhandled error: %s", err)
    if wants_json_response():
        return jsonify({"error": description, "status": code}), code
    safe = html.escape(str(description))
    body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Error {code}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:24px;background:#0b0f19;color:#e4e4e7">
<h1 style="font-size:1.25rem">Error {code}</h1>
<p>{safe}</p>
<p><a href="{html.escape(settings.frontend_url)}" style="color:#a78bfa">Open web app</a></p>
</body></html>"""
    return body, code

# --- WebSocket Support (Production) ---
try:
    from websocket_server import init_websocket
    init_websocket(app)
    logger.info("WebSocket support enabled")
except ImportError as e:
    logger.warning(f"WebSocket support not available: {e}")
except Exception as e:
    logger.warning(f"WebSocket initialization failed: {e}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8070, debug=settings.debug, use_reloader=True)