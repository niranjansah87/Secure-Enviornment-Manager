# services/audit_file_logger.py
"""
Low-level file operations for audit logging.
Handles append-only writes with automatic rotation.
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import threading

from services.audit_constants import MAX_LOG_FILE_SIZE_BYTES, MAX_ROTATED_FILES

logger = logging.getLogger(__name__)


class AuditFileLogger:
    """Handles low-level file I/O for audit logs.

    Provides:
    - Append-only writes with write lock
    - Automatic rotation when file exceeds size limit
    - Cleanup of old rotated files
    """

    def __init__(self, log_dir: str = "audit_logs", log_file_name: str = "audit.jsonl"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.log_file = self.log_dir / log_file_name
        self._write_lock = threading.Lock()

    def _get_timestamp(self) -> str:
        """Get current UTC timestamp in ISO format."""
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

            # Atomic rotate: rename current file to rotated path
            os.replace(self.log_file, rotated_path)

            # Create fresh empty log file for new writes
            self.log_file.touch()

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

    def write_entry(self, log_entry: dict):
        """Write log entry to file, rotating if necessary."""
        try:
            with self._write_lock:
                self._rotate_if_needed()
                with open(self.log_file, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

    def read_entries(
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
                    try:
                        log_entry = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue

                    # Apply filters first
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

                    # Only count matching entries toward offset
                    if skipped < offset:
                        skipped += 1
                        continue

                    if yielded >= limit:
                        break

                    yielded += 1
                    yield log_entry

        except Exception as e:
            logger.error(f"Failed to read audit logs: {e}")