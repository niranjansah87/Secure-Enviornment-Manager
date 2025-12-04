# audit_logger.py
"""
Audit logging system for tracking all changes to environment variables
and authentication events.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional
import hashlib

logger = logging.getLogger(__name__)


class AuditLogger:
    """Handles audit logging for all system events"""
    
    def __init__(self, log_dir: str = "audit_logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.log_file = self.log_dir / "audit.jsonl"
    
    def _get_timestamp(self) -> str:
        """Get current UTC timestamp in ISO format"""
        return datetime.now(timezone.utc).isoformat()
    
    def _hash_value(self, value: str) -> str:
        """Create SHA-256 hash of a value for audit trail"""
        return hashlib.sha256(value.encode()).hexdigest()[:16]
    
    def _write_log(self, log_entry: Dict[str, Any]):
        """Write log entry to file"""
        try:
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
        """Log successful login"""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "LOGIN_SUCCESS",
            "namespace": namespace,
            "environment": environment,
            "resource": "authentication",
            "user_id": user_id,
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
        """Log failed login attempt"""
        log_entry = {
            "timestamp": self._get_timestamp(),
            "action": "LOGIN_FAILURE",
            "namespace": namespace,
            "environment": environment,
            "resource": "authentication",
            "user_id": "anonymous",
            "ip_address": ip_address,
            "details": {
                "reason": reason
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

    def get_logs(
        self,
        namespace: Optional[str] = None,
        environment: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100
    ) -> list[Dict[str, Any]]:
        """Retrieve audit logs with optional filtering"""
        logs = []
        
        if not self.log_file.exists():
            return logs
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        
                        # Apply filters
                        if namespace and log_entry.get('namespace') != namespace:
                            continue
                        if environment and log_entry.get('environment') != environment:
                            continue
                        if action and log_entry.get('action') != action:
                            continue
                        
                        logs.append(log_entry)
                        
                        if len(logs) >= limit:
                            break
                    except json.JSONDecodeError:
                        continue
            
            # Return most recent first
            return list(reversed(logs))
        except Exception as e:
            logger.error(f"Failed to read audit logs: {e}")
            return []


# Global audit logger instance
audit_logger = AuditLogger()
