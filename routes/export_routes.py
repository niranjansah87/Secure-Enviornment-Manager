"""
Export routes for Secure Environment Manager.
Handles downloading environment files in various formats.
"""
from flask import Blueprint, Response, make_response, request
import json
import yaml

from core.auth import ensure_authenticated
from core.step_up_auth import require_step_up_auth
from core.config import settings

from utils.helpers import read_vars, to_env_lines
from audit_logger import audit_logger


export_bp = Blueprint("export", __name__)


@export_bp.route("/download/<namespace>/<environment>")
@ensure_authenticated
@require_step_up_auth
def download_env(namespace: str, environment: str):
    """Download environment as .env file."""
    # Audit Log
    audit_logger.log_export(
        namespace, environment, "env", "session", request.remote_addr or "unknown"
    )

    variables = read_vars(namespace, environment)
    content = to_env_lines(variables)
    filename = settings.export_filename.format(namespace=namespace, environment=environment)
    response = make_response(content)
    response.headers.set("Content-Type", "text/plain; charset=utf-8")
    response.headers.set("Content-Disposition", f"attachment; filename={filename}")
    return response


@export_bp.route("/export/<namespace>/<environment>/json")
@ensure_authenticated
@require_step_up_auth
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


@export_bp.route("/export/<namespace>/<environment>/yaml")
@ensure_authenticated
@require_step_up_auth
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