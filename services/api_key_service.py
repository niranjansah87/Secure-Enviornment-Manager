"""
API key management service for Secure Environment Manager.
Handles creation, validation, revocation, and listing of API keys with RBAC support.
"""
import json
import re
import secrets
import hmac
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Optional

from core.config import API_KEYS_FILE, logger


class ApiKeyService:
    """Manages API keys for namespace authentication with RBAC.

    API keys are stored in api_keys.json in the format:
    {
        "namespace": {
            "key_id": {
                "key": "hashed_key",
                "created_at": "ISO timestamp",
                "last_used": "ISO timestamp or null",
                "created_by": "user identifier",
                "description": "optional description",
                "namespaces": ["allowed", "namespaces"],  # empty = all accessible namespaces
                "expires_at": "ISO timestamp or null",
                "status": "active" | "expired" | "revoked",
                "custom_key": boolean  # true if admin provided custom key
            }
        }
    }
    """

    # Pattern for valid custom API keys (alphanumeric + specific symbols)
    KEY_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{16,64}$')

    def __init__(self, keys_file: str = None):
        self._keys_file = Path(keys_file or API_KEYS_FILE)
        self._migrate_if_needed()

    def _migrate_if_needed(self) -> None:
        """Migrate old format api_keys.json to new RBAC format if needed."""
        if not self._keys_file.exists():
            return

        try:
            with open(self._keys_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Check if already in new format (dict of dicts)
            if data and isinstance(data, dict):
                first_key = next(iter(data.values()), None)
                if isinstance(first_key, dict):
                    # Already in new format
                    return
                if isinstance(first_key, str):
                    # Old format - migrate
                    self._migrate_old_format(data)
        except (json.JSONDecodeError, IOError, StopIteration):
            pass

    def _migrate_old_format(self, old_data: Dict[str, str]) -> None:
        """Migrate old format keys to new RBAC format."""
        import secrets
        from datetime import datetime, timezone

        new_data = {}
        for namespace, key_hash in old_data.items():
            key_id = secrets.token_hex(8)
            new_data[namespace] = {
                key_id: {
                    "key": key_hash,  # Keep the existing hash
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "last_used": None,
                    "created_by": "migrated",
                    "key_id": key_id,
                    "description": "Migrated from old format",
                    "namespaces": [],  # Empty = all namespaces
                    "expires_at": None,
                    "status": "active",
                    "custom_key": False,
                }
            }

        self._save_keys(new_data)
        logger.info("Migrated %d namespaces from old API key format", len(old_data))

    def _load_keys(self) -> Dict[str, Dict[str, Dict[str, Any]]]:
        """Load all keys from the JSON file."""
        if not self._keys_file.exists():
            return {}
        try:
            with open(self._keys_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error("Failed to load API keys: %s", e)
            return {}

    def _save_keys(self, keys: Dict[str, Dict[str, Dict[str, Any]]]) -> None:
        """Save keys to the JSON file."""
        self._keys_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self._keys_file, "w", encoding="utf-8") as f:
            json.dump(keys, f, indent=2)

    def _hash_key(self, key: str) -> str:
        """Hash an API key for storage using SHA-256."""
        import hashlib
        return hashlib.sha256(key.encode()).hexdigest()

    def _verify_key(self, stored_hash: str, provided_key: str) -> bool:
        """Timing-safe comparison of stored hash vs provided key."""
        provided_hash = self._hash_key(provided_key)
        return hmac.compare_digest(stored_hash, provided_hash)

    def _is_expired(self, expires_at: Optional[str]) -> bool:
        """Check if a key has expired."""
        if not expires_at:
            return False
        try:
            expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            return datetime.now(timezone.utc) > expiry
        except (ValueError, TypeError):
            return False

    def _is_valid_status(self, status: str) -> bool:
        """Check if key status allows authentication."""
        return status == "active"

    def validate_custom_key_format(self, key: str) -> tuple[bool, str]:
        """Validate format of a custom API key."""
        if not key:
            return False, "Key cannot be empty"
        if len(key) < 16:
            return False, "Key must be at least 16 characters"
        if len(key) > 64:
            return False, "Key must be at most 64 characters"
        if not self.KEY_PATTERN.match(key):
            return False, "Key can only contain letters, numbers, underscores, and hyphens"
        return True, ""

    def create_key(
        self,
        namespace: str,
        created_by: str = "system",
        description: str = "",
        validity_days: int = 30,
        custom_key: Optional[str] = None,
        allowed_namespaces: Optional[list[str]] = None
    ) -> tuple[str, str]:
        """Create a new API key for a namespace.

        Args:
            namespace: Primary namespace for the key
            created_by: User/system that created the key
            description: Optional description of the key's purpose
            validity_days: Number of days until expiry (0 = no expiry)
            custom_key: Optional admin-provided custom key (validated format)
            allowed_namespaces: List of namespaces this key can access (None = all)

        Returns:
            tuple of (raw_key, key_id) where raw_key is only shown once.
        """
        if custom_key:
            is_valid, error_msg = self.validate_custom_key_format(custom_key)
            if not is_valid:
                raise ValueError(f"Invalid custom key format: {error_msg}")
            raw_key = custom_key
        else:
            raw_key = f"sem_{secrets.token_urlsafe(32)}"

        key_id = secrets.token_hex(8)

        # Calculate expiry
        expires_at = None
        if validity_days > 0:
            expires_at = (datetime.now(timezone.utc) + timedelta(days=validity_days)).isoformat()

        keys = self._load_keys()
        if namespace not in keys:
            keys[namespace] = {}

        keys[namespace][key_id] = {
            "key": self._hash_key(raw_key),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used": None,
            "created_by": created_by,
            "key_id": key_id,
            "description": description,
            "namespaces": allowed_namespaces if allowed_namespaces else [],  # empty list = all namespaces
            "expires_at": expires_at,
            "status": "active",
            "custom_key": bool(custom_key),
        }

        self._save_keys(keys)
        return raw_key, key_id

    def revoke_key(self, namespace: str, key_id: str) -> bool:
        """Revoke an API key for a namespace."""
        keys = self._load_keys()
        if namespace not in keys or key_id not in keys[namespace]:
            return False

        # Mark as revoked instead of deleting to preserve audit trail
        keys[namespace][key_id]["status"] = "revoked"
        keys[namespace][key_id]["revoked_at"] = datetime.now(timezone.utc).isoformat()

        self._save_keys(keys)
        return True

    def list_keys(self, namespace: str) -> list[Dict[str, Any]]:
        """List all API keys for a namespace (without the actual key)."""
        keys = self._load_keys()
        if namespace not in keys:
            return []

        return [
            {
                "key_id": k["key_id"],
                "created_at": k["created_at"],
                "last_used": k.get("last_used"),
                "created_by": k.get("created_by", "unknown"),
                "description": k.get("description", ""),
                "namespaces": k.get("namespaces", []),
                "expires_at": k.get("expires_at"),
                "status": k.get("status", "active"),
                "custom_key": k.get("custom_key", False),
            }
            for k in keys[namespace].values()
        ]

    def verify_key(
        self,
        provided_key: str,
        required_namespace: Optional[str] = None
    ) -> tuple[bool, Optional[Dict[str, Any]]]:
        """Verify an API key and check namespace access.

        Returns:
            tuple of (is_valid, key_info) where key_info contains metadata if valid
        """
        keys = self._load_keys()

        # Search through all namespaces for matching key
        for ns, ns_keys in keys.items():
            for key_id, key_data in ns_keys.items():
                if self._verify_key(key_data["key"], provided_key):
                    # Check status
                    if key_data.get("status") != "active":
                        return False, None

                    # Check expiry
                    if self._is_expired(key_data.get("expires_at")):
                        # Auto-mark as expired
                        key_data["status"] = "expired"
                        self._save_keys(keys)
                        return False, None

                    # Check namespace access
                    allowed_namespaces = key_data.get("namespaces", [])
                    if allowed_namespaces and required_namespace:
                        # Key has limited namespace access
                        if required_namespace not in allowed_namespaces:
                            return False, None

                    # Update last_used
                    key_data["last_used"] = datetime.now(timezone.utc).isoformat()
                    self._save_keys(keys)

                    return True, {
                        "key_id": key_id,
                        "namespace": ns,
                        "namespaces": allowed_namespaces,
                        "expires_at": key_data.get("expires_at"),
                        "description": key_data.get("description", ""),
                    }

        return False, None

    def get_all_keys(self) -> Dict[str, list[str]]:
        """Get all namespaces with their key IDs (for UI display)."""
        keys = self._load_keys()
        return {
            ns: list(ns_keys.keys())
            for ns, ns_keys in keys.items()
        }

    def get_key_info(self, namespace: str, key_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed info about a specific key."""
        keys = self._load_keys()
        if namespace not in keys or key_id not in keys[namespace]:
            return None

        k = keys[namespace][key_id]
        return {
            "key_id": k["key_id"],
            "created_at": k["created_at"],
            "last_used": k.get("last_used"),
            "created_by": k.get("created_by", "unknown"),
            "description": k.get("description", ""),
            "namespaces": k.get("namespaces", []),
            "expires_at": k.get("expires_at"),
            "status": k.get("status", "active"),
            "custom_key": k.get("custom_key", False),
            "revoked_at": k.get("revoked_at"),
        }


# Global instance
api_key_service = ApiKeyService()