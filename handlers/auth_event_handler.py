# handlers/auth_event_handler.py
"""
Authentication event handler for audit logging.

Handles:
- Login success/failure
- Logout events
- Session creation/revocation
"""

from typing import Optional

from services.audit_service import AuditService


class AuthEventHandler:
    """Handles authentication-related audit events."""

    def __init__(self, audit_service: AuditService):
        self._audit = audit_service

    def log_login_success(
        self,
        namespace: str,
        environment: str,
        user_id: str,
        ip_address: str
    ):
        """Log successful authentication."""
        self._audit.log_login_success(namespace, environment, user_id, ip_address)

    def log_login_failure(
        self,
        namespace: str,
        environment: str,
        ip_address: str,
        reason: str = "invalid_password"
    ):
        """Log failed authentication attempt."""
        self._audit.log_login_failure(namespace, environment, ip_address, reason)

    def log_logout(
        self,
        namespace: str,
        environment: str,
        user_id: str,
        ip_address: str
    ):
        """Log user logout."""
        self._audit.log_logout(namespace, environment, user_id, ip_address)

    def log_session_created(
        self,
        namespace: str,
        environment: str,
        session_id: str,
        ip_address: str,
        user_agent: str
    ):
        """Log session creation."""
        self._audit.log_session_created(
            namespace, environment, session_id, ip_address, user_agent
        )

    def log_session_revoked(
        self,
        namespace: str,
        environment: str,
        session_id: str,
        ip_address: str
    ):
        """Log session revocation."""
        self._audit.log_session_revoked(
            namespace, environment, session_id, ip_address
        )