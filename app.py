# app.py
import html
import json
import logging
import os
import re
import secrets
import hmac
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from functools import wraps
from threading import Lock
from typing import Dict, Tuple, Any

import yaml
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
from flask import (
    Flask,
    request,
    redirect,
    session,
    make_response,
    Response,
    jsonify,
    abort,
)

from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash

from audit_logger import audit_logger
from history_manager import HistoryManager
from analytics_service import analytics_service
from health_service import health_service
from prometheus_flask_exporter import PrometheusMetrics
from prometheus_client import Counter, CollectorRegistry
try:
    from prometheus_client import multiproc # type: ignore
except ImportError:
    multiproc = None

# --- Initial Setup & Configuration ---
load_dotenv()


class Settings:
    """Centralised runtime configuration with sane defaults."""
    flask_secret_key: str
    encryption_key: str
    dashboard_password: str
    data_dir: str
    api_keys_file: str
    session_timeout_minutes: int
    max_login_attempts: int
    lockout_minutes: int
    log_level: str
    content_security_policy: str
    session_cookie_secure: bool
    behind_proxy: bool
    export_filename: str
    debug: bool
    master_api_token: str | None
    cors_origins: list[str]
    frontend_url: str

    def __init__(self) -> None:
        self.flask_secret_key = str(os.getenv("FLASK_SECRET_KEY", ""))
        self.encryption_key = str(os.getenv("ENCRYPTION_KEY", ""))
        self.dashboard_password = str(os.getenv("DASHBOARD_PASSWORD", ""))

        if not self.flask_secret_key:
            raise RuntimeError("Missing FLASK_SECRET_KEY environment variable.")
        if not self.encryption_key:
            raise RuntimeError("Missing ENCRYPTION_KEY environment variable.")
        if not self.dashboard_password:
            raise RuntimeError("Missing DASHBOARD_PASSWORD environment variable.")

        self.data_dir = str(os.getenv("DATA_DIR", "data"))
        self.api_keys_file = str(os.getenv("API_KEYS_FILE", "api_keys.json"))
        self.session_timeout_minutes = int(os.getenv("SESSION_TIMEOUT_MINUTES", "60"))
        self.max_login_attempts = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
        self.lockout_minutes = int(os.getenv("LOCKOUT_MINUTES", "15"))
        self.log_level = str(os.getenv("LOG_LEVEL", "INFO")).upper()
        self.content_security_policy = str(os.getenv(
            "CONTENT_SECURITY_POLICY",
            "default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
            "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline';",
        ))
        self.session_cookie_secure = (
            str(os.getenv("SESSION_COOKIE_SECURE", "true")).lower() == "true"
        )
        self.behind_proxy = str(os.getenv("BEHIND_PROXY", "true")).lower() == "true"
        self.export_filename = str(os.getenv("EXPORT_FILENAME", "{namespace}-{environment}.env"))
        self.debug = str(os.getenv("FLASK_DEBUG", "false")).lower() == "true"
        self.master_api_token = os.getenv("MASTER_API_TOKEN")
        self.cors_origins = [
            o.strip()
            for o in str(os.getenv("CORS_ORIGINS", "http://localhost:3000")).split(",")
            if o.strip()
        ]
        self.frontend_url = str(os.getenv("FRONTEND_URL", "http://localhost:3000")).rstrip(
            "/"
        )


settings = Settings()


def spa_url(namespace: str, environment: str, *extra: str) -> str:
    """Deep-link paths into the Next.js web UI."""
    tail = "/".join([namespace, environment, *extra])
    return f"{settings.frontend_url}/{tail}"

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

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

# Load encryption key and initialize Fernet
fernet = Fernet(settings.encryption_key.encode())

# Load and hash the dashboard password
DASHBOARD_PASSWORD_HASH = generate_password_hash(settings.dashboard_password)

DATA_DIR = settings.data_dir
API_KEYS_FILE = settings.api_keys_file

# Initialize HistoryManager
history_manager = HistoryManager(settings.data_dir, str(settings.encryption_key))
SESSION_TIMEOUT = timedelta(minutes=settings.session_timeout_minutes)
LOCKOUT_DELTA = timedelta(minutes=settings.lockout_minutes)
MAX_LOGIN_ATTEMPTS = settings.max_login_attempts

LOGIN_ATTEMPTS: Dict[str, Dict[str, Any]] = {}
DATA_LOCKS: defaultdict[str, Lock] = defaultdict(Lock)

# --- Prometheus Monitoring Setup ---
def _get_metrics_registry():
    registry = CollectorRegistry()
    if os.getenv("PROMETHEUS_MULTIPROC_DIR") and multiproc:
        multiproc.MultiProcessCollector(registry)
    return registry

metrics = PrometheusMetrics(app, registry=_get_metrics_registry())

# Static information as metric
metrics.info("sem_app_info", "Secure Environment Manager Info", version="1.0.0")

# Custom counters for business logic
LOGIN_SUCCESS_COUNTER = Counter("sem_login_success_total", "Total successful logins")
LOGIN_FAILURE_COUNTER = Counter("sem_login_failure_total", "Total failed login attempts", ["reason"])
SECRET_UPDATE_COUNTER = Counter("sem_secret_updates_total", "Total secret modifications", ["namespace", "environment"])
SECRET_ACCESS_COUNTER = Counter("sem_secret_access_total", "Total secret reads/exports", ["namespace", "environment"])

SEGMENT_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
KEY_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")


# --- Helper Functions ---
def _tz_now() -> datetime:
    return datetime.now(timezone.utc)


def namespaced_identifier(namespace: str, environment: str) -> str:
    return f"{namespace}:{environment}"


def validate_segments(namespace: str, environment: str) -> Tuple[str, str]:
    if not SEGMENT_PATTERN.match(namespace):
        abort(404)
    if not SEGMENT_PATTERN.match(environment):
        abort(404)
    return namespace, environment


def get_env_path(namespace: str, environment: str) -> str:
    validate_segments(namespace, environment)
    return os.path.join(DATA_DIR, namespace, f"{environment}.enc")


def _lock_for(path: str) -> Lock:
    return DATA_LOCKS[path]


def load_api_keys() -> Dict[str, str]:
    if not os.path.exists(API_KEYS_FILE):
        return {}
    try:
        with open(API_KEYS_FILE, "r", encoding="utf-8") as handle:
            data = json.load(handle)
            if isinstance(data, dict):
                return {str(k): str(v) for k, v in data.items()}
    except json.JSONDecodeError as exc:
        logger.error("Unable to parse api_keys file: %s", exc)
    return {}


def list_all_environments() -> Dict[str, list[str]]:
    """List all available environments grouped by namespace."""
    envs = defaultdict(list)
    if not os.path.exists(DATA_DIR):
        return envs
        
    for ns_dir in os.listdir(DATA_DIR):
        ns_path = os.path.join(DATA_DIR, ns_dir)
        if os.path.isdir(ns_path):
            for filename in os.listdir(ns_path):
                if filename.endswith(".enc"):
                    env_name = filename[:-4]
                    envs[ns_dir].append(env_name)
    return envs


def read_vars(namespace: str, environment: str) -> Dict[str, str]:
    path = get_env_path(namespace, environment)
    if not os.path.exists(path):
        return {}
    with _lock_for(path):
        with open(path, "rb") as handle:
            encrypted_data = handle.read()
    try:
        decrypted_data = fernet.decrypt(encrypted_data)
        payload = json.loads(decrypted_data.decode("utf-8"))
        if isinstance(payload, dict):
            return {str(k): str(v) for k, v in payload.items()}
    except InvalidToken:
        logger.exception("Decryption failure while reading environment variables")
        return {"error": "Decryption failed. Invalid key or corrupted data."}
    except json.JSONDecodeError:
        logger.exception("Invalid JSON payload while reading environment variables")
    return {}


def write_vars(namespace: str, environment: str, data: Dict[str, str]) -> None:
    path = get_env_path(namespace, environment)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sanitized = {k: str(v) for k, v in sorted(data.items()) if KEY_PATTERN.match(k)}
    json_data = json.dumps(sanitized, separators=(",", ":")).encode("utf-8")
    encrypted_data = fernet.encrypt(json_data)
    with _lock_for(path):
        with open(path, "wb") as handle:
            handle.write(encrypted_data)


def get_metadata(namespace: str, environment: str) -> Dict[str, Any]:
    path = get_env_path(namespace, environment)
    if not os.path.exists(path):
        return {"last_modified": None, "variable_count": 0}
    stat = os.stat(path)
    return {
        "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
        "variable_count": len(read_vars(namespace, environment)),
    }


def session_key_for(namespace: str, environment: str) -> str:
    return f"{namespace}:{environment}:authed"


def current_identity(namespace: str, environment: str) -> Dict[str, Any]:
    session_key = session_key_for(namespace, environment)
    return session.get(session_key, {})


def mark_authenticated(namespace: str, environment: str) -> None:
    session_key = session_key_for(namespace, environment)
    session[session_key] = {"ts": _tz_now().isoformat()}
    session.permanent = True
    session["last_active"] = _tz_now().isoformat()


def clear_auth(namespace: str, environment: str) -> None:
    session.pop(session_key_for(namespace, environment), None)


def record_failed_attempt(identifier: str) -> None:
    entry = LOGIN_ATTEMPTS.setdefault(identifier, {"fails": 0, "locked_until": None})
    entry["fails"] += 1
    if entry["fails"] >= MAX_LOGIN_ATTEMPTS:
        entry["locked_until"] = _tz_now() + LOCKOUT_DELTA
        logger.warning("Locking %s until %s", identifier, entry["locked_until"])


def reset_attempts(identifier: str) -> None:
    if identifier in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS.pop(identifier, None)


def is_locked(identifier: str) -> Tuple[bool, datetime | None]:
    entry = LOGIN_ATTEMPTS.get(identifier)
    if not entry:
        return False, None
    locked_until = entry.get("locked_until")
    if locked_until and locked_until > _tz_now():
        return True, locked_until
    reset_attempts(identifier)
    return False, None


def ensure_authenticated(fn):
    @wraps(fn)
    def wrapper(namespace: str, environment: str, *args, **kwargs):
        validate_segments(namespace, environment)
        record = current_identity(namespace, environment)
        last_active = session.get("last_active")
        if last_active:
            try:
                last_dt = datetime.fromisoformat(last_active)
                if _tz_now() - last_dt > SESSION_TIMEOUT:
                    clear_auth(namespace, environment)
            except ValueError:
                clear_auth(namespace, environment)

        if not record:
            if request.method in ("GET", "HEAD"):
                return redirect(spa_url(namespace, environment))
            return Response(
                "Authentication required. POST password to /{}/{} first (legacy CLI)."
                .format(namespace, environment),
                401,
                mimetype="text/plain",
            )
        session["last_active"] = _tz_now().isoformat()
        return fn(namespace, environment, *args, **kwargs)

    return wrapper


def generate_csrf_token() -> str:
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def validate_csrf() -> None:
    token = session.get("csrf_token")
    submitted = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
    if not token or not submitted or not hmac.compare_digest(token, submitted):
        abort(400, description="CSRF token missing or invalid")


def format_timestamp(dt: datetime | None) -> str | None:
    if not dt:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def to_env_lines(data: Dict[str, str]) -> str:
    lines = []
    for key, value in sorted(data.items()):
        if not KEY_PATTERN.match(key):
            continue
        safe_value = value.replace("\n", "\\n")
        lines.append(f"{key}={safe_value}")
    return "\n".join(lines)


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
        response.headers.setdefault(
            "Access-Control-Allow-Headers", "Authorization, Content-Type"
        )
        response.headers.setdefault(
            "Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
    return response


@app.before_request
def api_cors_preflight() -> Response | None:
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


# --- Web Dashboard Routes ---
@app.route("/")
def index():
    """Root route - shows usage information."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Env Manager - Usage</title>
        <style>
            body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
            code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
            .example { background: #f9f9f9; padding: 15px; border-left: 3px solid #007acc; margin: 10px 0; }
        </style>
    </head>
    <body>
        <h1>🔐 Environment Variable Manager</h1>
        <p>Access your environment variables using the format:</p>
        <div class="example">
            <code>/&lt;namespace&gt;/&lt;environment&gt;</code>
        </div>
        <h3>Examples:</h3>
        <ul>
            <li><code>/production/main</code> - Production environment for main namespace</li>
            <li><code>/staging/dev</code> - Staging environment for dev namespace</li>
            <li><code>/myapp/prod</code> - Production environment for myapp namespace</li>
        </ul>
        <p><strong>Note:</strong> Use lowercase alphanumeric characters, dots, dashes, or underscores for namespace and environment names.</p>
        <hr>
        <p>The primary UI is the <strong>Next.js</strong> app (default <code>http://localhost:3000</code>). Visiting <code>/&lt;namespace&gt;/&lt;environment&gt;</code> on this API port redirects there.</p>
        <p><small>API: <code>GET /api/v1/&lt;namespace&gt;/&lt;environment&gt;</code> (requires Bearer token)</small></p>
        <p><small>Health: <code>GET /healthz</code></small></p>
    </body>
    </html>
    """, 200


@app.route("/healthz")
def health_check():
    """Health check endpoint for Docker and monitoring."""
    return jsonify({"status": "healthy"}), 200


@app.route("/<namespace>/<environment>", methods=["GET", "POST"])
def dashboard(namespace: str, environment: str):
    """Browser UI lives on Next.js; this route redirects or handles legacy password POST (CLI)."""
    validate_segments(namespace, environment)
    session_key = session_key_for(namespace, environment)
    identifier = f"{request.remote_addr}:{session_key}"

    if request.method == "POST" and not session.get(session_key):
        locked, until = is_locked(identifier)
        if locked:
            return Response(
                f"Too many attempts. Try again after {format_timestamp(until)}.",
                429,
                mimetype="text/plain",
            )

        password = request.form.get("password", "")
        if password and check_password_hash(DASHBOARD_PASSWORD_HASH, password):
            LOGIN_SUCCESS_COUNTER.inc()
            mark_authenticated(namespace, environment)
            reset_attempts(identifier)
            try:
                session.modified = True
            except Exception:
                pass
            logger.info(
                "Authentication successful for %s/%s from %s",
                namespace,
                environment,
                request.remote_addr,
            )
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


@app.post("/add/<namespace>/<environment>")
@ensure_authenticated
def add_variable(namespace: str, environment: str):
    key = request.form.get("key", "").strip()
    value = request.form.get("value", "").strip()

    if not key:
        return redirect(spa_url(namespace, environment))

    # Check if update or create
    current_vars = read_vars(namespace, environment)
    is_update = key in current_vars
    old_value = current_vars.get(key, "")

    variables = read_vars(namespace, environment)
    variables[key] = value
    write_vars(namespace, environment, variables)
    
    SECRET_UPDATE_COUNTER.labels(namespace, environment).inc()
    
    # Save History Snapshot
    history_manager.save_snapshot(
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

    return redirect(spa_url(namespace, environment))


@app.post("/delete/<namespace>/<environment>/<key>")
@ensure_authenticated
def delete_variable(namespace: str, environment: str, key: str):
    # Get value for log before deleting
    current_vars = read_vars(namespace, environment)
    value = current_vars.get(key, "")
    
    variables = read_vars(namespace, environment)
    if key in variables:
        variables.pop(key)
        write_vars(namespace, environment, variables)
        
        # Save History Snapshot
        history_manager.save_snapshot(
            namespace, environment, variables, "session", 
            "DELETE", f"Deleted variable '{key}'"
        )
    
    # Audit Log
    audit_logger.log_variable_delete(
        namespace, environment, key, value, 
        "session", request.remote_addr or "unknown"
    )
    
    return redirect(spa_url(namespace, environment))


@app.post("/bulk/<namespace>/<environment>")
@ensure_authenticated
def bulk_replace(namespace: str, environment: str):
    """Replace the entire environment with a pasted .env payload."""
    validate_csrf()
    payload = request.form.get("bulk_payload", "").strip()
    if not payload:
        return redirect(spa_url(namespace, environment))
    result: Dict[str, str] = {}
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
        write_vars(namespace, environment, result)
        
        # Save History Snapshot
        history_manager.save_snapshot(
            namespace, environment, result, "session", 
            "BULK_REPLACE", f"Bulk replaced {len(result)} variables"
        )

    return redirect(spa_url(namespace, environment))


@app.get("/download/<namespace>/<environment>")
@ensure_authenticated
def download_env(namespace: str, environment: str):
    # Audit Log
    audit_logger.log_export(
        namespace, environment, "env", "session", request.remote_addr or "unknown"
    )
    
    SECRET_ACCESS_COUNTER.labels(namespace, environment).inc()
    
    variables = read_vars(namespace, environment)
    content = to_env_lines(variables)
    filename = settings.export_filename.format(namespace=namespace, environment=environment)
    response = make_response(content)
    response.headers.set("Content-Type", "text/plain; charset=utf-8")
    response.headers.set("Content-Disposition", f"attachment; filename={filename}")
    return response


@app.get("/export/<namespace>/<environment>/json")
@ensure_authenticated
def export_json(namespace: str, environment: str):
    """Export variables as JSON"""
    # Audit Log
    audit_logger.log_export(
        namespace, environment, "json", "session", request.remote_addr or "unknown"
    )
    
    variables = read_vars(namespace, environment)
    filename = f"{namespace}-{environment}.json"
    response = make_response(json.dumps(variables, indent=2))
    response.headers.set("Content-Type", "application/json; charset=utf-8")
    response.headers.set("Content-Disposition", f"attachment; filename={filename}")
    return response


@app.get("/export/<namespace>/<environment>/yaml")
@ensure_authenticated
def export_yaml(namespace: str, environment: str):
    """Export variables as YAML"""
    # Audit Log
    audit_logger.log_export(
        namespace, environment, "yaml", "session", request.remote_addr or "unknown"
    )
    
    variables = read_vars(namespace, environment)
    filename = f"{namespace}-{environment}.yaml"
    content = yaml.dump(variables, default_flow_style=False, allow_unicode=True)
    response = make_response(content)
    response.headers.set("Content-Type", "application/x-yaml; charset=utf-8")
    response.headers.set("Content-Disposition", f"attachment; filename={filename}")
    return response


@app.route("/logout/<namespace>/<environment>")
def logout(namespace: str, environment: str):
    # Audit Log
    audit_logger.log_logout(
        namespace, environment, "session", request.remote_addr or "unknown"
    )
    
    clear_auth(namespace, environment)
    return redirect(spa_url(namespace, environment))


# --- API Route ---
def require_api_auth(namespace: str, token: str | None) -> bool:
    if not token:
        return False
    api_keys = load_api_keys()
    stored = api_keys.get(namespace)
    if not stored:
        return False
    return hmac.compare_digest(stored, token)


def extract_bearer_token() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def api_auth_ok(namespace: str, token: str | None) -> bool:
    if not token:
        return False
    master = settings.master_api_token
    if master and hmac.compare_digest(master, token):
        return True
    if check_password_hash(DASHBOARD_PASSWORD_HASH, token):
        return True
    return require_api_auth(namespace, token)


def namespaces_visible_to_token(token: str | None) -> list[str]:
    if not token:
        return []
    master = settings.master_api_token
    if master and hmac.compare_digest(master, token):
        return list(list_all_environments().keys())
    if check_password_hash(DASHBOARD_PASSWORD_HASH, token):
        return list(list_all_environments().keys())
    return [
        ns
        for ns, key in load_api_keys().items()
        if key and hmac.compare_digest(key, token)
    ]


def identify_token(token: str | None) -> str:
    if not token:
        return "anonymous"
    master = settings.master_api_token
    if master and hmac.compare_digest(master, token):
        return "master_token"
    if check_password_hash(DASHBOARD_PASSWORD_HASH, token):
        return "dashboard_password"
    for ns, key in load_api_keys().items():
        if key and hmac.compare_digest(key, token):
            return f"api_key:{ns}"
    return "unknown_token"


def _recent_audit_entries(visible_namespaces: set[str], limit: int = 15) -> list[Dict[str, Any]]:
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


@app.get("/api/v1/meta/environments")
def api_meta_environments():
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    visible = namespaces_visible_to_token(token)
    if not visible:
        token_name = identify_token(token)
        audit_logger.log_login_failure("system", "global", request.remote_addr or "unknown", reason=f"invalid_or_forbidden_token:{token_name}")
        return jsonify({"error": "Invalid API token"}), 403
    
    token_name = identify_token(token)
    audit_logger.log_login_success("system", "global", token_name, request.remote_addr or "unknown")
    
    all_envs = list_all_environments()
    result = {ns: all_envs.get(ns, []) for ns in visible if ns in all_envs}
    return jsonify({"environments": result})


@app.get("/api/v1/meta/stats")
def api_meta_stats():
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    visible = set(namespaces_visible_to_token(token))
    if not visible:
        return jsonify({"error": "Invalid API token"}), 403
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


@app.get("/api/v1/meta/analytics")
def api_meta_analytics():
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing"}), 401
    visible = set(namespaces_visible_to_token(token))
    if not visible:
        return jsonify({"error": "Invalid API token"}), 403
        
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


@app.get("/api/v1/meta/health")
def api_meta_health():
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing"}), 401
    # Only dashboard password or master token can see full health
    master = settings.master_api_token
    is_master = master and hmac.compare_digest(master, token)
    is_dashboard = check_password_hash(DASHBOARD_PASSWORD_HASH, token)
    
    if not (is_master or is_dashboard):
        return jsonify({"error": "Forbidden: Requires administrative privileges"}), 403
        
    return jsonify(health_service.get_system_health())


@app.get("/api/v1/meta/logins")
def api_meta_logins():
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing"}), 401
    visible = set(namespaces_visible_to_token(token))
    if not visible:
        return jsonify({"error": "Invalid API token"}), 403
        
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
    for entry in recent:
        if entry.get("action") in ["LOGIN_SUCCESS", "LOGIN_FAILURE"]:
            logins.append(entry)
            if len(logins) >= limit:
                break
                
    return jsonify({"logins": logins})

@app.route("/api/v1/<namespace>/<environment>", methods=["GET", "PUT", "PATCH"])
def api_environment(namespace: str, environment: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403

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
        history_manager.save_snapshot(
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
    history_manager.save_snapshot(
        namespace,
        environment,
        existing,
        "api",
        "UPDATE",
        f"API PATCH updated {len(filtered)} variables",
    )
    return jsonify({"status": "updated", "count": len(filtered)})


@app.get("/api/v1/<namespace>/<environment>/meta")
def api_environment_meta(namespace: str, environment: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403
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


@app.delete("/api/v1/<namespace>/<environment>/keys/<key>")
def api_delete_key(namespace: str, environment: str, key: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403
    if not KEY_PATTERN.match(key):
        return jsonify({"error": "Invalid key name"}), 400
    variables = read_vars(namespace, environment)
    if "error" in variables:
        return jsonify(variables), 500
    if key not in variables:
        return jsonify({"error": "Key not found"}), 404
    value = variables.pop(key)
    write_vars(namespace, environment, variables)
    history_manager.save_snapshot(
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


@app.post("/api/v1/<namespace>/<environment>/bulk")
def api_bulk_replace(namespace: str, environment: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403
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
    write_vars(namespace, environment, result)
    history_manager.save_snapshot(
        namespace,
        environment,
        result,
        "api",
        "BULK_REPLACE",
        f"API bulk replaced {len(result)} variables",
    )
    audit_logger.log_bulk_replace(
        namespace, environment, len(result), "api", request.remote_addr or ""
    )
    return jsonify({"status": "replaced", "count": len(result)})


@app.get("/api/v1/<namespace>/<environment>/history")
def api_history(namespace: str, environment: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403
    history = history_manager.get_history(namespace, environment, limit=80)
    return jsonify({"history": history})


@app.get("/api/v1/<namespace>/<environment>/audit")
def api_audit(namespace: str, environment: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403
    limit = min(int(request.args.get("limit", "100")), 500)
    logs = audit_logger.get_logs(
        namespace=namespace, environment=environment, limit=limit
    )
    return jsonify({"logs": logs})


@app.get("/api/v1/templates")
def api_templates_list():
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not namespaces_visible_to_token(token):
        return jsonify({"error": "Invalid API token"}), 403
    templates_path = os.path.join(os.path.dirname(__file__), "templates_config.json")
    if not os.path.exists(templates_path):
        return jsonify({"templates": {}})
    with open(templates_path, "r", encoding="utf-8") as handle:
        templates = json.load(handle)
    return jsonify({"templates": templates if isinstance(templates, dict) else {}})


@app.post("/api/v1/<namespace>/<environment>/templates/apply")
def api_templates_apply(namespace: str, environment: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON object required"}), 400
    template_key = str(body.get("template_key", "")).strip()
    templates_path = os.path.join(os.path.dirname(__file__), "templates_config.json")
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
    history_manager.save_snapshot(
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


@app.post("/api/v1/<namespace>/<environment>/rollback")
def api_rollback(namespace: str, environment: str):
    validate_segments(namespace, environment)
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    if not api_auth_ok(namespace, token):
        return jsonify({"error": "Invalid API Key for this namespace"}), 403
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON object required"}), 400
    snapshot_id = str(body.get("snapshot_id", "")).strip()
    if not snapshot_id:
        return jsonify({"error": "snapshot_id required"}), 400
    snapshot = history_manager.get_snapshot(namespace, environment, snapshot_id)
    if not snapshot:
        return jsonify({"error": "Snapshot not found"}), 404
    write_vars(namespace, environment, snapshot["variables"])
    history_manager.save_snapshot(
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


@app.get("/history/<namespace>/<environment>")
@ensure_authenticated
def view_history(namespace: str, environment: str):
    """Legacy path: history UI is on Next.js."""
    return redirect(spa_url(namespace, environment, "history"))


@app.get("/compare/<namespace>/<environment>/<snapshot_id>")
@ensure_authenticated
def compare_version(namespace: str, environment: str, snapshot_id: str):
    """Diff UI removed with Jinja; use History on the Next.js app."""
    del snapshot_id  # legacy URL segment; diff is viewed from History in the SPA
    return redirect(spa_url(namespace, environment, "history"))


@app.post("/rollback/<namespace>/<environment>/<snapshot_id>")
@ensure_authenticated
def rollback_version(namespace: str, environment: str, snapshot_id: str):
    """Rollback to a specific snapshot"""
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


@app.route("/compare-environments/<namespace>/<environment>", methods=["GET", "POST"])
@ensure_authenticated
def compare_environments(namespace: str, environment: str):
    """Legacy path: compare UI is on Next.js (/compare)."""
    return redirect(spa_url(namespace, environment, "compare"))





@app.get("/templates/<namespace>/<environment>")
@ensure_authenticated
def view_templates(namespace: str, environment: str):
    """Legacy path: templates UI is on Next.js."""
    return redirect(spa_url(namespace, environment, "templates"))


@app.post("/templates/<namespace>/<environment>/apply")
@ensure_authenticated
def apply_template(namespace: str, environment: str):
    """Apply a template to the current environment"""
    template_key = request.form.get("template_key")
    
    templates_path = os.path.join(os.path.dirname(__file__), "templates_config.json")
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
        
    # Only add if not exists (or overwrite? usually templates are for bootstrapping, so maybe overwrite or skip existing?)
    # Let's overwrite for now, or maybe only if not exists?
    # Implementation plan said "Merges template". Let's use update (overwrite).
    current_vars.update(new_vars)
    
    write_vars(namespace, environment, current_vars)
    
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


@app.get("/audit-logs/<namespace>/<environment>")
@ensure_authenticated
def view_audit_logs(namespace: str, environment: str):
    """Legacy path: audit UI is on Next.js."""
    return redirect(spa_url(namespace, environment, "audit"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8070, debug=settings.debug, use_reloader=True)


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



