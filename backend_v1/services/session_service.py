"""
Session service wrapper for Secure Environment Manager.
Provides a higher-level interface to session management.
"""
from typing import Any, Dict, List, Optional

from core.sessions import (
    _generate_session_id,
    _register_session,
    _update_session_activity,
    _invalidate_session,
    _invalidate_all_sessions,
    _is_session_valid,
    _check_step_up_auth,
    _grant_step_up_auth,
    session_key_for,
    current_identity,
    mark_authenticated,
    clear_auth,
    get_active_sessions,
)
from core.constants import SESSION_MAX_LIFETIME, STEP_UP_AUTH_WINDOW


class SessionService:
    """High-level session management service.

    Wraps the core/sessions.py functions to provide a cleaner
    interface for session operations.
    """

    @staticmethod
    def create_session(namespace: str, environment: str) -> str:
        """Create a new session and return its ID.

        Args:
            namespace: The namespace for the session
            environment: The environment for the session

        Returns:
            The new session ID
        """
        return _register_session(namespace, environment)

    @staticmethod
    def validate_session(session_id: str) -> bool:
        """Check if a session is still valid.

        Args:
            session_id: The session ID to validate

        Returns:
            True if valid, False otherwise
        """
        return _is_session_valid(session_id)

    @staticmethod
    def update_activity(session_id: str) -> None:
        """Update the last activity timestamp for a session.

        Args:
            session_id: The session ID to update
        """
        _update_session_activity(session_id)

    @staticmethod
    def revoke_session(session_id: str) -> None:
        """Revoke/invalidate a specific session.

        Args:
            session_id: The session ID to revoke
        """
        _invalidate_session(session_id)

    @staticmethod
    def revoke_all_sessions() -> int:
        """Revoke all active sessions.

        Returns:
            Count of sessions that were revoked
        """
        return _invalidate_all_sessions()

    @staticmethod
    def check_step_up(session_id: str) -> bool:
        """Check if session has valid step-up authentication.

        Args:
            session_id: The session ID to check

        Returns:
            True if step-up auth is valid, False otherwise
        """
        return _check_step_up_auth(session_id)

    @staticmethod
    def grant_step_up(session_id: str) -> None:
        """Grant step-up authentication to a session.

        Args:
            session_id: The session ID to grant step-up to
        """
        _grant_step_up_auth(session_id)

    @staticmethod
    def get_identity(namespace: str, environment: str) -> Dict[str, Any]:
        """Get the current identity from session.

        Args:
            namespace: The namespace
            environment: The environment

        Returns:
            Dictionary with session identity info
        """
        return current_identity(namespace, environment)

    @staticmethod
    def authenticate(namespace: str, environment: str) -> None:
        """Mark a session as authenticated.

        Args:
            namespace: The namespace
            environment: The environment
        """
        mark_authenticated(namespace, environment)

    @staticmethod
    def deauthenticate(namespace: str, environment: str) -> None:
        """Clear authentication from session.

        Args:
            namespace: The namespace
            environment: The environment
        """
        clear_auth(namespace, environment)

    @staticmethod
    def get_session_key(namespace: str, environment: str) -> str:
        """Get the session key for a namespace/environment.

        Args:
            namespace: The namespace
            environment: The environment

        Returns:
            The session key string
        """
        return session_key_for(namespace, environment)

    @staticmethod
    def list_active_sessions() -> List[Dict[str, Any]]:
        """Get list of all active sessions.

        Returns:
            List of session info dictionaries
        """
        return get_active_sessions()

    @staticmethod
    def get_session_max_lifetime() -> Any:
        """Get the maximum session lifetime.

        Returns:
            SESSION_MAX_LIFETIME timedelta
        """
        return SESSION_MAX_LIFETIME

    @staticmethod
    def get_step_up_window() -> Any:
        """Get the step-up authentication window.

        Returns:
            STEP_UP_AUTH_WINDOW timedelta
        """
        return STEP_UP_AUTH_WINDOW


# Global session service instance
session_service = SessionService()