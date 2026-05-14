# app.py - Secure Environment Manager Bootstrap
"""Thin Flask bootstrap that wires together the modular architecture."""
import html
import logging
import os
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Dict

from dotenv import load_dotenv
from flask import Flask, request, session, make_response, Response, jsonify
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

# --- Register Blueprints ---
app.register_blueprint(api_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(secret_bp)
app.register_blueprint(export_bp)
app.register_blueprint(redirect_bp)

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8070, debug=settings.debug, use_reloader=True)