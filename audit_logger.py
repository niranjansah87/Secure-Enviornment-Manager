# audit_logger.py
"""
Audit logging system for Secure Environment Manager.

This module provides backward-compatible access to audit logging functionality.
The implementation has been split into modular components:
- services/audit_service: Main audit service
- services/audit_file_logger: Low-level file I/O
- services/audit_constants: Event types and constants
- handlers/: Specialized event handlers

For new code, prefer importing from the modular components directly:
    from services.audit_service import AuditService, audit_service

This module exists solely for backward compatibility with existing imports:
    from audit_logger import AuditLogger, audit_logger
"""

# Re-export the main components for backward compatibility
from services.audit_service import AuditService, audit_service

# Create a legacy AuditLogger class that wraps the new AuditService
# This ensures existing code using AuditLogger continues to work
class AuditLogger:
    """Legacy wrapper class for backward compatibility.

    New code should use AuditService from services.audit_service instead.
    """

    def __init__(self, log_dir: str = "audit_logs"):
        self._service = AuditService(log_dir)

    def _get_timestamp(self) -> str:
        """Get current UTC timestamp in ISO format."""
        return self._service._get_timestamp()

    def _hash_value(self, value: str) -> str:
        """Create SHA-256 hash of a value for audit trail."""
        return self._service._hash_value(value)

    def _sanitize_field(self, key: str, value) -> any:
        """Sanitize a field value before writing to persistent audit storage."""
        return self._service._sanitize_field(key, value)

    def _sanitize_for_storage(self, value) -> any:
        """Recursively sanitize audit payload prior to serialization."""
        return self._service._sanitize_for_storage(value)

    def _write_log(self, log_entry):
        """Write log entry to file, rotating if necessary."""
        self._service._write_log(log_entry)

    def log_variable_create(self, namespace, environment, key, value, user_id, ip_address):
        self._service.log_variable_create(namespace, environment, key, value, user_id, ip_address)

    def log_variable_update(self, namespace, environment, key, old_value, new_value, user_id, ip_address):
        self._service.log_variable_update(namespace, environment, key, old_value, new_value, user_id, ip_address)

    def log_variable_delete(self, namespace, environment, key, value, user_id, ip_address):
        self._service.log_variable_delete(namespace, environment, key, value, user_id, ip_address)

    def log_bulk_replace(self, namespace, environment, variables_count, user_id, ip_address):
        self._service.log_bulk_replace(namespace, environment, variables_count, user_id, ip_address)

    def log_login_success(self, namespace, environment, user_id, ip_address):
        self._service.log_login_success(namespace, environment, user_id, ip_address)

    def log_login_failure(self, namespace, environment, ip_address, reason="invalid_password"):
        self._service.log_login_failure(namespace, environment, ip_address, reason)

    def log_logout(self, namespace, environment, user_id, ip_address):
        self._service.log_logout(namespace, environment, user_id, ip_address)

    def log_export(self, namespace, environment, format, user_id, ip_address):
        self._service.log_export(namespace, environment, format, user_id, ip_address)

    def log_session_created(self, namespace, environment, session_id, ip_address, user_agent):
        self._service.log_session_created(namespace, environment, session_id, ip_address, user_agent)

    def log_session_revoked(self, namespace, environment, session_id, ip_address):
        self._service.log_session_revoked(namespace, environment, session_id, ip_address)

    def log_event(self, action, user_id, resource, namespace, environment, ip_address, details=None):
        self._service.log_event(action, user_id, resource, namespace, environment, ip_address, details)

    def get_logs(self, namespace=None, environment=None, action=None, limit=100, offset=0, user_id=None, ip_address=None, start_date=None, end_date=None):
        return self._service.get_logs(namespace, environment, action, limit, offset, user_id, ip_address, start_date, end_date)

    def count_logs(self, namespace=None, environment=None, action=None, user_id=None, ip_address=None, start_date=None, end_date=None):
        return self._service.count_logs(namespace, environment, action, user_id, ip_address, start_date, end_date)


# Global audit logger instance - backward compatible
audit_logger = AuditLogger()