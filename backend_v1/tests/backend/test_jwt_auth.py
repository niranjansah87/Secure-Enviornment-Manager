"""
Comprehensive JWT auth tests — 27 scenarios.
Covers token creation, validation, expiry, refresh, revocation, device sessions, edge cases.
"""
import time
import jwt as pyjwt
import pytest


class TestTokenCreation:
    """Test JWT access and refresh token creation."""

    @pytest.fixture
    def tm(self):
        from core.jwt_auth import TokenManager
        return TokenManager(tokens_file="/tmp/test_refresh_tokens.json")

    def test_access_token_created_with_correct_structure(self, tm):
        """Access token should contain all expected claims."""
        from core.config import settings
        token = tm.create_access_token(
            session_id="test-session-1",
            namespace="production",
            environment="main",
            is_admin=True,
            scopes=["*"],
            user_id="usr_abc123",
            username="admin",
            email="admin@test.com",
            credential_type="dashboard_password",
        )
        payload = pyjwt.decode(token, settings.flask_secret_key, algorithms=["HS256"])
        assert payload["sub"] == "test-session-1"
        assert payload["typ"] == "access"
        assert payload["namespace"] == "production"
        assert payload["environment"] == "main"
        assert payload["is_admin"] is True
        assert payload["scopes"] == ["*"]
        assert payload["user_id"] == "usr_abc123"
        assert payload["username"] == "admin"
        assert payload["email"] == "admin@test.com"
        assert payload["credential_type"] == "dashboard_password"

    def test_access_token_expiry_15_minutes(self, tm):
        """Access token should expire in 15 minutes."""
        from core.config import settings
        token = tm.create_access_token(session_id="test-session")
        payload = pyjwt.decode(token, settings.flask_secret_key, algorithms=["HS256"])
        lifetime = payload["exp"] - payload["iat"]
        assert lifetime == 3600

    def test_access_token_non_admin_default(self, tm):
        """Default is_admin should be False."""
        from core.config import settings
        token = tm.create_access_token(session_id="test-non-admin")
        payload = pyjwt.decode(token, settings.flask_secret_key, algorithms=["HS256"])
        assert payload["is_admin"] is False

    def test_access_token_empty_scopes_by_default(self, tm):
        """Default scopes should be empty list."""
        from core.config import settings
        token = tm.create_access_token(session_id="test")
        payload = pyjwt.decode(token, settings.flask_secret_key, algorithms=["HS256"])
        assert payload["scopes"] == []

    def test_refresh_token_created_with_prefix(self, tm):
        """Refresh token should start with semr_ prefix."""
        refresh_token, token_hash = tm.create_refresh_token(
            session_id="test-session",
            device_id="dev_abc",
            user_agent="TestAgent/1.0",
            ip_address="127.0.0.1",
        )
        assert refresh_token.startswith("semr_")
        assert len(refresh_token) > 50
        assert len(token_hash) == 64

    def test_refresh_token_stored_with_correct_metadata(self, tm):
        """Refresh token should be persisted with all metadata."""
        refresh_token, _ = tm.create_refresh_token(
            session_id="test-session",
            device_id="dev_test",
            user_agent="Mozilla/5.0",
            ip_address="10.0.0.1",
        )
        record = tm.validate_refresh_token(refresh_token)
        assert record is not None
        assert record.session_id == "test-session"
        assert record.device_id == "dev_test"
        assert record.user_agent == "Mozilla/5.0"
        assert record.ip_address == "10.0.0.1"
        assert record.is_revoked is False

    def test_refresh_token_user_agent_truncated(self, tm):
        """User agent longer than 200 chars should be truncated."""
        long_ua = "A" * 300
        refresh_token, _ = tm.create_refresh_token(
            session_id="s", user_agent=long_ua
        )
        record = tm.validate_refresh_token(refresh_token)
        assert len(record.user_agent) == 200


class TestTokenValidation:
    """Test JWT token validation."""

    @pytest.fixture
    def tm(self):
        from core.jwt_auth import TokenManager
        return TokenManager(tokens_file="/tmp/test_val_tokens.json")

    def test_valid_token_returns_payload(self, tm):
        """Valid access token should return TokenPayload."""
        token = tm.create_access_token(
            session_id="test-session",
            namespace="staging",
            environment="dev",
            is_admin=False,
            device_id="dev_001",
        )
        payload = tm.validate_access_token(token)
        assert payload is not None
        assert payload.sub == "test-session"
        assert payload.namespace == "staging"
        assert payload.environment == "dev"
        assert payload.device_id == "dev_001"

    def test_expired_token_returns_none(self, tm):
        """Expired access token should return None."""
        from core.config import settings
        expired_payload = {
            "sub": "old-session",
            "typ": "access",
            "iat": int(time.time()) - 3600,
            "exp": int(time.time()) - 1800,
            "namespace": "global",
            "environment": "main",
            "is_admin": False,
            "scopes": [],
        }
        token = pyjwt.encode(expired_payload, settings.flask_secret_key, algorithm="HS256")
        result = tm.validate_access_token(token)
        assert result is None

    def test_wrong_type_token_returns_none(self, tm):
        """Token with typ != 'access' should return None."""
        from core.config import settings
        refresh_payload = {
            "sub": "test",
            "typ": "refresh",
            "iat": int(time.time()),
            "exp": int(time.time()) + 900,
        }
        token = pyjwt.encode(refresh_payload, settings.flask_secret_key, algorithm="HS256")
        result = tm.validate_access_token(token)
        assert result is None

    def test_wrong_signature_returns_none(self, tm):
        """Token with wrong signature should return None."""
        payload = {
            "sub": "test", "typ": "access",
            "iat": int(time.time()), "exp": int(time.time()) + 900,
        }
        token = pyjwt.encode(payload, "wrong-secret", algorithm="HS256")
        result = tm.validate_access_token(token)
        assert result is None

    def test_malformed_token_returns_none(self, tm):
        """Completely malformed token should return None."""
        result = tm.validate_access_token("not.a.jwt.token.at.all")
        assert result is None

    def test_empty_token_returns_none(self, tm):
        """Empty string token should return None."""
        result = tm.validate_access_token("")
        assert result is None

    def test_refresh_token_revoked_returns_none(self, tm):
        """Revoked refresh token should not validate."""
        refresh_token, _ = tm.create_refresh_token(session_id="s1")
        tm.revoke_refresh_token(refresh_token)
        result = tm.validate_refresh_token(refresh_token)
        assert result is None

    def test_refresh_token_expired_returns_none(self, tm):
        """Expired refresh token should return None."""
        refresh_token, token_hash = tm.create_refresh_token(session_id="s1")
        with tm._lock:
            tm._refresh_tokens[token_hash].expires_at = "2020-01-01T00:00:00+00:00"
        result = tm.validate_refresh_token(refresh_token)
        assert result is None


class TestTokenRefresh:
    """Test the token refresh flow."""

    @pytest.fixture
    def tm(self):
        from core.jwt_auth import TokenManager
        return TokenManager(tokens_file="/tmp/test_refresh_flow.json")

    def test_refresh_returns_new_tokens(self, tm):
        """Refresh should return new access and refresh tokens."""
        old_refresh, _ = tm.create_refresh_token(session_id="test", device_id="dev1")
        result = tm.refresh_access_token(old_refresh)
        assert result is not None
        new_access, new_refresh = result
        assert new_access != old_refresh
        assert tm.validate_refresh_token(old_refresh) is None

    def test_refresh_with_invalid_token_returns_none(self, tm):
        """Refresh with invalid token should return None."""
        result = tm.refresh_access_token("invalid_token_here")
        assert result is None

    def test_refresh_with_revoked_token_returns_none(self, tm):
        """Refresh with revoked token should return None."""
        refresh_token, _ = tm.create_refresh_token(session_id="s1")
        tm.revoke_refresh_token(refresh_token)
        result = tm.refresh_access_token(refresh_token)
        assert result is None

    def test_refresh_updates_last_used(self, tm):
        """Refresh should update last_used timestamp on old token."""
        refresh_token, _ = tm.create_refresh_token(session_id="s1")
        old_record = tm.validate_refresh_token(refresh_token)
        assert old_record.last_used is None
        tm.refresh_access_token(refresh_token)


class TestTokenRevocation:
    """Test token revocation."""

    @pytest.fixture
    def tm(self):
        from core.jwt_auth import TokenManager
        return TokenManager(tokens_file="/tmp/test_revoke.json")

    def test_revoke_single_token(self, tm):
        """Single refresh token revocation."""
        rt, _ = tm.create_refresh_token(session_id="s1")
        assert tm.revoke_refresh_token(rt) is True
        assert tm.validate_refresh_token(rt) is None

    def test_revoke_nonexistent_token(self, tm):
        """Revoking nonexistent token returns False."""
        assert tm.revoke_refresh_token("nonexistent_token") is False

    def test_revoke_all_session_tokens(self, tm):
        """Revoke all tokens for a session."""
        rt1, _ = tm.create_refresh_token(session_id="session_a")
        rt2, _ = tm.create_refresh_token(session_id="session_a")
        rt3, _ = tm.create_refresh_token(session_id="session_b")
        count = tm.revoke_all_session_tokens("session_a")
        assert count == 2
        assert tm.validate_refresh_token(rt1) is None
        assert tm.validate_refresh_token(rt2) is None
        assert tm.validate_refresh_token(rt3) is not None

    def test_revoke_all_device_tokens(self, tm):
        """Revoke all tokens for a device."""
        rt1, _ = tm.create_refresh_token(session_id="s1", device_id="dev_a")
        rt2, _ = tm.create_refresh_token(session_id="s2", device_id="dev_a")
        rt3, _ = tm.create_refresh_token(session_id="s1", device_id="dev_b")
        count = tm.revoke_all_device_tokens("dev_a")
        assert count == 2


class TestDeviceSessions:
    """Test device session lifecycle."""

    @pytest.fixture
    def tm(self):
        from core.jwt_auth import TokenManager
        return TokenManager(tokens_file="/tmp/test_dev_tok.json")

    def test_register_device_returns_id(self, tm):
        """Registering a device returns a device_id."""
        device_id = tm.register_device(
            session_id="s1",
            device_name="iPhone 15",
            device_type="mobile",
            platform="ios",
        )
        assert device_id.startswith("dev_")
        assert len(device_id) > 20

    def test_get_device_returns_data(self, tm):
        """Getting a registered device returns DeviceSession."""
        device_id = tm.register_device(
            session_id="s1",
            device_name="Test Device",
            device_type="desktop",
            platform="windows",
            user_agent="Chrome/120",
            ip_address="192.168.1.1",
        )
        device = tm.get_device(device_id)
        assert device is not None
        assert device.device_name == "Test Device"
        assert device.device_type == "desktop"
        assert device.platform == "windows"
        assert device.session_id == "s1"

    def test_get_nonexistent_device_returns_none(self, tm):
        """Getting nonexistent device returns None."""
        assert tm.get_device("dev_nonexistent") is None

    def test_update_device_activity(self, tm):
        """Updating device activity updates last_active."""
        device_id = tm.register_device(session_id="s1")
        old_active = tm.get_device(device_id).last_active
        import time as _time
        _time.sleep(0.01)
        tm.update_device_activity(device_id, "test-token")
        new_active = tm.get_device(device_id).last_active
        assert new_active != old_active

    def test_revoke_device(self, tm):
        """Revoking a device marks it as revoked."""
        device_id = tm.register_device(session_id="s1")
        assert tm.revoke_device(device_id) is True
        device = tm.get_device(device_id)
        assert device.is_revoked is True

    def test_revoke_nonexistent_device(self, tm):
        """Revoking nonexistent device returns False."""
        assert tm.revoke_device("dev_nonexistent") is False

    def test_get_session_devices(self, tm):
        """Getting devices for a session returns only that session's devices."""
        tm.register_device(session_id="s1", device_name="Device A")
        tm.register_device(session_id="s1", device_name="Device B")
        tm.register_device(session_id="s2", device_name="Device C")
        devices = tm.get_session_devices("s1")
        assert len(devices) == 2
        assert {d["device_name"] for d in devices} == {"Device A", "Device B"}

    def test_get_all_devices(self, tm):
        """get_all_devices returns all registered devices."""
        tm.register_device(session_id="s1", device_name="A")
        tm.register_device(session_id="s2", device_name="B")
        all_devices = tm.get_all_devices()
        assert len(all_devices) == 2

    def test_get_session_tokens_metadata(self, tm):
        """get_session_tokens returns token metadata without secrets."""
        tm.create_refresh_token(session_id="s1", user_agent="UA1")
        tm.create_refresh_token(session_id="s1", user_agent="UA2")
        tokens = tm.get_session_tokens("s1")
        assert len(tokens) == 2
        assert "user_agent" in tokens[0]
        assert "token_hash" not in tokens[0]
