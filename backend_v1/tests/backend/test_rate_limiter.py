"""
Brute-force login protection tests — 15 scenarios.
Covers login failure tracking, IP lockout, client IP resolution.
"""
import time
import pytest
from unittest.mock import patch


class TestLoginFailureTracking:
    """Test login failure tracking and IP lockout."""

    def setup_method(self):
        from middleware.rate_limiter import LOGIN_FAILURES, _FAILURE_LOCK
        with _FAILURE_LOCK:
            LOGIN_FAILURES.clear()

    def test_first_failure_not_locked(self):
        from middleware.rate_limiter import track_failed_login, is_ip_locked, get_login_failure_count
        with patch('middleware.rate_limiter.get_client_ip', return_value='192.168.1.100'):
            track_failed_login()
            assert is_ip_locked() is False
            assert get_login_failure_count() == 1

    def test_five_failures_locks_ip(self):
        from middleware.rate_limiter import track_failed_login, is_ip_locked
        with patch('middleware.rate_limiter.get_client_ip', return_value='192.168.1.200'):
            for _ in range(5):
                track_failed_login()
            assert is_ip_locked() is True

    def test_sixth_failure_returns_true(self):
        from middleware.rate_limiter import track_failed_login
        with patch('middleware.rate_limiter.get_client_ip', return_value='10.10.10.10'):
            for _ in range(5):
                track_failed_login()
            result = track_failed_login()
            assert result is True

    def test_reset_clears_failures(self):
        from middleware.rate_limiter import track_failed_login, reset_login_failures, get_login_failure_count
        with patch('middleware.rate_limiter.get_client_ip', return_value='172.16.0.1'):
            for _ in range(4):
                track_failed_login()
            reset_login_failures()
            assert get_login_failure_count() == 0

    def test_different_ips_separate_tracking(self):
        from middleware.rate_limiter import track_failed_login, is_ip_locked
        with patch('middleware.rate_limiter.get_client_ip', return_value='1.1.1.1'):
            for _ in range(5):
                track_failed_login()
        with patch('middleware.rate_limiter.get_client_ip', return_value='2.2.2.2'):
            assert is_ip_locked() is False

    def test_lockout_timeout_resets(self):
        from middleware.rate_limiter import LOGIN_FAILURES, _FAILURE_LOCK, is_ip_locked, get_login_failure_count
        with _FAILURE_LOCK:
            LOGIN_FAILURES['3.3.3.3'] = (5, time.time() - 1000)
        with patch('middleware.rate_limiter.get_client_ip', return_value='3.3.3.3'):
            assert is_ip_locked() is False
            assert get_login_failure_count() == 0

    def test_lockout_still_active_within_window(self):
        """Lockout should remain active within the 15-min window."""
        from middleware.rate_limiter import LOGIN_FAILURES, _FAILURE_LOCK, is_ip_locked
        with _FAILURE_LOCK:
            LOGIN_FAILURES['4.4.4.4'] = (5, time.time() - 60)  # Only 1 minute ago
        with patch('middleware.rate_limiter.get_client_ip', return_value='4.4.4.4'):
            assert is_ip_locked() is True

    def test_get_failure_count_unknown_ip(self):
        from middleware.rate_limiter import get_login_failure_count
        with patch('middleware.rate_limiter.get_client_ip', return_value='9.9.9.9'):
            assert get_login_failure_count() == 0

    def test_track_then_reset_then_retrack(self):
        """After reset, failures should count from 0 again."""
        from middleware.rate_limiter import track_failed_login, reset_login_failures, get_login_failure_count
        with patch('middleware.rate_limiter.get_client_ip', return_value='10.0.0.5'):
            for _ in range(3):
                track_failed_login()
            reset_login_failures()
            assert get_login_failure_count() == 0
            track_failed_login()
            assert get_login_failure_count() == 1

    def test_failure_count_4_not_locked(self):
        """4 failures should NOT lock — only 5 triggers lockout."""
        from middleware.rate_limiter import track_failed_login, is_ip_locked
        with patch('middleware.rate_limiter.get_client_ip', return_value='10.0.0.6'):
            for _ in range(4):
                track_failed_login()
            assert is_ip_locked() is False


class TestClientIP:
    """Test client IP address detection."""

    def test_x_forwarded_for_used(self, app):
        from middleware.rate_limiter import get_client_ip
        with app.test_request_context('/', headers={'X-Forwarded-For': '10.0.0.1, 10.0.0.2'},
                                      environ_base={'REMOTE_ADDR': '172.16.0.1'}):
            result = get_client_ip()
            assert result == '10.0.0.1'

    def test_remote_addr_fallback(self, app):
        from middleware.rate_limiter import get_client_ip
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '172.16.0.1'}):
            result = get_client_ip()
            assert result == '172.16.0.1'

    def test_unknown_fallback(self, app):
        from middleware.rate_limiter import get_client_ip
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': ''}):
            result = get_client_ip()
            assert result == 'unknown'

    def test_x_forwarded_for_trims_whitespace(self, app):
        from middleware.rate_limiter import get_client_ip
        with app.test_request_context('/', headers={'X-Forwarded-For': '  192.168.1.1 , 10.0.0.2 '},
                                      environ_base={'REMOTE_ADDR': '172.16.0.1'}):
            result = get_client_ip()
            assert result == '192.168.1.1'

    def test_multiple_proxies_takes_first(self, app):
        from middleware.rate_limiter import get_client_ip
        with app.test_request_context('/', headers={'X-Forwarded-For': 'client.real.ip, proxy1.ip, proxy2.ip'},
                                      environ_base={'REMOTE_ADDR': 'proxy2.ip'}):
            result = get_client_ip()
            assert result == 'client.real.ip'
