"""
Secret storage abstraction layer for Secure Environment Manager.
Provides a clean interface for storing and retrieving secrets.
"""
import os
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet, InvalidToken

from core.config import settings, logger, fernet, DATA_DIR, DATA_LOCKS
from core.constants import KEY_PATTERN
from utils.helpers import validate_segments, get_env_path, _lock_for


class SecretsStore:
    """Abstraction layer for secret storage operations.

    Provides a clean interface for reading, writing, and managing
    encrypted environment variables.
    """

    def __init__(self, data_dir: str = None, fernet_cipher: Fernet = None):
        """Initialize the secrets store.

        Args:
            data_dir: Optional custom data directory path
            fernet_cipher: Optional custom Fernet cipher instance
        """
        self._data_dir = data_dir or DATA_DIR
        self._fernet = fernet_cipher or fernet

    @property
    def data_dir(self) -> str:
        """Get the data directory path."""
        return self._data_dir

    def read(self, namespace: str, environment: str) -> Dict[str, str]:
        """Read and decrypt variables for a namespace/environment.

        Args:
            namespace: The namespace
            environment: The environment

        Returns:
            Dictionary of key-value pairs, or dict with "error" key on failure
        """
        path = self._get_env_path(namespace, environment)
        if not os.path.exists(path):
            return {}
        with _lock_for(path):
            with open(path, "rb") as handle:
                encrypted_data = handle.read()
        try:
            decrypted_data = self._fernet.decrypt(encrypted_data)
            payload = json.loads(decrypted_data.decode("utf-8"))
            if isinstance(payload, dict):
                return {str(k): str(v) for k, v in payload.items()}
        except InvalidToken:
            logger.exception("Decryption failure for %s/%s", namespace, environment)
            return {"error": "Decryption failed. Invalid key or corrupted data."}
        except json.JSONDecodeError:
            logger.exception("Invalid JSON payload for %s/%s", namespace, environment)
        return {}

    def write(self, namespace: str, environment: str, data: Dict[str, str]) -> None:
        """Write and encrypt variables for a namespace/environment.

        Args:
            namespace: The namespace
            environment: The environment
            data: Dictionary of key-value pairs to store
        """
        path = self._get_env_path(namespace, environment)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        sanitized = {
            k: str(v) for k, v in sorted(data.items()) if KEY_PATTERN.match(k)
        }
        json_data = json.dumps(sanitized, separators=(",", ":")).encode("utf-8")
        encrypted_data = self._fernet.encrypt(json_data)
        with _lock_for(path):
            with open(path, "wb") as handle:
                handle.write(encrypted_data)

    def delete(self, namespace: str, environment: str) -> bool:
        """Delete an environment file.

        Args:
            namespace: The namespace
            environment: The environment

        Returns:
            True if deleted, False if didn't exist
        """
        path = self._get_env_path(namespace, environment)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False

    def exists(self, namespace: str, environment: str) -> bool:
        """Check if an environment file exists.

        Args:
            namespace: The namespace
            environment: The environment

        Returns:
            True if exists, False otherwise
        """
        path = self._get_env_path(namespace, environment)
        return os.path.exists(path)

    def get_metadata(self, namespace: str, environment: str) -> Dict[str, Any]:
        """Get metadata about an environment.

        Args:
            namespace: The namespace
            environment: The environment

        Returns:
            Dictionary with last_modified and variable_count
        """
        path = self._get_env_path(namespace, environment)
        if not os.path.exists(path):
            return {"last_modified": None, "variable_count": 0}
        stat = os.stat(path)
        return {
            "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
            "variable_count": len(self.read(namespace, environment)),
        }

    def list_namespaces(self) -> list[str]:
        """List all available namespaces.

        Returns:
            List of namespace names
        """
        if not os.path.exists(self._data_dir):
            return []
        return [
            d for d in os.listdir(self._data_dir)
            if os.path.isdir(os.path.join(self._data_dir, d))
        ]

    def list_environments(self, namespace: str) -> list[str]:
        """List all environments for a namespace.

        Args:
            namespace: The namespace

        Returns:
            List of environment names
        """
        ns_path = os.path.join(self._data_dir, namespace)
        if not os.path.exists(ns_path):
            return []
        return [
            f[:-4] for f in os.listdir(ns_path)
            if f.endswith(".enc")
        ]

    def list_all(self) -> Dict[str, list[str]]:
        """List all environments grouped by namespace.

        Returns:
            Dictionary mapping namespace to list of environment names
        """
        envs = defaultdict(list)
        if not os.path.exists(self._data_dir):
            return envs

        for ns_dir in os.listdir(self._data_dir):
            ns_path = os.path.join(self._data_dir, ns_dir)
            if os.path.isdir(ns_path):
                for filename in os.listdir(ns_path):
                    if filename.endswith(".enc"):
                        env_name = filename[:-4]
                        envs[ns_dir].append(env_name)
        return envs

    def _get_env_path(self, namespace: str, environment: str) -> str:
        """Get the full path to an environment file.

        Args:
            namespace: The namespace
            environment: The environment

        Returns:
            Full path to the .enc file
        """
        validate_segments(namespace, environment)
        return os.path.join(self._data_dir, namespace, f"{environment}.enc")


# Global secrets store instance
secrets_store = SecretsStore()