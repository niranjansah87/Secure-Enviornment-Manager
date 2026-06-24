"""
JWT-based authentication for mobile, SDK, and CLI clients.
Provides secure token-based auth without browser cookies.

Token Architecture:
- Access Token: Short-lived (15 minutes), contains identity + permissions
- Refresh Token: Long-lived (7 days), stored server-side for revocation
- Device sessions tracked for multi-device management
"""
import hashlib
import json
import secrets
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from typing import Optional

import jwt
from flask import request

from core.config import settings, logger


# JWT Configuration
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour for internal-server deployments
REFRESH_TOKEN_EXPIRE_DAYS = 7
DEVICE_SESSION_EXPIRE_DAYS = 30


@dataclass
class TokenPayload:
    """Decoded JWT token payload."""
    sub: str  # Subject (session_id or device_id)
    typ: str  # Token type: "access" or "refresh"
    iat: int  # Issued at (Unix timestamp)
    exp: int  # Expiration (Unix timestamp)
    namespace: Optional[str] = None
    environment: Optional[str] = None
    scopes: list[str] = field(default_factory=list)
    device_id: Optional[str] = None
    is_admin: bool = False
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    must_change_password: bool = False
    credential_type: str = "unknown"        # dashboard_password | master_token | api_key | user_password


@dataclass
class RefreshToken:
    """Server-side refresh token record for revocation support."""
    token_hash: str  # SHA256 hash of the actual token
    session_id: str
    device_id: Optional[str]
    created_at: str
    expires_at: str
    last_used: Optional[str] = None
    is_revoked: bool = False
    revoked_at: Optional[str] = None
    user_agent: str = "unknown"
    ip_address: str = "unknown"
    # Preserved claims from the original access token — used during refresh
    # so the new access token carries the same identity and permissions.
    namespace: Optional[str] = None
    environment: Optional[str] = None
    is_admin: bool = False
    scopes: list = field(default_factory=list)
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    must_change_password: bool = False
    credential_type: str = "unknown"


@dataclass
class DeviceSession:
    """Device session for multi-device management."""
    device_id: str
    session_id: str
    created_at: str
    last_active: str
    last_used_token: Optional[str] = None
    is_revoked: bool = False
    revoked_at: Optional[str] = None
    device_name: str = "Unknown Device"
    device_type: str = "unknown"  # mobile, desktop, cli, sdk
    platform: str = "unknown"  # ios, android, windows, macos, linux
    user_agent: str = "unknown"
    ip_address: str = "unknown"


class TokenManager:
    """Manages JWT tokens and refresh tokens with server-side revocation.

    Uses file-based storage (refresh_tokens.json) for self-hosted compatibility.
    Optionally supports Redis if available ( abstraction layer).
    """

    def __init__(self, tokens_file: Optional[str] = None):
        self._tokens_file = Path(tokens_file or "refresh_tokens.json")
        self._devices_file = Path("device_sessions.json")
        self._lock = Lock()
        self._refresh_tokens: dict[str, RefreshToken] = {}
        self._devices: dict[str, DeviceSession] = {}
        self._load_tokens()
        self._load_devices()

    def _load_tokens(self) -> None:
        """Load refresh tokens from file."""
        if not self._tokens_file.exists():
            return
        try:
            with open(self._tokens_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for token_hash, record in data.items():
                    self._refresh_tokens[token_hash] = RefreshToken(**record)
        except (json.JSONDecodeError, TypeError) as e:
            logger.error("Failed to load refresh tokens: %s", e)

    def _save_tokens(self) -> None:
        """Save refresh tokens to file."""
        self._tokens_file.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            data = {
                token_hash: asdict(record)
                for token_hash, record in self._refresh_tokens.items()
            }
            with open(self._tokens_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

    def _load_devices(self) -> None:
        """Load device sessions from file."""
        if not self._devices_file.exists():
            return
        try:
            with open(self._devices_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for device_id, record in data.items():
                    self._devices[device_id] = DeviceSession(**record)
        except (json.JSONDecodeError, TypeError) as e:
            logger.error("Failed to load device sessions: %s", e)

    def _save_devices(self) -> None:
        """Save device sessions to file."""
        self._devices_file.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            data = {
                device_id: asdict(session)
                for device_id, session in self._devices.items()
            }
            with open(self._devices_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

    def _hash_token(self, token: str) -> str:
        """Create SHA256 hash of a token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    def _now_iso(self) -> str:
        """Get current UTC time as ISO string."""
        return datetime.now(timezone.utc).isoformat()

    def _now_ts(self) -> int:
        """Get current UTC time as Unix timestamp."""
        return int(time.time())

    def _expire_ts(self, days: int = 0, minutes: int = 0) -> int:
        """Calculate expiration timestamp."""
        delta = timedelta(days=days, minutes=minutes)
        return int((datetime.now(timezone.utc) + delta).timestamp())

    def create_access_token(
        self,
        session_id: str,
        namespace: Optional[str] = None,
        environment: Optional[str] = None,
        is_admin: bool = False,
        device_id: Optional[str] = None,
        scopes: Optional[list[str]] = None,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        email: Optional[str] = None,
        must_change_password: bool = False,
        credential_type: str = "unknown",
    ) -> str:
        """Create a new JWT access token."""
        now = self._now_ts()
        payload = {
            "sub": session_id,
            "typ": "access",
            "iat": now,
            "exp": self._expire_ts(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "namespace": namespace,
            "environment": environment,
            "is_admin": is_admin,
            "device_id": device_id,
            "scopes": scopes or [],
            "user_id": user_id,
            "username": username,
            "email": email,
            "must_change_password": must_change_password,
            "credential_type": credential_type,
        }
        return jwt.encode(payload, settings.flask_secret_key, algorithm=JWT_ALGORITHM)

    def create_refresh_token(
        self,
        session_id: str,
        device_id: Optional[str] = None,
        user_agent: str = "unknown",
        ip_address: str = "unknown",
        namespace: Optional[str] = None,
        environment: Optional[str] = None,
        is_admin: bool = False,
        scopes: Optional[list[str]] = None,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        email: Optional[str] = None,
        must_change_password: bool = False,
        credential_type: str = "unknown",
    ) -> tuple[str, str]:
        """Create a new refresh token and store it.

        Args:
            session_id: Server-side session identifier
            device_id: Optional device identifier
            user_agent: Client user agent
            ip_address: Client IP address
            namespace, environment, is_admin, scopes, user_id, username,
            email, must_change_password, credential_type:
                Preserved from the original access token so refresh can
                re-issue a token with identical claims.

        Returns:
            Tuple of (refresh_token, token_hash)
        """
        token = f"semr_{secrets.token_urlsafe(48)}"
        token_hash = self._hash_token(token)

        now = self._now_iso()
        expires = (datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat()

        refresh_record = RefreshToken(
            token_hash=token_hash,
            session_id=session_id,
            device_id=device_id,
            created_at=now,
            expires_at=expires,
            user_agent=user_agent[:200] if user_agent else "unknown",
            ip_address=ip_address,
            namespace=namespace,
            environment=environment,
            is_admin=is_admin,
            scopes=scopes or [],
            user_id=user_id,
            username=username,
            email=email,
            must_change_password=must_change_password,
            credential_type=credential_type,
        )

        with self._lock:
            self._refresh_tokens[token_hash] = refresh_record

        self._save_tokens()
        return token, token_hash

    def validate_access_token(self, token: str) -> Optional[TokenPayload]:
        """Validate an access token.

        Args:
            token: JWT access token string

        Returns:
            TokenPayload if valid, None if invalid/expired
        """
        try:
            payload = jwt.decode(
                token,
                settings.flask_secret_key,
                algorithms=[JWT_ALGORITHM]
            )
            if payload.get("typ") != "access":
                return None

            return TokenPayload(
                sub=payload["sub"],
                typ=payload["typ"],
                iat=payload["iat"],
                exp=payload["exp"],
                namespace=payload.get("namespace"),
                environment=payload.get("environment"),
                is_admin=payload.get("is_admin", False),
                device_id=payload.get("device_id"),
                scopes=payload.get("scopes", []),
                user_id=payload.get("user_id"),
                username=payload.get("username"),
                email=payload.get("email"),
                must_change_password=payload.get("must_change_password", False),
                credential_type=payload.get("credential_type", "unknown"),
            )
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def validate_refresh_token(self, token: str) -> Optional[RefreshToken]:
        """Validate a refresh token and check revocation status.

        Args:
            token: Refresh token string

        Returns:
            RefreshToken record if valid, None if invalid/revoked/expired
        """
        token_hash = self._hash_token(token)

        with self._lock:
            record = self._refresh_tokens.get(token_hash)

        if not record:
            return None

        if record.is_revoked:
            return None

        # Check expiration
        try:
            expires = datetime.fromisoformat(record.expires_at)
            if datetime.now(timezone.utc) > expires:
                return None
        except (ValueError, TypeError):
            return None

        return record

    def refresh_access_token(self, refresh_token: str) -> Optional[tuple[str, str]]:
        """Generate new access token from refresh token.

        Args:
            refresh_token: Valid refresh token

        Returns:
            Tuple of (new_access_token, new_refresh_token) if valid, None if invalid
        """
        record = self.validate_refresh_token(refresh_token)
        if not record:
            return None

        # Update last used timestamp
        with self._lock:
            token_hash = self._hash_token(refresh_token)
            if token_hash in self._refresh_tokens:
                self._refresh_tokens[token_hash].last_used = self._now_iso()

        self._save_tokens()

        # Create new tokens — preserve all claims from the original
        new_access = self.create_access_token(
            session_id=record.session_id,
            namespace=record.namespace,
            environment=record.environment,
            is_admin=record.is_admin,
            device_id=record.device_id,
            scopes=record.scopes,
            user_id=record.user_id,
            username=record.username,
            email=record.email,
            must_change_password=record.must_change_password,
            credential_type=record.credential_type,
        )
        new_refresh, _ = self.create_refresh_token(
            session_id=record.session_id,
            device_id=record.device_id,
            user_agent=record.user_agent,
            ip_address=record.ip_address,
            namespace=record.namespace,
            environment=record.environment,
            is_admin=record.is_admin,
            scopes=record.scopes,
            user_id=record.user_id,
            username=record.username,
            email=record.email,
            must_change_password=record.must_change_password,
            credential_type=record.credential_type,
        )

        # Revoke old refresh token (rotation)
        self.revoke_refresh_token(refresh_token)

        return new_access, new_refresh

    def revoke_refresh_token(self, token: str) -> bool:
        """Revoke a refresh token.

        Args:
            token: Refresh token to revoke

        Returns:
            True if revoked, False if not found
        """
        token_hash = self._hash_token(token)

        with self._lock:
            if token_hash in self._refresh_tokens:
                self._refresh_tokens[token_hash].is_revoked = True
                self._refresh_tokens[token_hash].revoked_at = self._now_iso()
                self._save_tokens()
                return True
        return False

    def revoke_all_session_tokens(self, session_id: str) -> int:
        """Revoke all tokens for a session.

        Args:
            session_id: Session identifier

        Returns:
            Number of tokens revoked
        """
        count = 0
        with self._lock:
            for token_hash, record in self._refresh_tokens.items():
                if record.session_id == session_id and not record.is_revoked:
                    record.is_revoked = True
                    record.revoked_at = self._now_iso()
                    count += 1
            if count > 0:
                self._save_tokens()
        return count

    def revoke_all_device_tokens(self, device_id: str) -> int:
        """Revoke all tokens for a device.

        Args:
            device_id: Device identifier

        Returns:
            Number of tokens revoked
        """
        count = 0
        with self._lock:
            for token_hash, record in self._refresh_tokens.items():
                if record.device_id == device_id and not record.is_revoked:
                    record.is_revoked = True
                    record.revoked_at = self._now_iso()
                    count += 1
            if count > 0:
                self._save_tokens()
        return count

    def get_session_tokens(self, session_id: str) -> list[dict]:
        """Get all refresh tokens for a session (metadata only, no actual tokens).

        Args:
            session_id: Session identifier

        Returns:
            List of token metadata (for device management UI)
        """
        tokens = []
        with self._lock:
            for record in self._refresh_tokens.values():
                if record.session_id == session_id:
                    tokens.append({
                        "created_at": record.created_at,
                        "expires_at": record.expires_at,
                        "last_used": record.last_used,
                        "is_revoked": record.is_revoked,
                        "device_id": record.device_id,
                        "user_agent": record.user_agent,
                        "ip_address": record.ip_address,
                    })
        return tokens

    # --- Device Session Management ---

    def register_device(
        self,
        session_id: str,
        device_name: str = "Unknown Device",
        device_type: str = "unknown",
        platform: str = "unknown",
        user_agent: str = "unknown",
        ip_address: str = "unknown"
    ) -> str:
        """Register a new device session.

        Args:
            session_id: Associated session identifier
            device_name: Human-readable device name
            device_type: Type of device (mobile, desktop, cli, sdk)
            platform: Platform (ios, android, windows, macos, linux, etc.)
            user_agent: Client user agent string
            ip_address: Client IP address

        Returns:
            Generated device_id
        """
        device_id = f"dev_{secrets.token_hex(16)}"

        now = self._now_iso()
        device_session = DeviceSession(
            device_id=device_id,
            session_id=session_id,
            created_at=now,
            last_active=now,
            device_name=device_name,
            device_type=device_type,
            platform=platform,
            user_agent=user_agent[:200] if user_agent else "unknown",
            ip_address=ip_address,
        )

        with self._lock:
            self._devices[device_id] = device_session

        self._save_devices()
        return device_id

    def get_device(self, device_id: str) -> Optional[DeviceSession]:
        """Get device session by ID.

        Args:
            device_id: Device identifier

        Returns:
            DeviceSession if found, None otherwise
        """
        with self._lock:
            return self._devices.get(device_id)

    def update_device_activity(self, device_id: str, token: str = None) -> bool:
        """Update last active timestamp for a device.

        Args:
            device_id: Device identifier
            token: Optional token used (for tracking)

        Returns:
            True if updated, False if not found
        """
        with self._lock:
            if device_id in self._devices:
                self._devices[device_id].last_active = self._now_iso()
                if token:
                    self._devices[device_id].last_used_token = self._hash_token(token)
                self._save_devices()
                return True
        return False

    def revoke_device(self, device_id: str) -> bool:
        """Revoke a device and all its tokens.

        Args:
            device_id: Device identifier

        Returns:
            True if revoked, False if not found
        """
        # First revoke all tokens for this device
        self.revoke_all_device_tokens(device_id)

        with self._lock:
            if device_id in self._devices:
                self._devices[device_id].is_revoked = True
                self._devices[device_id].revoked_at = self._now_iso()
                self._save_devices()
                return True
        return False

    def get_session_devices(self, session_id: str) -> list[dict]:
        """Get all devices for a session.

        Args:
            session_id: Session identifier

        Returns:
            List of device metadata
        """
        devices = []
        with self._lock:
            for device in self._devices.values():
                if device.session_id == session_id:
                    devices.append({
                        "device_id": device.device_id,
                        "device_name": device.device_name,
                        "device_type": device.device_type,
                        "platform": device.platform,
                        "created_at": device.created_at,
                        "last_active": device.last_active,
                        "is_revoked": device.is_revoked,
                        "user_agent": device.user_agent,
                        "ip_address": device.ip_address,
                    })
        return devices

    def get_all_devices(self) -> list[dict]:
        """Get all registered devices (admin only).

        Returns:
            List of all device metadata
        """
        devices = []
        with self._lock:
            for device in self._devices.values():
                devices.append({
                    "device_id": device.device_id,
                    "session_id": device.session_id,
                    "device_name": device.device_name,
                    "device_type": device.device_type,
                    "platform": device.platform,
                    "created_at": device.created_at,
                    "last_active": device.last_active,
                    "is_revoked": device.is_revoked,
                    "user_agent": device.user_agent,
                    "ip_address": device.ip_address,
                })
        return devices


def asdict(obj):
    """Helper to convert dataclass to dict."""
    if hasattr(obj, '__dataclass_fields__'):
        return {
            k: asdict(v) if hasattr(v, '__dataclass_fields__') else v
            for k, v in obj.__dict__.items()
            if v is not None or k in getattr(obj, '__dataclass_fields__', {})
        }
    elif isinstance(obj, list):
        return [asdict(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: asdict(v) for k, v in obj.items()}
    return obj


# Global token manager instance
token_manager = TokenManager()


# --- JWT Authentication Decorators ---

def extract_jwt_from_header() -> Optional[str]:
    """Extract JWT token from Authorization header.

    Supports formats:
    - Bearer <token>
    - Bearer <access_token> <refresh_token>  (space-separated for combined)
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token_part = auth[7:].strip()
    if " " in token_part:
        return token_part.split()[0]
    return token_part


def extract_bearer_token(auth_header: str) -> Optional[str]:
    """Extract JWT token from Authorization header string.

    Supports formats:
    - Bearer <token>
    - Bearer <access_token> <refresh_token>  (space-separated for combined)

    Args:
        auth_header: The Authorization header value (not the full header, just the value)
    """
    if not auth_header.startswith("Bearer "):
        return None
    token_part = auth_header[7:].strip()
    if " " in token_part:
        return token_part.split()[0]
    return token_part


def extract_refresh_token_from_header() -> Optional[str]:
    """Extract refresh token from Authorization header (second token if present).

    Supports: Bearer <access_token> <refresh_token>
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    parts = auth[7:].strip().split()
    if len(parts) > 1:
        return parts[1]
    return None


def jwt_required(f):
    """Decorator to require valid JWT access token.

    Sets g.jwt_payload with decoded token payload.
    """
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_jwt_from_header()
        if not token:
            return None, None, "No token provided"

        payload = token_manager.validate_access_token(token)
        if not payload:
            return None, None, "Invalid or expired token"

        # Update device activity if device_id present
        if payload.device_id:
            token_manager.update_device_activity(payload.device_id, token)

        return payload, token, None

    return decorated


def require_jwt(f):
    """Decorator that requires valid JWT and aborts with error if not.

    Sets g.jwt_payload with decoded token payload.
    """
    from functools import wraps
    from flask import g, abort
    from core.api_response import api_error, ErrorCode

    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_jwt_from_header()
        if not token:
            return api_error(
                ErrorCode.AUTH_REQUIRED[0],
                status_code=401
            )

        payload = token_manager.validate_access_token(token)
        if not payload:
            return api_error(
                ErrorCode.AUTH_INVALID_TOKEN[0],
                status_code=401
            )

        # Update device activity if device_id present
        if payload.device_id:
            token_manager.update_device_activity(payload.device_id, token)

        g.jwt_payload = payload
        g.access_token = token

        return f(*args, **kwargs)

    return decorated


def require_admin(f):
    """Decorator that requires admin privileges.

    Must be used after @require_jwt.
    """
    from functools import wraps
    from flask import g, abort
    from core.api_response import api_error, ErrorCode

    @wraps(f)
    def decorated(*args, **kwargs):
        payload = getattr(g, 'jwt_payload', None)
        if not payload or not payload.is_admin:
            return api_error(
                ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS[0],
                message="Admin privileges required",
                status_code=403
            )
        return f(*args, **kwargs)

    return decorated
