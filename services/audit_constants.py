# services/audit_constants.py
"""
Audit event type constants and severity levels.
"""

# Rotation settings
MAX_LOG_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB per file
MAX_ROTATED_FILES = 10  # Keep last 10 rotated files

# Event action types
class ActionType:
    CREATE_VARIABLE = "CREATE_VARIABLE"
    UPDATE_VARIABLE = "UPDATE_VARIABLE"
    DELETE_VARIABLE = "DELETE_VARIABLE"
    BULK_REPLACE = "BULK_REPLACE"
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    EXPORT_VARIABLES = "EXPORT_VARIABLES"
    SESSION_CREATED = "SESSION_CREATED"
    SESSION_REVOKED = "SESSION_REVOKED"

# Severity levels
class SeverityLevel:
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

# Sensitive field markers for sanitization
SENSITIVE_MARKERS = (
    "password",
    "token",
    "secret",
    "api_key",
    "key",
    "credential",
    "auth",
    "reason",
    "user_id",
)