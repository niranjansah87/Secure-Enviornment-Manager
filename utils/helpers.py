"""
Helper utilities for Secure Environment Manager.
Extracted from app.py for modular architecture.
"""
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, Tuple

from cryptography.fernet import Fernet, InvalidToken
from flask import request

from core.config import settings, logger, fernet, DATA_DIR, API_KEYS_FILE, DATA_LOCKS
from core.constants import SEGMENT_PATTERN, KEY_PATTERN


# --- Timezone-aware datetime ---


def _tz_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


# --- Segment Validation ---


def validate_segments(namespace: str, environment: str) -> Tuple[str, str]:
    """Validate namespace and environment segments against pattern."""
    if not SEGMENT_PATTERN.match(namespace):
        from flask import abort
        abort(404)
    if not SEGMENT_PATTERN.match(environment):
        from flask import abort
        abort(404)
    return namespace, environment


def namespaced_identifier(namespace: str, environment: str) -> str:
    """Create a combined namespace:environment identifier."""
    return f"{namespace}:{environment}"


def get_env_path(namespace: str, environment: str) -> str:
    """Get the full path to an environment file."""
    validate_segments(namespace, environment)
    return os.path.join(DATA_DIR, namespace, f"{environment}.enc")


def _lock_for(path: str) -> Lock:
    """Get a lock for the given file path."""
    return DATA_LOCKS[path]


# --- API Keys ---


def load_api_keys() -> Dict[str, str]:
    """Load API keys from the api_keys.json file."""
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


# --- Environment Listing ---


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


# --- Secret Storage Operations ---


def read_vars(namespace: str, environment: str) -> Dict[str, str]:
    """Read and decrypt variables for a namespace/environment."""
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
    """Write and encrypt variables for a namespace/environment."""
    path = get_env_path(namespace, environment)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sanitized = {k: str(v) for k, v in sorted(data.items()) if KEY_PATTERN.match(k)}
    json_data = json.dumps(sanitized, separators=(",", ":")).encode("utf-8")
    encrypted_data = fernet.encrypt(json_data)
    with _lock_for(path):
        with open(path, "wb") as handle:
            handle.write(encrypted_data)


# --- Metadata ---


def get_metadata(namespace: str, environment: str) -> Dict[str, Any]:
    """Get metadata about an environment file."""
    path = get_env_path(namespace, environment)
    if not os.path.exists(path):
        return {"last_modified": None, "variable_count": 0}
    stat = os.stat(path)
    return {
        "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
        "variable_count": len(read_vars(namespace, environment)),
    }


# --- Formatting ---


def format_timestamp(dt: datetime | None) -> str | None:
    """Format a datetime to UTC string."""
    if not dt:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def to_env_lines(data: Dict[str, str]) -> str:
    """Convert a dictionary to .env file format lines."""
    lines = []
    for key, value in sorted(data.items()):
        if not KEY_PATTERN.match(key):
            continue
        safe_value = value.replace("\n", "\\n")
        lines.append(f"{key}={safe_value}")
    return "\n".join(lines)


# --- Response Helpers ---


def wants_json_response() -> bool:
    """Check if the client prefers JSON response."""
    return request.path.startswith("/api/") or request.accept_mimetypes["application/json"] >= request.accept_mimetypes["text/html"]