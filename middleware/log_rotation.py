"""
Production-grade log rotation for Secure Environment Manager.
Provides rotating file handlers with size-based and time-based rotation.
"""
import gzip
import logging
import os
import shutil
from datetime import datetime, timedelta
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Log directories
LOGS_DIR = Path("logs")
ARCHIVES_DIR = Path("archives/logs")


def _ensure_log_dirs() -> None:
    """Ensure log directories exist. Called lazily on first use."""
    LOGS_DIR.mkdir(exist_ok=True)
    ARCHIVES_DIR.mkdir(exist_ok=True, parents=True)


def setup_log_rotation(
    app=None,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 10,
    _when: str = "midnight",  # reserved for future use
    _interval: int = 1,  # reserved for future use
) -> None:
    """Setup rotating loggers for the application.

    Args:
        app: Flask application instance (optional)
        max_bytes: Maximum size per log file before rotation
        backup_count: Number of backup files to keep
        _when: Reserved for timed rotation (currently unused)
        _interval: Reserved for timed rotation interval (currently unused)
    """
    _ensure_log_dirs()
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.INFO)
    app_handler = RotatingFileHandler(
        LOGS_DIR / "app.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    app_logger.addHandler(app_handler)

    # Error log (separate, higher severity)
    error_logger = logging.getLogger("app.error")
    error_logger.setLevel(logging.ERROR)
    error_handler = RotatingFileHandler(
        LOGS_DIR / "errors.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    error_logger.addHandler(error_handler)

    # Security log (for auth events, session changes)
    security_logger = logging.getLogger("app.security")
    security_logger.setLevel(logging.INFO)
    security_handler = RotatingFileHandler(
        LOGS_DIR / "security.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    security_handler.setLevel(logging.INFO)
    security_handler.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    security_logger.addHandler(security_handler)

    # Audit log (for audit events - separate from app audit_logger)
    audit_logger = logging.getLogger("app.audit")
    audit_logger.setLevel(logging.INFO)
    audit_handler = RotatingFileHandler(
        LOGS_DIR / "audit.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    audit_handler.setLevel(logging.INFO)
    audit_handler.setFormatter(logging.Formatter(
        "%(asctime)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    audit_logger.addHandler(audit_handler)

    # Access log (for API access tracking)
    access_logger = logging.getLogger("app.access")
    access_logger.setLevel(logging.INFO)
    access_handler = RotatingFileHandler(
        LOGS_DIR / "access.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    access_handler.setLevel(logging.INFO)
    access_handler.setFormatter(logging.Formatter(
        "%(asctime)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    access_logger.addHandler(access_handler)

    if app:
        app.logger.info("Log rotation initialized")


def get_logger(name: str) -> logging.Logger:
    """Get a named logger for the application.

    Args:
        name: Logger name (e.g., "app", "app.security", "app.audit")

    Returns:
        Logger instance
    """
    return logging.getLogger(name)


def archive_old_logs(days: int = 30) -> int:
    """Archive and compress old log files.

    Args:
        days: Number of days to keep before archiving

    Returns:
        Number of files archived
    """
    archived_count = 0
    cutoff = datetime.now() - timedelta(days=days)

    # Archive only rotated files like app.log.1 / errors.log.2 (not base files still open)
    for log_file in LOGS_DIR.glob("*.log.*"):
        if not log_file.is_file():
            continue

        # Only match rotated backups (e.g., app.log.1, app.log.2) not compressed archives
        if log_file.suffix not in (".1", ".2", ".3", ".4", ".5", ".6", ".7", ".8", ".9"):
            continue

        # Check modification time
        mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
        if mtime > cutoff:
            continue

        # Skip already archived files
        if log_file.suffix in (".gz", ".zip"):
            continue

        # Create archive path with timestamp
        archive_name = f"{log_file.stem}_{log_file.stat().st_mtime:.0f}.log.gz"
        archive_path = ARCHIVES_DIR / archive_name

        try:
            # Compress the file using shutil for efficiency
            with open(log_file, "rb") as f_in:
                with gzip.open(archive_path, "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)

            # Remove original if compression successful
            log_file.unlink()
            archived_count += 1
        except Exception:
            logger.exception("Archive operation failed for %s", log_file.name)
            continue

    return archived_count


def cleanup_old_archives(days: int = 90) -> int:
    """Remove old archived logs.

    Args:
        days: Number of days to keep archives

    Returns:
        Number of archives removed
    """
    removed_count = 0
    cutoff = datetime.now() - timedelta(days=days)

    for archive_file in ARCHIVES_DIR.glob("*.log.gz"):
        if not archive_file.is_file():
            continue

        mtime = datetime.fromtimestamp(archive_file.stat().st_mtime)
        if mtime > cutoff:
            continue

        try:
            archive_file.unlink()
            removed_count += 1
        except Exception:
            logger.exception("Cleanup operation failed for %s", archive_file.name)
            continue

    return removed_count


def get_log_stats() -> dict:
    """Get statistics about log files.

    Returns:
        Dictionary with log file stats
    """
    stats = {
        "logs": [],
        "archives": [],
        "total_size_mb": 0,
    }

    for log_file in LOGS_DIR.glob("*.log*"):
        if log_file.is_file():
            size_mb = log_file.stat().st_size / (1024 * 1024)
            mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
            stats["logs"].append({
                "name": log_file.name,
                "size_mb": round(size_mb, 2),
                "modified": mtime.isoformat(),
            })
            stats["total_size_mb"] += size_mb

    for archive_file in ARCHIVES_DIR.glob("*.log.gz"):
        if archive_file.is_file():
            size_mb = archive_file.stat().st_size / (1024 * 1024)
            mtime = datetime.fromtimestamp(archive_file.stat().st_mtime)
            stats["archives"].append({
                "name": archive_file.name,
                "size_mb": round(size_mb, 2),
                "modified": mtime.isoformat(),
            })

    stats["total_size_mb"] = round(stats["total_size_mb"], 2)
    return stats