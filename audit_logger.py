# audit_logger.py
"""
Audit logging system for tracking all changes to environment variables
and authentication events.
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional
import hashlib

logger = logging.getLogger(__name__)

# Rotation settings
MAX_LOG_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB per file
MAX_ROTATED_FILES = 10  # Keep last 10 rotated files


class AuditLogger:
    """Handles audit logging for all system events"""
    
    def __init__(self, log_dir: str = "audit_logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.log_file = self.log_dir / "audit.jsonl"
    
    def _get_timestamp(self) -> str:
        """Get current UTC timestamp in ISO format"""
        return datetime.now(timezone.utc).isoformat()

    def _rotate_if_needed(self):
        """Rotate log file if it exceeds MAX_LOG_FILE_SIZE_BYTES.

        Archives current log file with timestamp and starts a fresh one.
        Removes oldest rotated files if exceeding MAX_ROTATED_FILES.
        """
        if not self.log_file.exists():
            return

        try:
            size = os.path.getsize(self.log_file)
            if size < MAX_LOG_FILE_SIZE_BYTES:
                return

            # Archive current file
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            rotated_name = f"audit_{timestamp}.jsonl"
            rotated_path = self.log_dir / rotated_name

            # Read content, compress would be ideal but we just move
            with open(self.log_file, 'r', encoding='utf-8') as f:
                content = f.read()

            with open(rotated_path, 'w', encoding='utf-8') as f:
                f.write(content)

            # Truncate original
            with open(self.log_file, 'w', encoding='utf-8') as f:
                f.write("")

            logger.info(f"Rotated audit log to {rotated_name}")

            # Clean up old rotated files
            self._cleanup_old_rotated()

        except Exception as e:
            logger.error(f"Failed to rotate audit log: {e}")

    def _cleanup_old_rotated(self):
        """Remove oldest rotated files beyond MAX_ROTATED_FILES."""
        try:
            rotated = sorted([
                f for f in self.log_dir.iterdir()
                if f.is_file() and f.name.startswith("audit_") and f.name.endswith(".jsonl")
            ], key=lambda f: f.stat().st_mtime, reverse=True)

            for old_file in rotated[MAX_ROTATED_FILES:]:
                old_file.unlink()
                logger.debug(f"Removed old audit log: {old_file.name}")
        except Exception as e:
            logger.error(f"Failed to cleanup old rotated logs: {e}")

    def _hash_value(self, value: str) -> str:
        """Create SHA-256 hash of a value for audit trail"""
        return hashlib.sha256(value.encode()).hexdigest()[:16]
    
    def _write_log(self, log_entry: Dict[str, Any]):
        """Write log entry to file, rotating if necessary."""
        try:
            self._rotate_if_needed()
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
    
    def log_variable_create(
        self,
        namespace: str,
        environment: str,
        key: str,
        value: str,
        user_id: str,
        ip_address: str
    ):
        """Log variable creation"""
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
        """Log variable update"""
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
        """Log variable deletion"""
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
        """Log bulk variable replacement"""
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
        """Log successful login

        The raw user_id may, depending on the caller, contain data derived
        from authentication tokens or other potentially sensitive
        information. To avoid storing such data in clear text, we normalize
        the user_id to a bounded, non-sensitive value before writing it to
        the audit log.
        """
        # Normalize the user identifier to avoid leaking secrets. If the
        # identifier includes a prefix and additional detail separated by
        # ":", only keep the prefix (e.g. "api_key", "master_token").
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
        """Log failed login attempt

        The raw reason string may contain data derived from authentication
        tokens or other potentially sensitive information. To avoid storing
        such data in clear text, we normalize the reason to a bounded,
        non-sensitive value before writing it to the audit log.
        """
        # Normalize the reason to a limited, non-sensitive value.
        # If the reason includes a prefix and additional detail separated
        # by ":", only keep the prefix (e.g. "invalid_or_forbidden_token").
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
        """Log logout"""
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
        """Log variable export"""
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
        """Log session creation"""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "SESSION_CREATED",
            "namespace": namespace,
            "environment": environment,
            "resource": "session",
            "user_id": "authenticated",
            "ip_address": ip_address,
            "details": {
                "session_id": session_id[:16] + "...",
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
        """Log session revocation"""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "SESSION_REVOKED",
            "namespace": namespace,
            "environment": environment,
            "resource": "session",
            "user_id": "authenticated",
            "ip_address": ip_address,
            "details": {
                "session_id": session_id[:16] + "...",
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
        """Log a generic event"""
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

    def _read_lines_with_offset(
        self,
        offset: int,
        limit: int,
        namespace: Optional[str] = None,
        environment: Optional[str] = None,
        action: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ):
        """Read JSONL entries with efficient offset-based skipping.

        Uses a line-based iterator to avoid loading the entire file into memory.
        Skips `offset` entries first, then yields up to `limit` matching entries.
        """
        if not self.log_file.exists():
            return

        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                skipped = 0
                yielded = 0

                for line in f:
                    if skipped < offset:
                        skipped += 1
                        continue

                    if yielded >= limit:
                        break

                    try:
                        log_entry = json.loads(line.strip())

                        # Apply filters
                        if namespace and log_entry.get('namespace') != namespace:
                            continue
                        if environment and log_entry.get('environment') != environment:
                            continue
                        if action and log_entry.get('action') != action:
                            continue
                        if user_id and log_entry.get('user_id') != user_id:
                            continue
                        if ip_address and log_entry.get('ip_address') != ip_address:
                            continue

                        # Date range filter
                        if start_date or end_date:
                            ts = log_entry.get('timestamp', '')
                            if start_date and ts < start_date:
                                continue
                            if end_date and ts > end_date:
                                continue

                        yielded += 1
                        yield log_entry

                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.error(f"Failed to read audit logs: {e}")

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
        """Retrieve audit logs with optional filtering and pagination.

        Args:
            namespace: Filter by namespace
            environment: Filter by environment
            action: Filter by action type
            limit: Maximum number of entries to return (max 1000)
            offset: Number of entries to skip for pagination
            user_id: Filter by user ID
            ip_address: Filter by IP address
            start_date: Filter entries after this ISO timestamp
            end_date: Filter entries before this ISO timestamp

        Returns:
            List of log entries in reverse chronological order (most recent first)
        """
        limit = min(max(1, limit), 1000)
        offset = max(0, offset)

        # Read entries with offset
        entries = list(self._read_lines_with_offset(
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

        # Return most recent first
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
        for _ in self._read_lines_with_offset(
            offset=0,
            limit=10000,  # Reasonable cap for counting
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


# Global audit logger instance
audit_logger = AuditLogger()
