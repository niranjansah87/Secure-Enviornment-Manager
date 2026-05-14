"""
Constants and patterns for Secure Environment Manager.
Extracted from app.py for modular architecture.
"""
import re
from datetime import timedelta

# Validation patterns
SEGMENT_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
KEY_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")

# Timeout and limit settings
# Note: SESSION_TIMEOUT is derived from settings at runtime
# Import from core.config import SESSION_TIMEOUT for the actual value
SESSION_TIMEOUT_MINUTES_DEFAULT = 60
LOCKOUT_MINUTES_DEFAULT = 15
MAX_LOGIN_ATTEMPTS_DEFAULT = 5

# Absolute session lifetime (24 hours - new security feature)
SESSION_MAX_LIFETIME = timedelta(hours=24)

# Step-up authentication window (5 minutes)
STEP_UP_AUTH_WINDOW = timedelta(minutes=5)

# Secret auto-hide delay for frontend (15 seconds)
SECRET_AUTO_HIDE_DELAY_MS = 15000

# API key validation pattern
API_KEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]{16,128}$")

# Rate limiting
MAX_EXPORT_SIZE_MB = 10
BULK_IMPORT_MAX_LINES = 10000


def get_session_timeout() -> timedelta:
    """Get session timeout - returns actual value from settings or default."""
    try:
        from core.config import settings
        return timedelta(minutes=settings.session_timeout_minutes)
    except ImportError:
        return timedelta(minutes=SESSION_TIMEOUT_MINUTES_DEFAULT)


def get_lockout_delta() -> timedelta:
    """Get lockout delta - returns actual value from settings or default."""
    try:
        from core.config import settings
        return timedelta(minutes=settings.lockout_minutes)
    except ImportError:
        return timedelta(minutes=LOCKOUT_MINUTES_DEFAULT)


def get_max_login_attempts() -> int:
    """Get max login attempts - returns actual value from settings or default."""
    try:
        from core.config import settings
        return settings.max_login_attempts
    except ImportError:
        return MAX_LOGIN_ATTEMPTS_DEFAULT