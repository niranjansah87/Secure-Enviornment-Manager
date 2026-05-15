# handlers/__init__.py
"""
Audit event handlers module.

Provides specialized handlers for different event types:
- auth_event_handler: Login/logout/session events
- secret_event_handler: Secret CRUD events
- admin_event_handler: Admin action events
"""

from handlers.auth_event_handler import AuthEventHandler
from handlers.secret_event_handler import SecretEventHandler
from handlers.admin_event_handler import AdminEventHandler

__all__ = [
    "AuthEventHandler",
    "SecretEventHandler",
    "AdminEventHandler",
]