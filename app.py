# app.py
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
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash,
    make_response,
    Response,
    jsonify,
    abort,
    send_file,
)

from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash

from audit_logger import audit_logger
from history_manager import HistoryManager

# --- Initial Setup & Configuration ---
load_dotenv()


class Settings:
    """Centralised runtime configuration with sane defaults."""

    def __init__(self) -> None:
        self.flask_secret_key = os.getenv("FLASK_SECRET_KEY")
        self.encryption_key = os.getenv("ENCRYPTION_KEY")
        self.dashboard_password = os.getenv("DASHBOARD_PASSWORD")

        if not self.flask_secret_key:
            raise RuntimeError("Missing FLASK_SECRET_KEY environment variable.")
        if not self.encryption_key:
            raise RuntimeError("Missing ENCRYPTION_KEY environment variable.")
        if not self.dashboard_password:
            raise RuntimeError("Missing DASHBOARD_PASSWORD environment variable.")

        self.data_dir = os.getenv("DATA_DIR", "data")
        self.api_keys_file = os.getenv("API_KEYS_FILE", "api_keys.json")
        self.session_timeout_minutes = int(os.getenv("SESSION_TIMEOUT_MINUTES", "60"))
        self.max_login_attempts = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
        self.lockout_minutes = int(os.getenv("LOCKOUT_MINUTES", "15"))
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.content_security_policy = os.getenv(
            "CONTENT_SECURITY_POLICY",
            "default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
            "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline';",
        )
        self.session_cookie_secure = (
            os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
        )
        self.behind_proxy = os.getenv("BEHIND_PROXY", "true").lower() == "true"
        self.export_filename = os.getenv("EXPORT_FILENAME", "{namespace}-{environment}.env")
        self.debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"


settings = Settings()

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
        logger.exception("Decryption failure for %s/%s", namespace, environment)
        return {"error": "Decryption failed. Invalid key or corrupted data."}
    except json.JSONDecodeError:
        logger.exception("Invalid JSON payload for %s/%s", namespace, environment)
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
            return redirect(
                url_for("dashboard", namespace=namespace, environment=environment)
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
    return response


@app.context_processor
def inject_utilities():
    return {"csrf_token": generate_csrf_token, "format_timestamp": format_timestamp}


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
        <p><small>API: <code>GET /api/v1/&lt;namespace&gt;/&lt;environment&gt;</code> (requires Bearer token)</small></p>
        <p><small>Health: <code>GET /healthz</code></small></p>
    </body>
    </html>
    """, 200


@app.route("/<namespace>/<environment>", methods=["GET", "POST"])
def dashboard(namespace: str, environment: str):
    validate_segments(namespace, environment)
    session_key = session_key_for(namespace, environment)
    identifier = f"{request.remote_addr}:{session_key}"

    if request.method == "POST" and not session.get(session_key):
        locked, until = is_locked(identifier)
        if locked:
            flash(f"Too many attempts. Try again after {format_timestamp(until)}.")
            return render_template(
                "login.html", namespace=namespace, environment=environment
            )

        password = request.form.get("password", "")
        if password and check_password_hash(DASHBOARD_PASSWORD_HASH, password):
            mark_authenticated(namespace, environment)
            reset_attempts(identifier)
            # Ensure session is saved before redirect
            try:
                session.modified = True
            except Exception:
                pass
            flash("Unlocked successfully.")
            logger.info("Authentication successful for %s/%s from %s", namespace, environment, request.remote_addr)
            return redirect(
                url_for("dashboard", namespace=namespace, environment=environment)
            )
        record_failed_attempt(identifier)
        remaining = max(0, MAX_LOGIN_ATTEMPTS - LOGIN_ATTEMPTS[identifier]["fails"])
        flash(f"Invalid password. {remaining} attempts remaining.")

    # Check if authenticated - session_key contains a dict if authenticated
    auth_data = session.get(session_key)
    if not auth_data:
        logger.debug("No session found for %s/%s, showing login", namespace, environment)
        return render_template("login.html", namespace=namespace, environment=environment)
    
    logger.debug("Session found for %s/%s, showing dashboard", namespace, environment)

    variables = read_vars(namespace, environment)
    metadata = get_metadata(namespace, environment)
    stats = {
        "total": len(variables),
        "keys": sorted(variables.keys()),
        "last_modified": metadata.get("last_modified"),
    }
    return render_template(
        "dashboard.html",
        namespace=namespace,
        environment=environment,
        variables=variables,
        stats=stats,
    )


@app.post("/add/<namespace>/<environment>")
@ensure_authenticated
def add_variable(namespace: str, environment: str):
    key = request.form.get("key", "").strip()
    value = request.form.get("value", "").strip()

    if not key:
        flash("Key is required.", "error")
        return redirect(url_for("dashboard", namespace=namespace, environment=environment))

    # Check if update or create
    current_vars = read_vars(namespace, environment)
    is_update = key in current_vars
    old_value = current_vars.get(key, "")

    variables = read_vars(namespace, environment)
    variables[key] = value
    write_vars(namespace, environment, variables)
    
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
            "session", request.remote_addr
        )
        flash(f"Updated variable '{key}'.")
    else:
        audit_logger.log_variable_create(
            namespace, environment, key, value, 
            "session", request.remote_addr
        )
        flash(f"Added variable '{key}'.")
        
    return redirect(url_for("dashboard", namespace=namespace, environment=environment))


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
        "session", request.remote_addr
    )
    
    flash(f"Deleted variable '{key}'.")
    return redirect(url_for("dashboard", namespace=namespace, environment=environment))


@app.post("/bulk/<namespace>/<environment>")
@ensure_authenticated
def bulk_replace(namespace: str, environment: str):
    """Replace the entire environment with a pasted .env payload."""
    validate_csrf()
    payload = request.form.get("bulk_payload", "").strip()
    if not payload:
        flash("Paste at least one line.")
        return redirect(url_for("dashboard", namespace=namespace, environment=environment))
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
        flash("No valid key/value pairs detected.")
    else:
        write_vars(namespace, environment, result)
        
        # Save History Snapshot
        history_manager.save_snapshot(
            namespace, environment, result, "session", 
            "BULK_REPLACE", f"Bulk replaced {len(result)} variables"
        )

        flash(f"Replaced environment with {len(result)} variables.")
    return redirect(url_for("dashboard", namespace=namespace, environment=environment))


@app.get("/download/<namespace>/<environment>")
@ensure_authenticated
def download_env(namespace: str, environment: str):
    # Audit Log
    audit_logger.log_export(
        namespace, environment, "env", "session", request.remote_addr
    )
    
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
        namespace, environment, "json", "session", request.remote_addr
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
        namespace, environment, "yaml", "session", request.remote_addr
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
        namespace, environment, "session", request.remote_addr
    )
    
    clear_auth(namespace, environment)
    return redirect(url_for("dashboard", namespace=namespace, environment=environment))


# --- API Route ---
def require_api_auth(namespace: str, token: str | None) -> bool:
    if not token:
        return False
    api_keys = load_api_keys()
    stored = api_keys.get(namespace)
    if not stored:
        return False
    return hmac.compare_digest(stored, token)


@app.route("/api/v1/<namespace>/<environment>", methods=["GET", "PUT", "PATCH"])
def api_environment(namespace: str, environment: str):
    validate_segments(namespace, environment)
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Authorization header missing or invalid"}), 401
    token = auth_header.split(" ", 1)[1]
    if not require_api_auth(namespace, token):
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
        return jsonify({"status": "replaced", "count": len(filtered)})

    existing = read_vars(namespace, environment)
    existing.update(filtered)
    write_vars(namespace, environment, existing)
    return jsonify({"status": "updated", "count": len(filtered)})


@app.get("/history/<namespace>/<environment>")
@ensure_authenticated
def view_history(namespace: str, environment: str):
    """View variable history"""
    history = history_manager.get_history(namespace, environment)
    return render_template(
        "history.html",
        namespace=namespace,
        environment=environment,
        history=history,
        year=datetime.now().year,
    )


@app.get("/compare/<namespace>/<environment>/<snapshot_id>")
@ensure_authenticated
def compare_version(namespace: str, environment: str, snapshot_id: str):
    """Compare current version with a snapshot"""
    snapshot = history_manager.get_snapshot(namespace, environment, snapshot_id)
    if not snapshot:
        flash("Snapshot not found.", "error")
        return redirect(url_for("view_history", namespace=namespace, environment=environment))
    
    current_vars = read_vars(namespace, environment)
    snapshot_vars = snapshot["variables"]
    
    return render_template(
        "diff.html",
        namespace=namespace,
        environment=environment,
        snapshot=snapshot,
        current_vars=current_vars,
        snapshot_vars=snapshot_vars,
        year=datetime.now().year,
    )


@app.post("/rollback/<namespace>/<environment>/<snapshot_id>")
@ensure_authenticated
def rollback_version(namespace: str, environment: str, snapshot_id: str):
    """Rollback to a specific snapshot"""
    snapshot = history_manager.get_snapshot(namespace, environment, snapshot_id)
    if not snapshot:
        flash("Snapshot not found.", "error")
        return redirect(url_for("view_history", namespace=namespace, environment=environment))
    
    # Restore variables
    write_vars(namespace, environment, snapshot["variables"])
    
    # Log the rollback
    history_manager.save_snapshot(
        namespace, environment, snapshot["variables"], "session", 
        "ROLLBACK", f"Rolled back to version from {snapshot['timestamp']}"
    )
    
    audit_logger.log_variable_update(
        namespace, environment, "ALL", "VARIOUS", "ROLLBACK", 
        "session", request.remote_addr
    )
    
    flash(f"Rolled back to version from {snapshot['timestamp']}.")
    return redirect(url_for("dashboard", namespace=namespace, environment=environment))
    flash(f"Rolled back to version from {snapshot['timestamp']}.")
    return redirect(url_for("dashboard", namespace=namespace, environment=environment))


@app.route("/compare-environments/<namespace>/<environment>", methods=["GET", "POST"])
@ensure_authenticated
def compare_environments(namespace: str, environment: str):
    """Compare two environments side-by-side"""
    all_envs = list_all_environments()
    
    if request.method == "POST":
        target_ns = request.form.get("target_namespace")
        target_env = request.form.get("target_environment")
        
        if not target_ns or not target_env:
            flash("Please select a target environment.", "error")
            return redirect(request.url)
            
        source_vars = read_vars(namespace, environment)
        target_vars = read_vars(target_ns, target_env)
        
        if "error" in target_vars:
            flash(f"Could not read target environment: {target_vars['error']}", "error")
            return redirect(request.url)
            
        return render_template(
            "compare_envs.html",
            namespace=namespace,
            environment=environment,
            all_envs=all_envs,
            target_ns=target_ns,
            target_env=target_env,
            source_vars=source_vars,
            target_vars=target_vars,
            year=datetime.now().year,
        )
        
    return render_template(
        "compare_envs.html",
        namespace=namespace,
        environment=environment,
        all_envs=all_envs,
        year=datetime.now().year,
    )





@app.get("/templates/<namespace>/<environment>")
@ensure_authenticated
def view_templates(namespace: str, environment: str):
    """View available variable templates"""
    templates_path = os.path.join(os.path.dirname(__file__), "templates_config.json")
    if not os.path.exists(templates_path):
        templates = {}
    else:
        with open(templates_path, "r") as f:
            templates = json.load(f)
            
    return render_template(
        "templates.html",
        namespace=namespace,
        environment=environment,
        templates=templates,
        year=datetime.now().year,
    )


@app.post("/templates/<namespace>/<environment>/apply")
@ensure_authenticated
def apply_template(namespace: str, environment: str):
    """Apply a template to the current environment"""
    template_key = request.form.get("template_key")
    
    templates_path = os.path.join(os.path.dirname(__file__), "templates_config.json")
    if not os.path.exists(templates_path):
        flash("Templates configuration not found.", "error")
        return redirect(url_for("view_templates", namespace=namespace, environment=environment))
        
    with open(templates_path, "r") as f:
        templates = json.load(f)
        
    if template_key not in templates:
        flash("Invalid template selected.", "error")
        return redirect(url_for("view_templates", namespace=namespace, environment=environment))
        
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
        template_key, 
        namespace, 
        environment, 
        request.remote_addr, 
        {"template_name": template["name"], "vars_count": len(new_vars)}
    )
    
    flash(f"Successfully applied template: {template['name']}", "success")
    return redirect(url_for("dashboard", namespace=namespace, environment=environment))


@app.get("/audit-logs/<namespace>/<environment>")
@ensure_authenticated
def view_audit_logs(namespace: str, environment: str):
    """View audit logs"""
    logs = audit_logger.get_logs(namespace=namespace, environment=environment)
    return render_template(
        "audit_logs.html",
        namespace=namespace,
        environment=environment,
        logs=logs,
        year=datetime.now().year,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8070, debug=settings.debug, use_reloader=True)


@app.get("/healthz")
def healthcheck():
    return jsonify({"status": "ok", "timestamp": _tz_now().isoformat()})


@app.errorhandler(Exception)
def handle_errors(err):
    code = getattr(err, "code", 500)
    description = getattr(err, "description", "Unexpected error")
    logger.exception("Unhandled error: %s", err)
    if wants_json_response():
        return jsonify({"error": description, "status": code}), code
    return (
        render_template("error.html", message=description, status_code=code),
        code,
    )



