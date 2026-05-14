"""
Centralized error handling middleware for enterprise-grade API.

Provides:
- Consistent error response format
- Request ID tracking
- Structured logging
- Custom exception types
"""
import logging
import traceback
import uuid
from dataclasses import dataclass
from functools import wraps
from typing import Optional, Callable

from flask import Flask, Request, request, g
from werkzeug.exceptions import HTTPException

from core.api_response import (
    api_error,
    ErrorCode,
    ApiMeta,
    ApiResponse,
    get_request_id,
)


logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[dict] = None
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class AuthenticationError(AppException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed", details: Optional[dict] = None):
        super().__init__(
            ErrorCode.AUTH_INVALID_CREDENTIALS[0],
            message,
            status_code=401,
            details=details
        )


class TokenExpiredError(AppException):
    """Raised when token has expired."""

    def __init__(self, message: str = "Token has expired"):
        super().__init__(
            ErrorCode.AUTH_TOKEN_EXPIRED[0],
            message,
            status_code=401
        )


class SessionExpiredError(AppException):
    """Raised when session has expired."""

    def __init__(self, message: str = "Session has expired"):
        super().__init__(
            ErrorCode.AUTH_SESSION_EXPIRED[0],
            message,
            status_code=401
        )


class PermissionDeniedError(AppException):
    """Raised when user lacks required permissions."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS[0],
            message,
            status_code=403
        )


class NotFoundError(AppException):
    """Raised when a resource is not found."""

    def __init__(self, resource: str = "Resource"):
        super().__init__(
            ErrorCode.RESOURCE_NOT_FOUND[0],
            f"{resource} not found",
            status_code=404
        )


class ValidationError(AppException):
    """Raised when input validation fails."""

    def __init__(self, message: str = "Validation failed", details: Optional[dict] = None):
        super().__init__(
            ErrorCode.VALIDATION_ERROR[0],
            message,
            status_code=400,
            details=details
        )


class RateLimitError(AppException):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(
            ErrorCode.RATE_LIMIT_EXCEEDED[0],
            message,
            status_code=429,
            details={"retry_after": retry_after}
        )


class StepUpRequiredError(AppException):
    """Raised when step-up authentication is required."""

    def __init__(self, message: str = "Step-up authentication required"):
        super().__init__(
            ErrorCode.STEP_UP_REQUIRED[0],
            message,
            status_code=403,
            details={"action": "Re-authenticate with elevated privileges"}
        )


class ServiceUnavailableError(AppException):
    """Raised when a service is temporarily unavailable."""

    def __init__(self, message: str = "Service temporarily unavailable"):
        super().__init__(
            ErrorCode.SERVICE_UNAVAILABLE[0],
            message,
            status_code=503
        )


def get_request_logger() -> logging.Logger:
    """Get logger with request context."""
    return logger


def setup_error_handlers(app: Flask) -> None:
    """Register error handlers with the Flask app."""

    @app.before_request
    def before_request():
        """Set up request context."""
        g.request_id = request.headers.get('X-Request-ID', uuid.uuid4().hex[:16])
        g.request_start = __import__('time').time()

    @app.after_request
    def after_request(response):
        """Add request ID to response headers."""
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
        return response

    @app.errorhandler(AppException)
    def handle_app_exception(error: AppException):
        """Handle application-specific exceptions."""
        logger.warning(
            f"App exception: {error.code} - {error.message} | "
            f"request_id={getattr(g, 'request_id', 'unknown')} | "
            f"path={request.path}"
        )
        return api_error(
            code=error.code,
            message=error.message,
            details=error.details,
            status_code=error.status_code,
            request_id=getattr(g, 'request_id', None)
        )

    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors."""
        if request.path.startswith('/api/'):
            return api_error(
                ErrorCode.RESOURCE_NOT_FOUND[0],
                message=f"Endpoint not found: {request.path}",
                status_code=404,
                request_id=getattr(g, 'request_id', None)
            )
        return error

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle 405 errors."""
        if request.path.startswith('/api/'):
            return api_error(
                ErrorCode.VALIDATION_ERROR[0],
                message=f"Method not allowed: {request.method}",
                status_code=405,
                request_id=getattr(g, 'request_id', None)
            )
        return error

    @app.errorhandler(429)
    def handle_rate_limit(error):
        """Handle 429 rate limit errors."""
        if request.path.startswith('/api/'):
            retry_after = int(error.description) if error.description.isdigit() else 60
            return api_error(
                ErrorCode.RATE_LIMIT_EXCEEDED[0],
                message="Too many requests",
                details={"retry_after": retry_after},
                status_code=429,
                request_id=getattr(g, 'request_id', None)
            )
        return error

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error: Exception):
        """Handle unexpected exceptions."""
        request_id = getattr(g, 'request_id', 'unknown')

        # Log full traceback at error level
        logger.error(
            f"Unexpected error: {str(error)} | "
            f"request_id={request_id} | "
            f"path={request.path} | "
            f"method={request.method}\n"
            f"{traceback.format_exc()}"
        )

        # Return sanitized error for API requests
        if request.path.startswith('/api/'):
            return api_error(
                ErrorCode.INTERNAL_ERROR[0],
                message="An unexpected error occurred",
                status_code=500,
                request_id=request_id
            )

        # Let Flask handle non-API errors normally
        raise error


def handle_errors(f: Callable) -> Callable:
    """Decorator to handle errors within a route function.

    Usage:
        @app.route('/api/test')
        @handle_errors
        def test_route():
            if some_condition:
                raise NotFoundError("User")
            return {"status": "ok"}
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except AppException as e:
            return api_error(
                code=e.code,
                message=e.message,
                details=e.details,
                status_code=e.status_code,
                request_id=getattr(g, 'request_id', None)
            )
        except HTTPException as e:
            # Let Werkzeug HTTP exceptions propagate
            raise e
        except Exception as e:
            logger.error(
                f"Unhandled error in {f.__name__}: {str(e)} | "
                f"request_id={getattr(g, 'request_id', 'unknown')}\n"
                f"{traceback.format_exc()}"
            )
            return api_error(
                ErrorCode.INTERNAL_ERROR[0],
                message="An unexpected error occurred",
                status_code=500,
                request_id=getattr(g, 'request_id', None)
            )

    return decorated