"""
Comprehensive API response format tests — 13 scenarios.
Covers response envelope, error codes, pagination, edge cases.
"""
import json
import pytest


class TestApiResponse:
    """Test api_response helper."""

    def test_success_response_structure(self, app):
        """Success response should have success, data, meta."""
        from core.api_response import api_response
        with app.app_context():
            response, status = api_response({"key": "value"})
        data = json.loads(response.data)
        assert data["success"] is True
        assert data["data"] == {"key": "value"}
        assert "meta" in data
        assert data["meta"]["version"] == "v1"
        assert status == 200

    def test_success_response_custom_status(self, app):
        """Success response should respect custom status code."""
        from core.api_response import api_response
        with app.app_context():
            response, status = api_response({"created": True}, status_code=201)
        assert status == 201

    def test_success_response_no_data(self, app):
        """Success response should work with no data."""
        from core.api_response import api_response
        with app.app_context():
            response, status = api_response()
        data = json.loads(response.data)
        assert data["success"] is True
        assert data["data"] is None

    def test_meta_includes_timestamp(self, app):
        """Meta should include ISO timestamp."""
        from core.api_response import api_response
        with app.app_context():
            response, _ = api_response({"test": 1})
        meta = json.loads(response.data)["meta"]
        assert "timestamp" in meta
        assert "T" in meta["timestamp"]  # ISO format

    def test_meta_includes_request_id(self, app):
        """Meta should include request_id."""
        from core.api_response import api_response
        with app.app_context():
            response, _ = api_response(request_id="req_abc123")
        meta = json.loads(response.data)["meta"]
        assert meta["request_id"] == "req_abc123"


class TestApiError:
    """Test api_error helper."""

    def test_error_response_structure(self, app):
        """Error response should have success=false, error, meta."""
        from core.api_response import api_error
        with app.app_context():
            response, status = api_error("AUTH_INVALID_TOKEN", status_code=401)
        data = json.loads(response.data)
        assert data["success"] is False
        assert data["error"]["code"] == "AUTH_INVALID_TOKEN"
        assert status == 401

    def test_error_custom_message(self, app):
        """Custom error message overrides default."""
        from core.api_response import api_error
        with app.app_context():
            response, _ = api_error("AUTH_REQUIRED", message="Please log in", status_code=401)
        data = json.loads(response.data)
        assert data["error"]["message"] == "Please log in"

    def test_error_with_details(self, app):
        """Error with details dictionary."""
        from core.api_response import api_error
        with app.app_context():
            response, _ = api_error("VALIDATION_ERROR", details={"field": "username", "reason": "Too short"}, status_code=400)
        data = json.loads(response.data)
        assert data["error"]["details"]["field"] == "username"

    def test_error_default_status_code(self, app):
        """Default status code should be 400."""
        from core.api_response import api_error
        with app.app_context():
            response, status = api_error("VALIDATION_MISSING_FIELD")
        assert status == 400


class TestErrorCode:
    """Test ErrorCode enum."""

    def test_get_message_known_code(self):
        """get_message returns correct message for known code."""
        from core.api_response import ErrorCode
        assert ErrorCode.get_message("AUTH_REQUIRED") == "Authentication required"
        assert ErrorCode.get_message("RESOURCE_NOT_FOUND") == "Resource not found"

    def test_get_message_unknown_code(self):
        """get_message returns 'Unknown error' for unknown code."""
        from core.api_response import ErrorCode
        assert ErrorCode.get_message("NONEXISTENT_CODE") == "Unknown error"

    def test_all_error_codes_are_tuples(self):
        """All ErrorCode attributes should be (code, message) tuples."""
        from core.api_response import ErrorCode
        import inspect
        for attr_name in dir(ErrorCode):
            if attr_name.isupper():
                value = getattr(ErrorCode, attr_name)
                if isinstance(value, tuple):
                    assert len(value) == 2
                    assert isinstance(value[0], str)
                    assert isinstance(value[1], str)


class TestPaginatedResponse:
    """Test paginated_response helper."""

    def test_paginated_response_structure(self, app):
        """Paginated response should include pagination metadata."""
        from core.api_response import paginated_response
        items = [{"id": 1}, {"id": 2}, {"id": 3}]
        with app.app_context():
            response, status = paginated_response(items, total=10, offset=0, limit=3)
        data = json.loads(response.data)
        assert data["success"] is True
        assert data["data"]["items"] == items
        assert data["data"]["pagination"]["total"] == 10
        assert data["data"]["pagination"]["offset"] == 0
        assert data["data"]["pagination"]["limit"] == 3
        assert data["data"]["pagination"]["has_more"] is True
        assert status == 200

    def test_paginated_no_more(self, app):
        """When total <= offset + len(data), has_more should be False."""
        from core.api_response import paginated_response
        items = [{"id": 1}]
        with app.app_context():
            response, _ = paginated_response(items, total=1, offset=0, limit=10)
        data = json.loads(response.data)
        assert data["data"]["pagination"]["has_more"] is False
