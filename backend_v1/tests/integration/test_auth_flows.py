"""
End-to-End Authentication Integration Tests
Tests complete auth flows across all clients (Web, SDK, CLI, Mobile)
"""
import pytest
import time
import jwt

# Test fixtures
@pytest.fixture
def app():
    """Create test Flask app with auth routes."""
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    return flask_app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def auth_headers():
    """Valid auth headers for testing."""
    from core.jwt_auth import token_manager

    # Create a test session and token
    session_id = "test_session_123"
    access_token = token_manager.create_access_token(
        session_id=session_id,
        namespace="global",
        environment="main",
        is_admin=True,
    )
    return {"Authorization": f"Bearer {access_token}"}

# =============================================================================
# AUTH FLOW TESTS
# =============================================================================

class TestLoginFlow:
    """Test complete login flow."""

    def test_login_with_valid_credentials(self, client):
        """Test login with valid password returns JWT tokens."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "namespace": "global",
                "environment": "main",
                "password": "Kumari@ai",  # From .env
                "device_name": "Test Device",
                "device_type": "sdk",
            },
            content_type="application/json"
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert data["data"]["expires_in"] == 3600  # 60 minutes

    def test_login_with_invalid_credentials(self, client):
        """Test login with invalid password returns 401."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "password": "wrong_password",
                "device_type": "sdk",
            },
            content_type="application/json"
        )

        assert response.status_code == 401
        data = response.get_json()
        assert data["success"] is False

    def test_login_with_missing_password(self, client):
        """Test login without password returns 400."""
        response = client.post(
            "/api/v1/auth/login",
            json={"device_type": "sdk"},
            content_type="application/json"
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False

    def test_login_device_tracking(self, client):
        """Test that device info is captured during login."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "password": "Kumari@ai",
                "device_name": "Test iPhone 15 Pro",
                "device_type": "mobile",
                "platform": "ios",
            },
            content_type="application/json"
        )

        assert response.status_code == 200
        data = response.get_json()
        # Device ID should be returned for mobile devices
        assert "device_id" in data["data"]


class TestTokenRefresh:
    """Test token refresh flow."""

    def test_refresh_with_valid_token(self, client):
        """Test refreshing with valid refresh token."""
        # First login to get tokens
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "password": "Kumari@ai",
                "device_type": "sdk",
            },
            content_type="application/json"
        )
        refresh_token = login_response.get_json()["data"]["refresh_token"]

        # Refresh the token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
            content_type="application/json"
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]  # Token rotation

    def test_refresh_with_expired_token(self, client):
        """Test refresh with expired/invalid token returns 401."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token"},
            content_type="application/json"
        )

        assert response.status_code == 401
        data = response.get_json()
        assert data["success"] is False

    def test_refresh_with_missing_token(self, client):
        """Test refresh without token returns 400."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={},
            content_type="application/json"
        )

        assert response.status_code == 400


class TestLogout:
    """Test logout and token revocation."""

    def test_logout_revokes_tokens(self, client):
        """Test that logout revokes all session tokens."""
        # Login first
        login_response = client.post(
            "/api/v1/auth/login",
            json={"password": "Kumari@ai", "device_type": "sdk"},
            content_type="application/json"
        )
        access_token = login_response.get_json()["data"]["access_token"]

        # Logout
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True

        # Verify token is now invalid
        from core.jwt_auth import token_manager
        payload = token_manager.validate_access_token(access_token)
        assert payload is None  # Token should be revoked

    def test_logout_without_token(self, client):
        """Test logout without token returns 401."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 401


class TestSessionManagement:
    """Test session management endpoints."""

    def test_get_session_info(self, client, auth_headers):
        """Test getting current session info."""
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "session_id" in data["data"]
        assert data["data"]["namespace"] == "global"

    def test_list_sessions(self, client, auth_headers):
        """Test listing all sessions for user."""
        response = client.get(
            "/api/v1/auth/sessions",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "session_id" in data["data"]  # Returns session info, not sessions list
        assert "devices" in data["data"]


class TestJWTValidation:
    """Test JWT token validation."""

    def test_valid_token_accepted(self, client, auth_headers):
        """Test that valid JWT is accepted."""
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_expired_token_rejected(self, client):
        """Test that expired JWT is rejected."""
        # Create an expired token
        from core.config import settings
        expired_payload = {
            "sub": "test_session",
            "typ": "access",
            "iat": int(time.time()) - 3600,  # 1 hour ago
            "exp": int(time.time()) - 1800,  # 30 minutes ago (expired)
            "namespace": "global",
            "environment": "main",
        }
        expired_token = jwt.encode(
            expired_payload,
            settings.flask_secret_key,
            algorithm="HS256"
        )

        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    def test_malformed_token_rejected(self, client):
        """Test that malformed JWT is rejected."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not_a_valid_jwt"},
        )
        assert response.status_code == 401

    def test_token_wrong_signature_rejected(self, client):
        """Test that token with wrong signature is rejected."""
        # Create token with different secret
        bad_payload = {
            "sub": "test_session",
            "typ": "access",
            "iat": int(time.time()),
            "exp": int(time.time()) + 900,
        }
        bad_token = jwt.encode(bad_payload, "wrong_secret", algorithm="HS256")

        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {bad_token}"},
        )
        assert response.status_code == 401


# =============================================================================
# RATE LIMITING TESTS
# =============================================================================

class TestRateLimiting:
    """Test rate limiting behavior."""

    def test_login_rate_limit_enforced(self, client):
        """Test that login rate limiting is enforced."""
        # Make multiple rapid login attempts
        responses = []
        for _ in range(15):
            response = client.post(
                "/api/v1/auth/login",
                json={"password": "wrong"},
                content_type="application/json"
            )
            responses.append(response.status_code)

        # Some should be rate limited (429)
        assert 429 in responses

    def test_api_rate_limit_enforced(self, client, auth_headers):
        """Test that API rate limiting is enforced."""
        # Make many rapid API calls
        responses = []
        for _ in range(150):
            response = client.get(
                "/api/v1/auth/me",
                headers=auth_headers,
            )
            responses.append(response.status_code)

        # At least some should be rate limited
        # Note: 100 per minute limit, so first 100 should succeed
        assert responses.count(200) <= 100


# =============================================================================
# SECURITY TESTS
# =============================================================================

class TestSecurityHeaders:
    """Test security headers on responses."""

    def test_security_headers_present(self, client, auth_headers):
        """Test that security headers are present on API responses."""
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )

        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("Cache-Control") == "no-store"

    def test_cors_headers_present(self, client):
        """Test that CORS headers are present for valid origins."""
        response = client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": "Bearer test",
                "Origin": "http://localhost:3000",
            },
        )
        # CORS headers should be present (even for invalid token)
        assert "Access-Control-Allow-Origin" in dict(response.headers)

    def test_no_sensitive_data_in_error_responses(self, client):
        """Test that error responses don't leak sensitive data."""
        response = client.post(
            "/api/v1/auth/login",
            json={"password": "Kumari@ai"},
            content_type="application/json"
        )

        data = response.get_json()
        # Should not expose internal paths, stack traces, etc.
        if not data["success"]:
            assert "stack" not in str(data).lower()
            assert "traceback" not in str(data).lower()


# =============================================================================
# WEBSOCKET AUTH TESTS
# =============================================================================

class TestWebSocketAuth:
    """Test WebSocket authentication."""

    def test_websocket_token_validation(self):
        """Test that WebSocket properly validates JWT tokens."""
        from core.jwt_auth import token_manager

        # Create a valid token
        session_id = "ws_test_session"
        token = token_manager.create_access_token(
            session_id=session_id,
            namespace="global",
            environment="main",
            is_admin=True,
        )

        # Validate token
        payload = token_manager.validate_access_token(token)
        assert payload is not None
        assert payload.sub == session_id

    def test_websocket_invalid_token_rejected(self):
        """Test that invalid WebSocket tokens are rejected."""
        from core.jwt_auth import token_manager

        # Validate invalid token
        payload = token_manager.validate_access_token("invalid_token")
        assert payload is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])