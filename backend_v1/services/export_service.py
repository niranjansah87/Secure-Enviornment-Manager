"""
Export service for Secure Environment Manager.
Handles formatting variables for export in various formats.
"""
import json
from typing import Dict

import yaml


def format_as_env(data: Dict[str, str]) -> str:
    """Format variables as .env file content.

    Args:
        data: Dictionary of key-value pairs

    Returns:
        String in .env file format (KEY=value per line)
    """
    from core.constants import KEY_PATTERN

    lines = []
    for key, value in sorted(data.items()):
        if not KEY_PATTERN.match(key):
            continue
        safe_value = value.replace("\n", "\\n")
        lines.append(f"{key}={safe_value}")
    return "\n".join(lines)


def format_as_json(data: Dict[str, str], indent: int = 2) -> str:
    """Format variables as JSON.

    Args:
        data: Dictionary of key-value pairs
        indent: Number of spaces for indentation (default 2)

    Returns:
        JSON formatted string
    """
    return json.dumps(data, indent=indent)


def format_as_yaml(data: Dict[str, str]) -> str:
    """Format variables as YAML.

    Args:
        data: Dictionary of key-value pairs

    Returns:
        YAML formatted string
    """
    return yaml.dump(data, default_flow_style=False, allow_unicode=True)


class ExportService:
    """Service for exporting variables in various formats."""

    def __init__(self):
        self.supported_formats = ["env", "json", "yaml"]

    def export(
        self,
        data: Dict[str, str],
        format: str = "env"
    ) -> tuple[str, str]:
        """Export variables in the specified format.

        Args:
            data: Dictionary of key-value pairs
            format: Export format ("env", "json", or "yaml")

        Returns:
            Tuple of (content, mime_type)

        Raises:
            ValueError: If format is not supported
        """
        format = format.lower()

        if format == "env":
            return self._export_env(data)
        elif format == "json":
            return self._export_json(data)
        elif format == "yaml":
            return self._export_yaml(data)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _export_env(self, data: Dict[str, str]) -> tuple[str, str]:
        """Export as .env format."""
        return format_as_env(data), "text/plain; charset=utf-8"

    def _export_json(self, data: Dict[str, str]) -> tuple[str, str]:
        """Export as JSON format."""
        return format_as_json(data), "application/json; charset=utf-8"

    def _export_yaml(self, data: Dict[str, str]) -> tuple[str, str]:
        """Export as YAML format."""
        return format_as_yaml(data), "application/x-yaml; charset=utf-8"


# Global export service instance
export_service = ExportService()