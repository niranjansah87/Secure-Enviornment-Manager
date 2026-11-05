"""
Comprehensive core auth tests — 16 scenarios.
Covers api_auth_ok, namespaces_visible_to_token, lockout management, token identification.
"""
import time
import pytest
from unittest.mock import patch, MagicMock


# =============================================================================
# api_auth_ok
# =============================================================================

class TestApiAuthOk:
    """Test the api_auth_ok function."""

    def test_no_token_returns_false(self):
        """No token should return False."""
        from core.auth import api_auth_ok
        assert api_auth_ok("test", None) is False

    def test_master_token_returns_true(self):
        """Master API token should authenticate."""
        from core.auth import api_auth_ok
        with patch('core.auth.settings') as mock_settings:
            mock_settings.master_api_token = "master-secret"
            result = api_auth_ok("any-ns", "master-secret")
            assert result is True

    def test_master_token_wrong_returns_false(self):
        """Wrong master token should not authenticate."""
        from core.auth import api_auth_ok
        with patch('core.auth.settings') as mock_settings:
            mock_settings.master_api_token = "master-secret"
            result = api_auth_ok("any-ns", "wrong-token")
            assert result is False

    def test_jwt_admin_returns_true(self):
        """JWT with is_admin=True should authenticate to any namespace."""
        from core.auth import api_auth_ok
        from core.jwt_auth import token_manager
        token = token_manager.create_access_token(
            session_id="test", is_admin=True, scopes=[]
        )
        result = api_auth_ok("any-namespace", token)
        assert result is True

    def test_jwt_wildcard_scopes_returns_true(self):
        """JWT with scopes=['*'] should authenticate to any namespace."""
        from core.auth import api_auth_ok
        from core.jwt_auth import token_manager
        token = token_manager.create_access_token(
            session_id="test", is_admin=False, scopes=["*"]
        )
        result = api_auth_ok("any-ns", token)
        assert result is True

    def test_jwt_namespace_scoped(self):
        """JWT scoped to specific namespace should only work there."""
        from core.auth import api_auth_ok
        from core.jwt_auth import token_manager
        token = token_manager.create_access_token(
            session_id="test", is_admin=False, scopes=["production"]
        )
        assert api_auth_ok("production", token) is True
        assert api_auth_ok("staging", token) is False

    def test_jwt_environment_scoped(self):
        """JWT scoped to specific environment should respect env-level scope."""
        from core.auth import api_auth_ok
        from core.jwt_auth import token_manager
        token = token_manager.create_access_token(
            session_id="test", is_admin=False, scopes=["main/prod"]
        )
        assert api_auth_ok("main", token, environment="prod") is True
        assert api_auth_ok("main", token, environment="dev") is False


# =============================================================================
# namespaces_visible_to_token
# =============================================================================

class TestNamespacesVisible:
    """Test namespaces_visible_to_token."""

    def test_master_token_sees_all(self):
        """Master token should see all namespaces."""
        from core.auth import namespaces_visible_to_token
        with patch('core.auth.settings') as mock_settings, \
             patch('core.auth._list_all_environments', return_value={"ns1": ["a"], "ns2": ["b"]}):
            mock_settings.master_api_token = "master"
            result = namespaces_visible_to_token("master")
            assert set(result) == {"ns1", "ns2"}

    def test_jwt_admin_sees_all(self):
        """Admin JWT should see all namespaces."""
        from core.auth import namespaces_visible_to_token
        from core.jwt_auth import token_manager
        with patch('core.auth._list_all_environments', return_value={"prod": ["main"], "staging": ["dev"]}):
            token = token_manager.create_access_token(session_id="s", is_admin=True)
            result = namespaces_visible_to_token(token)
            assert set(result) == {"prod", "staging"}

    def test_jwt_scoped_sees_subset(self):
        """Scoped JWT should see only its namespaces."""
        from core.auth import namespaces_visible_to_token
        from core.jwt_auth import token_manager
        with patch('core.auth._list_all_environments', return_value={"prod": [], "staging": [], "dev": []}):
            token = token_manager.create_access_token(
                session_id="s", is_admin=False, scopes=["prod", "dev"]
            )
            result = namespaces_visible_to_token(token)
            assert set(result) == {"prod", "dev"}

    def test_jwt_env_scoped_extracts_namespace(self):
        """Env-scoped JWT should extract namespace from 'ns/env' format."""
        from core.auth import namespaces_visible_to_token
        from core.jwt_auth import token_manager
        with patch('core.auth._list_all_environments', return_value={"main": [], "aisys": []}):
            token = token_manager.create_access_token(
                session_id="s", is_admin=False, scopes=["main/prod", "main/dev"]
            )
            result = namespaces_visible_to_token(token)
            assert set(result) == {"main"}


# =============================================================================
# Login Attempt Tracking
# =============================================================================

class TestLoginAttempts:
    """Test login attempt tracking and lockout."""

    def test_record_failed_attempt_increments(self):
        """Recording failures should increment counter."""
        from core.auth import record_failed_attempt, LOGIN_ATTEMPTS, reset_attempts
        LOGIN_ATTEMPTS.clear()
        # record_failed_attempt → track_failed_login → get_client_ip → request
        # reset_attempts → reset_login_failures → get_client_ip → request
        # Patch at the middleware source to avoid Flask context
        with patch('middleware.rate_limiter.get_client_ip', return_value='127.0.0.1'):
            record_failed_attempt("test_user")
        assert LOGIN_ATTEMPTS["test_user"]["fails"] == 1
        with patch('middleware.rate_limiter.get_client_ip', return_value='127.0.0.1'):
            reset_attempts("test_user")

    def test_lockout_after_max_attempts(self):
        """After max attempts, IP should be locked."""
        from core.auth import record_failed_attempt, is_locked, LOGIN_ATTEMPTS, reset_attempts
        from core.auth import MAX_LOGIN_ATTEMPTS
        LOGIN_ATTEMPTS.clear()
        with patch('middleware.rate_limiter.get_client_ip', return_value='127.0.0.1'):
            for _ in range(MAX_LOGIN_ATTEMPTS):
                record_failed_attempt("lockout_test")
        locked, until = is_locked("lockout_test")
        assert locked is True
        assert until is not None
        with patch('middleware.rate_limiter.get_client_ip', return_value='127.0.0.1'):
            reset_attempts("lockout_test")

    def test_reset_attempts_clears(self):
        """Resetting attempts clears the entry."""
        from core.auth import record_failed_attempt, reset_attempts, LOGIN_ATTEMPTS
        LOGIN_ATTEMPTS.clear()
        with patch('middleware.rate_limiter.get_client_ip', return_value='127.0.0.1'):
            record_failed_attempt("reset_test")
            reset_attempts("reset_test")
        assert "reset_test" not in LOGIN_ATTEMPTS

    def test_is_locked_unknown_identifier(self):
        """Unknown identifier is not locked."""
        from core.auth import is_locked
        locked, until = is_locked("unknown_identifier")
        assert locked is False
        assert until is None


# =============================================================================
# Token Identification
# =============================================================================

class TestTokenIdentification:
    """Test identify_token function."""

    def test_identify_none_returns_anonymous(self):
        """No token should be 'anonymous'."""
        from core.auth import identify_token
        assert identify_token(None) == "anonymous"

    def test_identify_master_token(self):
        """Master token should be identified."""
        from core.auth import identify_token
        with patch('core.auth.settings') as mock_settings:
            mock_settings.master_api_token = "master-key"
            assert identify_token("master-key") == "master_token"

    def test_identify_unknown_token(self):
        """Unknown token should be identified as such."""
        from core.auth import identify_token
        with patch('core.auth.settings') as mock_settings, \
             patch('core.auth._load_api_keys', return_value={}):
            mock_settings.master_api_token = None
            assert identify_token("random-token") == "unknown_token"
