"""
Audit service wrapper for Secure Environment Manager.
Provides a higher-level interface to audit logging functionality.
"""
from typing import Any, Dict, Optional

from audit_logger import AuditLogger, audit_logger


class AuditService:
    """High-level audit logging service.

    Wraps the AuditLogger class to provide a cleaner interface
    and additional functionality.
    """

    def __init__(self, logger: AuditLogger):
        self._logger = logger

    def log_variable_created(
        self,
        namespace: str,
        environment: str,
        key: str,
        value: str,
        user_id: str,
        ip_address: str
    ) -> None:
        """Log when a variable is created."""
        self._logger.log_variable_create(
            namespace, environment, key, value, user_id, ip_address
        )

    def log_variable_updated(
        self,
        namespace: str,
        environment: str,
        key: str,
        old_value: str,
        new_value: str,
        user_id: str,
        ip_address: str
    ) -> None:
        """Log when a variable is updated."""
        self._logger.log_variable_update(
            namespace, environment, key, old_value, new_value, user_id, ip_address
        )

    def log_variable_deleted(
        self,
        namespace: str,
        environment: str,
        key: str,
        value: str,
        user_id: str,
        ip_address: str
    ) -> None:
        """Log when a variable is deleted."""
        self._logger.log_variable_delete(
            namespace, environment, key, value, user_id, ip_address
        )

    def log_bulk_operation(
        self,
        namespace: str,
        environment: str,
        variables_count: int,
        user_id: str,
        ip_address: str
    ) -> None:
        """Log a bulk replace operation."""
        self._logger.log_bulk_replace(
            namespace, environment, variables_count, user_id, ip_address
        )

    def log_authentication_success(
        self,
        namespace: str,
        environment: str,
        user_id: str,
        ip_address: str
    ) -> None:
        """Log successful authentication."""
        self._logger.log_login_success(
            namespace, environment, user_id, ip_address
        )

    def log_authentication_failure(
        self,
        namespace: str,
        environment: str,
        ip_address: str,
        reason: str = "invalid_password"
    ) -> None:
        """Log failed authentication attempt."""
        self._logger.log_login_failure(
            namespace, environment, ip_address, reason
        )

    def log_logout(
        self,
        namespace: str,
        environment: str,
        user_id: str,
        ip_address: str
    ) -> None:
        """Log user logout."""
        self._logger.log_logout(
            namespace, environment, user_id, ip_address
        )

    def log_export(
        self,
        namespace: str,
        environment: str,
        format: str,
        user_id: str,
        ip_address: str
    ) -> None:
        """Log variable export."""
        self._logger.log_export(
            namespace, environment, format, user_id, ip_address
        )

    def log_session_created(
        self,
        namespace: str,
        environment: str,
        session_id: str,
        ip_address: str,
        user_agent: str
    ) -> None:
        """Log session creation."""
        self._logger.log_session_created(
            namespace, environment, session_id, ip_address, user_agent
        )

    def log_session_revoked(
        self,
        namespace: str,
        environment: str,
        session_id: str,
        ip_address: str
    ) -> None:
        """Log session revocation."""
        self._logger.log_session_revoked(
            namespace, environment, session_id, ip_address
        )

    def log_event(
        self,
        action: str,
        user_id: str,
        resource: str,
        namespace: str,
        environment: str,
        ip_address: str,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a generic event."""
        self._logger.log_event(
            action, user_id, resource, namespace, environment, ip_address, details
        )

    def get_logs(
        self,
        namespace: Optional[str] = None,
        environment: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100
    ) -> list[Dict[str, Any]]:
        """Retrieve audit logs with optional filtering."""
        return self._logger.get_logs(
            namespace=namespace,
            environment=environment,
            action=action,
            limit=limit
        )


# Global audit service instance
audit_service = AuditService(audit_logger)