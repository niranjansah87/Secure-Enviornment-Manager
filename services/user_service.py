"""
User management service for Secure Environment Manager.
Handles developer accounts — creation, authentication, password management, RBAC.

Coexists with dashboard password and master API token — does not replace them.
"""
import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from core.config import logger

USERS_FILE = Path(__file__).parent.parent / "data" / "users.json"

_PBKDF2_ITERATIONS = 480_000
_PBKDF2_KEY_LEN = 32


def _hash_password(password: str) -> str:
    """Hash password with a fresh random per-user salt.

    Format: pbkdf2_sha256$<iterations>$<base64_salt>$<base64_hash>
    Salt is 16 cryptographically random bytes, unique per hash call.
    """
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS, dklen=_PBKDF2_KEY_LEN
    )
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def _verify_password_hash(stored: str, provided: str) -> bool:
    """Verify password against self-describing hash string."""
    try:
        scheme, iterations_str, salt_b64, hash_b64 = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        stored_dk = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac(
            "sha256", provided.encode("utf-8"), salt, int(iterations_str), dklen=_PBKDF2_KEY_LEN
        )
        return hmac.compare_digest(stored_dk, dk)
    except Exception:
        return False


def _generate_temp_password() -> str:
    """Cryptographically random, human-readable temp password."""
    return secrets.token_urlsafe(12)


def _safe_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Strip sensitive fields before returning to caller."""
    return {k: v for k, v in user.items() if k != "password_hash"}


class UserService:
    """
    File-backed user store. Thread-safe via load/save on each operation.
    Users stored in data/users.json keyed by user_id.
    """

    def __init__(self, users_file: Path = USERS_FILE):
        self._file = users_file

    def _load(self) -> Dict[str, Dict[str, Any]]:
        if not self._file.exists():
            return {}
        try:
            with open(self._file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error("Failed to load users: %s", e)
            return {}

    def _save(self, users: Dict[str, Dict[str, Any]]) -> None:
        self._file.parent.mkdir(parents=True, exist_ok=True)
        with open(self._file, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)

    # ------------------------------------------------------------------ #
    #  Write operations                                                    #
    # ------------------------------------------------------------------ #

    def create_user(
        self,
        username: str,
        role: str = "developer",
        scopes: Optional[list[str]] = None,
        email: Optional[str] = None,
        created_by: str = "admin",
    ) -> tuple[str, str]:
        """
        Create a new user account with a random temp password.

        Returns:
            (user_id, temp_password) — temp_password shown once, never stored plain.
        Raises:
            ValueError: if username already exists or role is invalid.
        """
        if role not in ("admin", "developer"):
            raise ValueError(f"Invalid role '{role}'. Must be 'admin' or 'developer'.")

        users = self._load()

        # Username uniqueness check (case-insensitive)
        for u in users.values():
            if u["username"].lower() == username.lower():
                raise ValueError(f"Username '{username}' is already taken.")

        user_id = f"usr_{secrets.token_hex(8)}"
        temp_password = _generate_temp_password()

        users[user_id] = {
            "user_id": user_id,
            "username": username,
            "email": email or "",
            "password_hash": _hash_password(temp_password),
            "role": role,
            "scopes": scopes or [],
            "must_change_password": True,
            "status": "active",
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
            "password_changed_at": None,
        }

        self._save(users)
        logger.info("User created: %s (%s) by %s", username, user_id, created_by)
        return user_id, temp_password

    def change_password(
        self,
        user_id: str,
        new_password: str,
        current_password: Optional[str] = None,
    ) -> bool:
        """
        Change a user's password.

        If current_password is provided, verifies it first (user-initiated change).
        If omitted, no current-password check (admin reset path — use admin_reset_password instead).

        Returns True on success, False if user not found or current_password wrong.
        """
        if len(new_password) < 8:
            raise ValueError("Password must be at least 8 characters.")

        users = self._load()
        user = users.get(user_id)
        if not user or user["status"] != "active":
            return False

        if current_password is not None:
            if not _verify_password_hash(user["password_hash"], current_password):
                return False

        user["password_hash"] = _hash_password(new_password)
        user["must_change_password"] = False
        user["password_changed_at"] = datetime.now(timezone.utc).isoformat()

        self._save(users)
        logger.info("Password changed for user %s", user_id)
        return True

    def admin_reset_password(self, user_id: str) -> Optional[str]:
        """
        Admin resets a user's password to a new temp password.

        Returns the temp_password (shown once), or None if user not found.
        """
        users = self._load()
        user = users.get(user_id)
        if not user:
            return None

        temp_password = _generate_temp_password()
        user["password_hash"] = _hash_password(temp_password)
        user["must_change_password"] = True
        user["password_changed_at"] = None

        self._save(users)
        logger.info("Password reset by admin for user %s", user_id)
        return temp_password

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update allowed fields: email, role, scopes, status.
        Returns updated safe user dict, or None if not found.
        """
        allowed = {"email", "role", "scopes", "status"}
        users = self._load()
        user = users.get(user_id)
        if not user:
            return None

        for key, value in updates.items():
            if key not in allowed:
                continue
            if key == "role" and value not in ("admin", "developer"):
                raise ValueError(f"Invalid role '{value}'.")
            if key == "status" and value not in ("active", "disabled"):
                raise ValueError(f"Invalid status '{value}'.")
            user[key] = value

        self._save(users)
        return _safe_user(user)

    def disable_user(self, user_id: str) -> bool:
        users = self._load()
        user = users.get(user_id)
        if not user:
            return False
        user["status"] = "disabled"
        self._save(users)
        logger.info("User disabled: %s", user_id)
        return True

    def delete_user(self, user_id: str) -> bool:
        users = self._load()
        if user_id not in users:
            return False
        username = users[user_id]["username"]
        del users[user_id]
        self._save(users)
        logger.info("User deleted: %s (%s)", username, user_id)
        return True

    # ------------------------------------------------------------------ #
    #  Read operations                                                     #
    # ------------------------------------------------------------------ #

    def verify_password(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Verify username + password. Returns full user dict (with hash) for JWT building,
        or None if invalid.

        Caller must use _safe_user() before returning to API clients.
        """
        users = self._load()
        for user in users.values():
            if user["username"].lower() != username.lower():
                continue
            if user["status"] != "active":
                return None
            if _verify_password_hash(user["password_hash"], password):
                # Update last_login
                user["last_login"] = datetime.now(timezone.utc).isoformat()
                self._save(users)
                return user
        return None

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        users = self._load()
        user = users.get(user_id)
        return _safe_user(user) if user else None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        users = self._load()
        for user in users.values():
            if user["username"].lower() == username.lower():
                return _safe_user(user)
        return None

    def list_users(self) -> list[Dict[str, Any]]:
        users = self._load()
        return [_safe_user(u) for u in users.values()]


user_service = UserService()
