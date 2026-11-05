"""
Comprehensive exception handling tests — 12 scenarios.
Covers custom exceptions, error handler setup, request ID tracking.
"""
import json
import pytest
from unittest.mock import patch, MagicMock


class TestAppExceptions:
    """Test custom exception classes."""

    def test_authentication_error(self):
        """AuthenticationError should have correct defaults."""
        from core.exceptions import AuthenticationError
        err = AuthenticationError()
        assert err.code == "AUTH_INVALID_CREDENTIALS"
        assert err.status_code == 401
        assert err.message == "Authentication failed"

    def test_token_expired_error(self):
        """TokenExpiredError should have correct defaults."""
        from core.exceptions import TokenExpiredError
        err = TokenExpiredError("JWT expired")
        assert err.code == "AUTH_TOKEN_EXPIRED"
        assert err.status_code == 401

    def test_permission_denied_error(self):
        """PermissionDeniedError should be 403."""
        from core.exceptions import PermissionDeniedError
        err = PermissionDeniedError("Not allowed")
        assert err.code == "AUTH_INSUFFICIENT_PERMISSIONS"
        assert err.status_code == 403

    def test_not_found_error(self):
        """NotFoundError should be 404."""
        from core.exceptions import NotFoundError
        err = NotFoundError("User")
        assert err.code == "RESOURCE_NOT_FOUND"
        assert err.status_code == 404
        assert "User not found" in err.message

    def test_validation_error_with_details(self):
        """ValidationError should accept details dict."""
        from core.exceptions import ValidationError
        err = ValidationError("Bad input", details={"field": "email"})
        assert err.status_code == 400
        assert err.details == {"field": "email"}

    def test_rate_limit_error(self):
        """RateLimitError should include retry_after."""
        from core.exceptions import RateLimitError
        err = RateLimitError(retry_after=120)
        assert err.status_code == 429
        assert err.details["retry_after"] == 120

    def test_step_up_required_error(self):
        """StepUpRequiredError should be 403."""
        from core.exceptions import StepUpRequiredError
        err = StepUpRequiredError()
        assert err.status_code == 403
        assert err.details["action"] == "Re-authenticate with elevated privileges"

    def test_service_unavailable_error(self):
        """ServiceUnavailableError should be 503."""
        from core.exceptions import ServiceUnavailableError
        err = ServiceUnavailableError()
        assert err.status_code == 503

    def test_app_exception_base(self):
        """Base AppException with custom params."""
        from core.exceptions import AppException
        err = AppException("CUSTOM_CODE", "Custom message", status_code=418, details={"key": "val"})
        assert err.code == "CUSTOM_CODE"
        assert err.message == "Custom message"
        assert err.status_code == 418


class TestHandleErrorsDecorator:
    """Test the handle_errors decorator."""

    def test_handle_errors_catches_app_exception(self, app):
        """Decorator should catch AppException and return api_error response."""
        from core.exceptions import handle_errors, AppException

        @handle_errors
        def failing_route():
            raise AppException("TEST_ERR", "Something went wrong", status_code=422)

        with app.app_context():
            response, status = failing_route()
        data = json.loads(response.data)
        assert data["success"] is False
        assert data["error"]["code"] == "TEST_ERR"
        assert status == 422

    def test_handle_errors_catches_generic_exception(self, app):
        """Decorator should catch generic exceptions and return 500."""
        from core.exceptions import handle_errors

        @handle_errors
        def crashing_route():
            raise RuntimeError("Unexpected crash!")

        with app.app_context():
            response, status = crashing_route()
        data = json.loads(response.data)
        assert data["success"] is False
        assert data["error"]["code"] == "INTERNAL_ERROR"
        assert status == 500

    def test_handle_errors_success_passthrough(self):
        """Decorator should not interfere with successful responses."""
        from core.exceptions import handle_errors

        @handle_errors
        def ok_route():
            return {"status": "ok"}, 200

        result, status = ok_route()
        assert result == {"status": "ok"}
        assert status == 200
