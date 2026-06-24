# services/audit_service.py
"""
Audit service for Secure Environment Manager.
Provides high-level audit logging interface.
"""

import hashlib
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from services.audit_file_logger import AuditFileLogger
from services.audit_constants import SENSITIVE_MARKERS


class AuditService:
    """Main audit logging service.

    Provides:
    - Structured logging methods for all event types
    - Automatic sanitization of sensitive fields
    - Pagination and filtering for log retrieval
    """

    def __init__(self, log_dir: str = "audit_logs"):
        self._file_logger = AuditFileLogger(log_dir)

    def _get_timestamp(self) -> str:
        """Get current UTC timestamp in ISO format."""
        return datetime.now(timezone.utc).isoformat()

    def _hash_value(self, value: str) -> str:
        """Create SHA-256 hash of a value for audit trail."""
        return hashlib.sha256(value.encode()).hexdigest()[:16]

    def _sanitize_field(self, key: str, value: Any) -> Any:
        """Sanitize a field value before writing to persistent audit storage."""
        if value is None:
            return None
        if not isinstance(key, str):
            return value

        lowered = key.lower()
        if any(marker in lowered for marker in SENSITIVE_MARKERS):
            return f"sha256:{self._hash_value(str(value))}"
        return value

    def _sanitize_for_storage(self, value: Any) -> Any:
        """Recursively sanitize audit payload prior to serialization."""
        if isinstance(value, dict):
            sanitized: Dict[str, Any] = {}
            for k, v in value.items():
                sanitized_value = self._sanitize_for_storage(v)
                sanitized[str(k)] = self._sanitize_field(str(k), sanitized_value)
            return sanitized
        if isinstance(value, list):
            return [self._sanitize_for_storage(item) for item in value]
        return value

    def _write_log(self, log_entry: Dict[str, Any]):
        """Write log entry to file, rotating if necessary."""
        sanitized = self._sanitize_for_storage(log_entry)
        self._file_logger.write_entry(sanitized)

    def log_variable_create(
        self,
        namespace: str,
        environment: str,
        key: str,
        value: str,
        user_id: str,
        ip_address: str
    ):
        """Log variable creation."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "CREATE_VARIABLE",
            "namespace": namespace,
            "environment": environment,
            "resource": key,
            "user_id": user_id,
            "ip_address": ip_address,
            "value_hash": self._hash_value(value),
            "details": {
                "key_length": len(key),
                "value_length": len(value)
            }
        }
        self._write_log(log_entry)

    def log_variable_update(
        self,
        namespace: str,
        environment: str,
        key: str,
        old_value: str,
        new_value: str,
        user_id: str,
        ip_address: str
    ):
        """Log variable update."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "UPDATE_VARIABLE",
            "namespace": namespace,
            "environment": environment,
            "resource": key,
            "user_id": user_id,
            "ip_address": ip_address,
            "old_value_hash": self._hash_value(old_value),
            "new_value_hash": self._hash_value(new_value),
            "details": {
                "value_changed": old_value != new_value,
                "old_length": len(old_value),
                "new_length": len(new_value)
            }
        }
        self._write_log(log_entry)

    def log_variable_delete(
        self,
        namespace: str,
        environment: str,
        key: str,
        value: str,
        user_id: str,
        ip_address: str
    ):
        """Log variable deletion."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "DELETE_VARIABLE",
            "namespace": namespace,
            "environment": environment,
            "resource": key,
            "user_id": user_id,
            "ip_address": ip_address,
            "value_hash": self._hash_value(value)
        }
        self._write_log(log_entry)

    def log_bulk_replace(
        self,
        namespace: str,
        environment: str,
        variables_count: int,
        user_id: str,
        ip_address: str
    ):
        """Log bulk variable replacement."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "BULK_REPLACE",
            "namespace": namespace,
            "environment": environment,
            "resource": f"{variables_count} variables",
            "user_id": user_id,
            "ip_address": ip_address,
            "details": {
                "variables_count": variables_count
            }
        }
        self._write_log(log_entry)

    def log_login_success(
        self,
        namespace: str,
        environment: str,
        user_id: str,
        ip_address: str
    ):
        """Log successful login."""
        safe_user_id = (
            user_id.split(":", 1)[0] if isinstance(user_id, str) else "unknown"
        )
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "LOGIN_SUCCESS",
            "namespace": namespace,
            "environment": environment,
            "resource": "authentication",
            "user_id": safe_user_id,
            "ip_address": ip_address
        }
        self._write_log(log_entry)

    def log_login_failure(
        self,
        namespace: str,
        environment: str,
        ip_address: str,
        reason: str = "invalid_password"
    ):
        """Log failed login attempt."""
        safe_reason = reason.split(":", 1)[0] if isinstance(reason, str) else "unknown"
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "LOGIN_FAILURE",
            "namespace": namespace,
            "environment": environment,
            "resource": "authentication",
            "user_id": "anonymous",
            "ip_address": ip_address,
            "details": {
                "reason": safe_reason
            }
        }
        self._write_log(log_entry)

    def log_logout(
        self,
        namespace: str,
        environment: str,
        user_id: str,
        ip_address: str
    ):
        """Log logout."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "LOGOUT",
            "namespace": namespace,
            "environment": environment,
            "resource": "authentication",
            "user_id": user_id,
            "ip_address": ip_address
        }
        self._write_log(log_entry)

    def log_export(
        self,
        namespace: str,
        environment: str,
        format: str,
        user_id: str,
        ip_address: str
    ):
        """Log variable export."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "EXPORT_VARIABLES",
            "namespace": namespace,
            "environment": environment,
            "resource": f"export.{format}",
            "user_id": user_id,
            "ip_address": ip_address,
            "details": {
                "format": format
            }
        }
        self._write_log(log_entry)

    def log_session_created(
        self,
        namespace: str,
        environment: str,
        session_id: str,
        ip_address: str,
        user_agent: str
    ):
        """Log session creation."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "SESSION_CREATED",
            "namespace": namespace,
            "environment": environment,
            "resource": "session",
            "user_id": "authenticated",
            "ip_address": ip_address,
            "details": {
                "session_id": session_id[:16] + "..." if session_id else "unknown",
                "user_agent": user_agent[:100] if user_agent else "unknown"
            }
        }
        self._write_log(log_entry)

    def log_session_revoked(
        self,
        namespace: str,
        environment: str,
        session_id: str,
        ip_address: str
    ):
        """Log session revocation."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "SESSION_REVOKED",
            "namespace": namespace,
            "environment": environment,
            "resource": "session",
            "user_id": "authenticated",
            "ip_address": ip_address,
            "details": {
                "session_id": session_id[:16] + "..." if session_id else "unknown",
                "reason": "user_revoked"
            }
        }
        self._write_log(log_entry)

    def log_event(
        self,
        action: str,
        user_id: str,
        resource: str,
        namespace: str,
        environment: str,
        ip_address: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log a generic event."""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": action,
            "namespace": namespace,
            "environment": environment,
            "resource": resource,
            "user_id": user_id,
            "ip_address": ip_address,
            "details": details or {}
        }
        self._write_log(log_entry)

    def get_logs(
        self,
        namespace: Optional[str] = None,
        environment: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> list[Dict[str, Any]]:
        """Retrieve audit logs with optional filtering and pagination."""
        limit = min(max(1, limit), 1000)
        offset = max(0, offset)

        entries = list(self._file_logger.read_entries(
            offset=offset,
            limit=limit,
            namespace=namespace,
            environment=environment,
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            start_date=start_date,
            end_date=end_date,
        ))
        return list(reversed(entries))

    def count_logs(
        self,
        namespace: Optional[str] = None,
        environment: Optional[str] = None,
        action: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> int:
        """Count total matching log entries without loading them all into memory."""
        count = 0
        for _ in self._file_logger.read_entries(
            offset=0,
            limit=sys.maxsize,
            namespace=namespace,
            environment=environment,
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            start_date=start_date,
            end_date=end_date,
        ):
            count += 1
        return count


# Global audit service instance
audit_service = AuditService()