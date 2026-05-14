"""
Step-up authentication for Secure Environment Manager.
Requires recent password re-entry for sensitive operations.
"""
from functools import wraps
from typing import Callable

from flask import Response, jsonify, request

from core.sessions import current_identity, _check_step_up_auth


def require_step_up_auth(fn: Callable) -> Callable:
    """Decorator requiring step-up authentication for sensitive operations.

    Step-up authentication is valid for 5 minutes after successful re-authentication.
    Required for operations like export, bulk import, and rollback.
    """
    @wraps(fn)
    def wrapper(namespace: str, environment: str, *args, **kwargs):
        record = current_identity(namespace, environment)
        session_id = record.get("id") if record else None

        if not session_id or not _check_step_up_auth(session_id):
            if request.accept_mimetypes["application/json"] >= request.accept_mimetypes["text/html"]:
                return jsonify({
                    "error": "Step-up authentication required",
                    "code": "STEP_UP_REQUIRED",
                    "action": "Re-authenticate to perform this action"
                }), 403
            return Response(
                "Step-up authentication required. POST password to /api/v1/{}/{} for temporary access.".format(namespace, environment),
                403,
                mimetype="text/plain",
            )
        return fn(namespace, environment, *args, **kwargs)
    return wrapper