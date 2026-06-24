# handlers/secret_event_handler.py
"""
Secret event handler for audit logging.

Handles:
- Variable create/update/delete
- Bulk replace operations
- Export operations
"""

from services.audit_service import AuditService


class SecretEventHandler:
    """Handles secret-related audit events."""

    def __init__(self, audit_service: AuditService):
        self._audit = audit_service

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
        self._audit.log_variable_create(
            namespace, environment, key, value, user_id, ip_address
        )

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
        self._audit.log_variable_update(
            namespace, environment, key, old_value, new_value, user_id, ip_address
        )

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
        self._audit.log_variable_delete(
            namespace, environment, key, value, user_id, ip_address
        )

    def log_bulk_replace(
        self,
        namespace: str,
        environment: str,
        variables_count: int,
        user_id: str,
        ip_address: str
    ):
        """Log bulk variable replacement."""
        self._audit.log_bulk_replace(
            namespace, environment, variables_count, user_id, ip_address
        )

    def log_export(
        self,
        namespace: str,
        environment: str,
        format: str,
        user_id: str,
        ip_address: str
    ):
        """Log variable export."""
        self._audit.log_export(
            namespace, environment, format, user_id, ip_address
        )