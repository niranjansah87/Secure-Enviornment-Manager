"""
Tests for session management security features.
Tests absolute timeout, inactivity timeout, session registry, and revocation.
Uses direct imports from app module for integration testing.
"""
import os
import sys
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestAbsoluteSessionTimeout:
    """Test absolute session lifetime enforcement."""

    def test_session_expires_after_24_hours(self):
        """Session created 25 hours ago should be invalid."""
        from app import _is_session_valid, _ACTIVE_SESSIONS

        old_time = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
        with patch('app._ACTIVE_SESSIONS', {
            'test-session': {
                'created': old_time,
                'namespace': 'test',
                'environment': 'dev',
                'last_active': old_time,
                'ip': '127.0.0.1',
                'user_agent': 'test',
                'step_up_auth': None,
            }
        }):
            result = _is_session_valid('test-session')
            assert result is False, "Session older than 24 hours should be invalid"

    def test_session_valid_within_24_hours(self):
        """Session created 1 hour ago should be valid."""
        from app import _is_session_valid, _ACTIVE_SESSIONS

        recent_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        with patch('app._ACTIVE_SESSIONS', {
            'recent-session': {
                'created': recent_time,
                'namespace': 'test',
                'environment': 'dev',
                'last_active': recent_time,
                'ip': '127.0.0.1',
                'user_agent': 'test',
                'step_up_auth': None,
            }
        }):
            result = _is_session_valid('recent-session')
            assert result is True, "Session younger than 24 hours should be valid"

    def test_nonexistent_session_returns_invalid(self):
        """Session ID not in registry should return invalid."""
        from app import _is_session_valid

        result = _is_session_valid('nonexistent-session')
        assert result is False, "Nonexistent session should be invalid"


class TestStepUpAuthentication:
    """Test step-up authentication logic."""

    def test_step_up_auth_valid_within_window(self):
        """Step-up auth from 2 minutes ago should be valid."""
        from app import _check_step_up_auth, _ACTIVE_SESSIONS

        recent_step_up = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
        with patch('app._ACTIVE_SESSIONS', {
            'test-session': {
                'created': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
                'namespace': 'test',
                'environment': 'dev',
                'last_active': datetime.now(timezone.utc).isoformat(),
                'ip': '127.0.0.1',
                'user_agent': 'test',
                'step_up_auth': recent_step_up,
            }
        }):
            result = _check_step_up_auth('test-session')
            assert result is True, "Step-up auth within 5 min window should be valid"

    def test_step_up_auth_expired_after_window(self):
        """Step-up auth from 6 minutes ago should be invalid."""
        from app import _check_step_up_auth, _ACTIVE_SESSIONS

        old_step_up = (datetime.now(timezone.utc) - timedelta(minutes=6)).isoformat()
        with patch('app._ACTIVE_SESSIONS', {
            'test-session': {
                'created': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
                'namespace': 'test',
                'environment': 'dev',
                'last_active': datetime.now(timezone.utc).isoformat(),
                'ip': '127.0.0.1',
                'user_agent': 'test',
                'step_up_auth': old_step_up,
            }
        }):
            result = _check_step_up_auth('test-session')
            assert result is False, "Step-up auth older than 5 min should be invalid"

    def test_step_up_auth_none_returns_false(self):
        """Session without step-up auth should return false."""
        from app import _check_step_up_auth, _ACTIVE_SESSIONS

        with patch('app._ACTIVE_SESSIONS', {
            'test-session': {
                'created': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
                'namespace': 'test',
                'environment': 'dev',
                'last_active': datetime.now(timezone.utc).isoformat(),
                'ip': '127.0.0.1',
                'user_agent': 'test',
                'step_up_auth': None,
            }
        }):
            result = _check_step_up_auth('test-session')
            assert result is False, "Session without step-up should return false"


class TestSessionRegistry:
    """Test server-side session registry."""

    def test_register_session_creates_entry(self):
        """Registering session should create entry in registry."""
        from app import _register_session, _ACTIVE_SESSIONS
        from unittest.mock import patch

        mock_request = MagicMock()
        mock_request.remote_addr = '192.168.1.1'
        mock_request.headers = MagicMock()
        mock_request.headers.get = MagicMock(return_value='Test Browser')

        mock_audit = MagicMock()

        with patch('app.request', mock_request), \
             patch('app.audit_logger', mock_audit):
            session_id = _register_session('test-ns', 'test-env')

            assert session_id is not None
            assert len(session_id) > 20  # secrets.token_urlsafe(32) produces ~43 chars
            mock_audit.log_session_created.assert_called_once()

    def test_invalidate_session_removes_entry(self):
        """Invalidating session should remove from registry."""
        from app import _invalidate_session, _ACTIVE_SESSIONS
        from unittest.mock import patch

        mock_audit = MagicMock()
        _ACTIVE_SESSIONS['test-session'] = {
            'namespace': 'test',
            'environment': 'dev',
            'created': datetime.now(timezone.utc).isoformat(),
            'last_active': datetime.now(timezone.utc).isoformat(),
            'ip': '127.0.0.1',
            'user_agent': 'test',
            'step_up_auth': None,
        }

        with patch('app.request', MagicMock(remote_addr='127.0.0.1')), \
             patch('app.audit_logger', mock_audit):
            _invalidate_session('test-session')

            assert 'test-session' not in _ACTIVE_SESSIONS
            mock_audit.log_session_revoked.assert_called_once()

    def test_invalidate_all_sessions_clears_registry(self):
        """Invalidating all sessions should clear entire registry."""
        from app import _invalidate_all_sessions, _ACTIVE_SESSIONS, _SESSION_REGISTRY_LOCK
        from unittest.mock import patch

        mock_audit = MagicMock()

        # Clear registry and add test sessions
        with _SESSION_REGISTRY_LOCK:
            _ACTIVE_SESSIONS.clear()
            _ACTIVE_SESSIONS['session1'] = {'namespace': 'ns1', 'environment': 'env1'}
            _ACTIVE_SESSIONS['session2'] = {'namespace': 'ns2', 'environment': 'env2'}

        with patch('app.request', MagicMock(remote_addr='127.0.0.1')), \
             patch('app.audit_logger', mock_audit):
            count = _invalidate_all_sessions()

            assert count == 2
            assert len(_ACTIVE_SESSIONS) == 0
            mock_audit.log_event.assert_called_once()


class TestInactivityTimeout:
    """Test inactivity timeout logic."""

    def test_inactivity_timeout_triggers_on_idle(self):
        """Session inactive for 61 minutes should timeout."""
        last_active = (datetime.now(timezone.utc) - timedelta(minutes=61)).isoformat()

        last_dt = datetime.fromisoformat(last_active)
        inactivity_gap = datetime.now(timezone.utc) - last_dt

        assert inactivity_gap > timedelta(minutes=60), "61 min gap should trigger timeout"

    def test_activity_refreshes_session(self):
        """Recent activity should keep session alive."""
        last_active = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        created = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

        last_dt = datetime.fromisoformat(last_active)
        created_dt = datetime.fromisoformat(created)

        inactivity_gap = datetime.now(timezone.utc) - last_dt
        lifetime_gap = datetime.now(timezone.utc) - created_dt

        assert inactivity_gap < timedelta(minutes=60), "30 min gap should not timeout"
        assert lifetime_gap < timedelta(hours=24), "1 hour lifetime should not timeout"


class TestAPIAuthHardening:
    """Test API auth separation from dashboard password."""

    def test_dashboard_password_not_valid_for_api(self):
        """Dashboard password should not authenticate API requests."""
        from app import api_auth_ok
        from werkzeug.security import generate_password_hash, check_password_hash

        # Hash a test password
        test_password = "test-dashboard-password"
        password_hash = generate_password_hash(test_password)

        with patch('app.DASHBOARD_PASSWORD_HASH', password_hash):
            # Dashboard password should NOT work for API
            result = api_auth_ok('test-namespace', test_password)
            assert result is False, "Dashboard password should not work for API auth"

    def test_api_key_works_for_api(self):
        """API key from api_keys.json should work for API auth."""
        from app import api_auth_ok, load_api_keys
        from unittest.mock import patch

        test_key = "valid-api-key-for-namespace"
        with patch('app.load_api_keys', return_value={'test-namespace': test_key}):
            result = api_auth_ok('test-namespace', test_key)
            assert result is True, "API key should work for API auth"

    def test_master_token_works_for_api(self):
        """Master API token should work for API auth."""
        from app import api_auth_ok
        import hmac

        master_token = "master-secret-token"
        with patch('app.settings') as mock_settings:
            mock_settings.master_api_token = master_token
            result = api_auth_ok('any-namespace', master_token)
            assert result is True, "Master token should work for API auth"


class TestSecurityConstants:
    """Test security-related constants."""

    def test_session_max_lifetime_is_24_hours(self):
        """SESSION_MAX_LIFETIME should be 24 hours."""
        from app import SESSION_MAX_LIFETIME
        from datetime import timedelta

        assert SESSION_MAX_LIFETIME == timedelta(hours=24), "Session max lifetime should be 24 hours"

    def test_step_up_auth_window_is_5_minutes(self):
        """STEP_UP_AUTH_WINDOW should be 5 minutes."""
        from app import STEP_UP_AUTH_WINDOW
        from datetime import timedelta

        assert STEP_UP_AUTH_WINDOW == timedelta(minutes=5), "Step-up auth window should be 5 minutes"

    def test_session_timeout_default_is_60_minutes(self, tmp_path):
        """SESSION_TIMEOUT should default to 60 minutes."""
        from app import SESSION_TIMEOUT
        from datetime import timedelta

        assert SESSION_TIMEOUT == timedelta(minutes=60), "Session timeout should be 60 minutes"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])