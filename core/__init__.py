"""
Core module for Secure Environment Manager.
Re-exports constants, config, and runtime values.
"""
from core.constants import (
    SEGMENT_PATTERN,
    KEY_PATTERN,
    SESSION_MAX_LIFETIME,
    STEP_UP_AUTH_WINDOW,
    SECRET_AUTO_HIDE_DELAY_MS,
    API_KEY_PATTERN,
    MAX_EXPORT_SIZE_MB,
    BULK_IMPORT_MAX_LINES,
    get_session_timeout,
    get_lockout_delta,
    get_max_login_attempts,
)

from core.config import settings, fernet, DATA_DIR, API_KEYS_FILE, DATA_LOCKS, spa_url
from core.sessions import (
    current_identity,
    clear_auth,
    mark_authenticated,
    session_key_for,
)
from core.step_up_auth import require_step_up_auth