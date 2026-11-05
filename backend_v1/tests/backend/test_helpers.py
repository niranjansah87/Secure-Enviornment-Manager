"""
Comprehensive helper utilities tests — 12 scenarios.
Covers segment validation, key patterns, read/write vars, metadata, formatting.
"""
import os
import json
import pytest
from unittest.mock import patch, MagicMock


class TestSegmentValidation:
    """Test namespace/environment segment validation."""

    def test_valid_segments_pass(self):
        """Valid segments should not abort."""
        from utils.helpers import validate_segments
        # Should not raise
        ns, env = validate_segments("production", "main")
        assert ns == "production"
        assert env == "main"

    def test_segment_with_dots_allowed(self):
        """Segments with single dots are allowed (not path traversal)."""
        from utils.helpers import validate_segments
        ns, env = validate_segments("my.namespace", "my.environment")
        assert ns == "my.namespace"
        assert env == "my.environment"

    def test_segment_with_consecutive_dots_aborts(self):
        """Segments with consecutive dots (path traversal) should abort 404."""
        from utils.helpers import validate_segments
        from flask import abort
        with pytest.raises(Exception):  # werkzeug abort raises an exception
            validate_segments("bad..namespace", "env")

    def test_segment_too_long_aborts(self):
        """Segments > 64 chars should abort."""
        from utils.helpers import validate_segments
        with pytest.raises(Exception):
            validate_segments("a" * 65, "env")


class TestKeyPattern:
    """Test KEY_PATTERN validation."""

    def test_valid_keys_match(self):
        """Valid key names should match pattern."""
        from core.constants import KEY_PATTERN
        assert KEY_PATTERN.match("DATABASE_URL") is not None
        assert KEY_PATTERN.match("API_KEY_123") is not None
        assert KEY_PATTERN.match("secret_token") is not None

    def test_invalid_keys_not_match(self):
        """Invalid key names should not match."""
        from core.constants import KEY_PATTERN
        assert KEY_PATTERN.match("") is None
        assert KEY_PATTERN.match("..env") is None
        assert KEY_PATTERN.match("key with spaces") is None


class TestNamespacedIdentifier:
    """Test namespaced_identifier helper."""

    def test_combines_namespace_and_environment(self):
        from utils.helpers import namespaced_identifier
        assert namespaced_identifier("prod", "main") == "prod:main"


class TestToEnvLines:
    """Test to_env_lines formatting."""

    def test_formats_key_value_pairs(self):
        """Should format key=value lines."""
        from utils.helpers import to_env_lines
        data = {"KEY1": "value1", "KEY2": "value2"}
        result = to_env_lines(data)
        assert "KEY1=value1" in result
        assert "KEY2=value2" in result

    def test_filters_invalid_keys(self):
        """Keys not matching KEY_PATTERN should be filtered out."""
        from utils.helpers import to_env_lines
        data = {"VALID_KEY": "yes", "bad key": "no"}
        result = to_env_lines(data)
        assert "VALID_KEY=yes" in result
        assert "bad key" not in result

    def test_escapes_newlines(self):
        """Newlines in values should be escaped."""
        from utils.helpers import to_env_lines
        data = {"MULTILINE": "line1\nline2"}
        result = to_env_lines(data)
        assert "line1\\nline2" in result


class TestFormatTimestamp:
    """Test format_timestamp helper."""

    def test_formats_datetime_to_utc_str(self):
        from utils.helpers import format_timestamp
        from datetime import datetime, timezone
        dt = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        result = format_timestamp(dt)
        assert "2024-01-15" in result
        assert "UTC" in result

    def test_none_returns_none(self):
        from utils.helpers import format_timestamp
        assert format_timestamp(None) is None


class TestWantsJsonResponse:
    """Test wants_json_response helper."""

    def test_api_path_returns_true(self, app):
        """API paths should prefer JSON."""
        from utils.helpers import wants_json_response
        with app.test_request_context('/api/v1/meta/environments',
                                       headers={'Accept': 'application/json'}):
            result = wants_json_response()
            assert result is True

    def test_non_api_path_with_html_pref_returns_false(self, app):
        """Non-API path with HTML preference returns False."""
        from utils.helpers import wants_json_response
        with app.test_request_context('/dashboard',
                                       headers={'Accept': 'text/html'}):
            result = wants_json_response()
            assert result is False
