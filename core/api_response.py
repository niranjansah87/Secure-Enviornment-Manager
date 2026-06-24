"""
Standardized API response helpers for enterprise-grade API contracts.
Ensures consistent response format across all endpoints.
"""
import uuid
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar, Optional
from flask import jsonify, Response

T = TypeVar('T')


@dataclass
class ApiMeta:
    """Metadata included in every API response."""
    request_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    version: str = "v1"


@dataclass
class ApiResponse(Generic[T]):
    """Standardized API response envelope.

    SUCCESS FORMAT:
    {
        "success": true,
        "data": {},
        "meta": {}
    }

    ERROR FORMAT:
    {
        "success": false,
        "error": {
            "code": "",
            "message": "",
            "details": {}
        },
        "meta": {}
    }
    """
    success: bool
    data: Optional[T] = None
    error: Optional[dict] = None
    meta: ApiMeta = field(default_factory=ApiMeta)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {
            "success": self.success,
            "meta": asdict(self.meta),
        }
        if self.success:
            result["data"] = self.data
        else:
            result["error"] = self.error
        return result

    def to_flask_response(self, status_code: int = 200) -> tuple[Response, int]:
        """Convert to Flask response tuple."""
        return jsonify(self.to_dict()), status_code


@dataclass
class PaginatedData:
    """Pagination metadata for list responses."""
    offset: int
    limit: int
    total: int
    has_more: bool


def api_response(
    data: Any = None,
    status_code: int = 200,
    request_id: Optional[str] = None
) -> tuple[Response, int]:
    """Create a successful API response.

    Usage:
        return api_response({"key": "value"})
        return api_response({"secrets": [...]}, status_code=201)
    """
    meta = ApiMeta()
    if request_id:
        meta.request_id = request_id

    response = ApiResponse(
        success=True,
        data=data,
        meta=meta
    )
    return response.to_flask_response(status_code)


def paginated_response(
    data: list,
    total: int,
    offset: int = 0,
    limit: int = 100,
    request_id: Optional[str] = None
) -> tuple[Response, int]:
    """Create a paginated API response.

    Usage:
        return paginated_response(secrets, total=50, offset=0, limit=20)
    """
    meta = ApiMeta()
    if request_id:
        meta.request_id = request_id

    has_more = offset + len(data) < total

    response = ApiResponse(
        success=True,
        data={
            "items": data,
            "pagination": asdict(PaginatedData(
                offset=offset,
                limit=limit,
                total=total,
                has_more=has_more
            ))
        },
        meta=meta
    )
    return response.to_flask_response(200)


# Error codes for consistent error handling
class ErrorCode:
    # Authentication errors (1xxx)
    AUTH_REQUIRED = ("AUTH_REQUIRED", "Authentication required")
    AUTH_INVALID_TOKEN = ("AUTH_INVALID_TOKEN", "Invalid or expired token")
    AUTH_TOKEN_EXPIRED = ("AUTH_TOKEN_EXPIRED", "Token has expired")
    AUTH_REFRESH_FAILED = ("AUTH_REFRESH_FAILED", "Failed to refresh token")
    AUTH_INVALID_CREDENTIALS = ("AUTH_INVALID_CREDENTIALS", "Invalid credentials")
    AUTH_ACCOUNT_LOCKED = ("AUTH_ACCOUNT_LOCKED", "Account is locked")
    AUTH_SESSION_EXPIRED = ("AUTH_SESSION_EXPIRED", "Session has expired")
    AUTH_SESSION_REVOKED = ("AUTH_SESSION_REVOKED", "Session has been revoked")
    AUTH_INSUFFICIENT_PERMISSIONS = ("AUTH_INSUFFICIENT_PERMISSIONS", "Insufficient permissions")

    # Resource errors (2xxx)
    RESOURCE_NOT_FOUND = ("RESOURCE_NOT_FOUND", "Resource not found")
    RESOURCE_ALREADY_EXISTS = ("RESOURCE_ALREADY_EXISTS", "Resource already exists")
    RESOURCE_LIMIT_EXCEEDED = ("RESOURCE_LIMIT_EXCEEDED", "Resource limit exceeded")

    # Validation errors (3xxx)
    VALIDATION_ERROR = ("VALIDATION_ERROR", "Validation failed")
    VALIDATION_INVALID_FORMAT = ("VALIDATION_INVALID_FORMAT", "Invalid format")
    VALIDATION_MISSING_FIELD = ("VALIDATION_MISSING_FIELD", "Required field missing")

    # Rate limiting (4xxx)
    RATE_LIMIT_EXCEEDED = ("RATE_LIMIT_EXCEEDED", "Rate limit exceeded")
    RATE_LIMIT_RETRY_AFTER = ("RATE_LIMIT_RETRY_AFTER", "Try again later")

    # Server errors (5xxx)
    INTERNAL_ERROR = ("INTERNAL_ERROR", "Internal server error")
    SERVICE_UNAVAILABLE = ("SERVICE_UNAVAILABLE", "Service temporarily unavailable")
    DATABASE_ERROR = ("DATABASE_ERROR", "Database operation failed")

    # Step-up auth (6xxx)
    STEP_UP_REQUIRED = ("STEP_UP_REQUIRED", "Step-up authentication required")
    STEP_UP_FAILED = ("STEP_UP_FAILED", "Step-up authentication failed")

    @classmethod
    def get_message(cls, code: str) -> str:
        """Get error message for a code."""
        for attr in dir(cls):
            if attr.isupper():
                value = getattr(cls, attr)
                if isinstance(value, tuple) and value[0] == code:
                    return value[1]
        return "Unknown error"


def api_error(
    code: str,
    message: Optional[str] = None,
    details: Optional[dict] = None,
    status_code: int = 400,
    request_id: Optional[str] = None
) -> tuple[Response, int]:
    """Create an error API response.

    Usage:
        return api_error("AUTH_INVALID_TOKEN", status_code=401)
        return api_error("RESOURCE_NOT_FOUND", message="Secret not found", status_code=404)
    """
    meta = ApiMeta()
    if request_id:
        meta.request_id = request_id

    error_message = message or ErrorCode.get_message(code)

    response = ApiResponse(
        success=False,
        error={
            "code": code,
            "message": error_message,
            "details": details or {}
        },
        meta=meta
    )
    return response.to_flask_response(status_code)


def get_request_id() -> str:
    """Get or generate a request ID for the current request."""
    from flask import request, g
    # Check if already set
    if hasattr(g, 'request_id'):
        return g.request_id
    # Check header
    request_id = request.headers.get('X-Request-ID')
    if request_id:
        return request_id[:16]
    # Generate new
    request_id = uuid.uuid4().hex[:16]
    return request_id


def set_request_id():
    """Set request ID in Flask g object for the current request."""
    from flask import g, request
    g.request_id = request.headers.get('X-Request-ID', uuid.uuid4().hex[:16])