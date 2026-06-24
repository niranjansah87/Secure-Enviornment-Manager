# services/__init__.py
"""
Audit services module.

Provides:
- audit_constants: Event types, severity levels, rotation settings
- audit_service: Main AuditService class

Backward compatibility: import audit_logger for the legacy wrapper
"""

from services.audit_constants import (
    MAX_LOG_FILE_SIZE_BYTES,
    MAX_ROTATED_FILES,
    ActionType,
    SeverityLevel,
    SENSITIVE_MARKERS,
)

from services.audit_service import AuditService

__all__ = [
    "MAX_LOG_FILE_SIZE_BYTES",
    "MAX_ROTATED_FILES",
    "ActionType",
    "SeverityLevel",
    "SENSITIVE_MARKERS",
    "AuditService",
]