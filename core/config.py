"""
Configuration management for Secure Environment Manager.
Extracted from app.py for modular architecture.
"""
import logging
import os
from dataclasses import dataclass, field
from collections import defaultdict
from threading import Lock
from typing import Dict, List, Optional

from dotenv import load_dotenv
from cryptography.fernet import Fernet


load_dotenv()


@dataclass
class Settings:
    """Centralized runtime configuration with sane defaults."""
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
    master_api_token: Optional[str]
    cors_origins: List[str] = field(default_factory=list)
    frontend_url: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        """Create Settings from environment variables."""
        flask_secret_key = str(os.getenv("FLASK_SECRET_KEY", ""))
        encryption_key = str(os.getenv("ENCRYPTION_KEY", ""))
        dashboard_password = str(os.getenv("DASHBOARD_PASSWORD", ""))

        if not flask_secret_key:
            raise RuntimeError("Missing FLASK_SECRET_KEY environment variable.")
        if not encryption_key:
            raise RuntimeError("Missing ENCRYPTION_KEY environment variable.")
        if not dashboard_password:
            raise RuntimeError("Missing DASHBOARD_PASSWORD environment variable.")

        cors_origins = [
            o.strip()
            for o in str(os.getenv("CORS_ORIGINS", "http://localhost:3000")).split(",")
            if o.strip()
        ]

        return cls(
            flask_secret_key=flask_secret_key,
            encryption_key=encryption_key,
            dashboard_password=dashboard_password,
            data_dir=str(os.getenv("DATA_DIR", "data")),
            api_keys_file=str(os.getenv("API_KEYS_FILE", "api_keys.json")),
            session_timeout_minutes=int(os.getenv("SESSION_TIMEOUT_MINUTES", "60")),
            max_login_attempts=int(os.getenv("MAX_LOGIN_ATTEMPTS", "5")),
            lockout_minutes=int(os.getenv("LOCKOUT_MINUTES", "15")),
            log_level=str(os.getenv("LOG_LEVEL", "INFO")).upper(),
            content_security_policy=str(os.getenv(
                "CONTENT_SECURITY_POLICY",
                "default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
                "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline';",
            )),
            session_cookie_secure=str(os.getenv("SESSION_COOKIE_SECURE", "true")).lower() == "true",
            behind_proxy=str(os.getenv("BEHIND_PROXY", "true")).lower() == "true",
            export_filename=str(os.getenv("EXPORT_FILENAME", "{namespace}-{environment}.env")),
            debug=str(os.getenv("FLASK_DEBUG", "false")).lower() == "true",
            master_api_token=os.getenv("MASTER_API_TOKEN"),
            cors_origins=cors_origins,
            frontend_url=str(os.getenv("FRONTEND_URL", "http://localhost:3000")).rstrip("/"),
        )


# Global settings instance
settings = Settings.from_env()

# Initialize Fernet cipher
fernet = Fernet(settings.encryption_key.encode())

# Data directories
DATA_DIR = settings.data_dir
API_KEYS_FILE = settings.api_keys_file

# Logging setup
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Data locks for thread-safe file operations
DATA_LOCKS: defaultdict[str, Lock] = defaultdict(Lock)


def spa_url(namespace: str, environment: str, *extra: str) -> str:
    """Deep-link paths into the Next.js web UI."""
    tail = "/".join([namespace, environment, *extra])
    return f"{settings.frontend_url}/{tail}"