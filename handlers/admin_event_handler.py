# handlers/admin_event_handler.py
"""
Admin event handler for audit logging.

Handles:
- Generic events
- Admin actions
"""

from typing import Any, Dict, Optional

from services.audit_service import AuditService


class AdminEventHandler:
    """Handles admin-related audit events."""

    def __init__(self, audit_service: AuditService):
        self._audit = audit_service

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
        self._audit.log_event(
            action, user_id, resource, namespace, environment, ip_address, details
        )