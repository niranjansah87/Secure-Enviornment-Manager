"""
Comprehensive API route integration tests — 28 scenarios.
Covers auth, meta, environments, secrets, keys, users, error handling.
"""
import json
import time
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def app():
    """Create test Flask app."""
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    flask_app.config['SECRET_KEY'] = 'test-secret-key-integration'
    return flask_app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def admin_jwt():
    """Create an admin JWT for testing."""
    from core.jwt_auth import token_manager
    return token_manager.create_access_token(
        session_id="integration-test-session",
        namespace="global",
        environment="main",
        is_admin=True,
        scopes=["*"],
        credential_type="dashboard_password",
    )


@pytest.fixture
def admin_headers(admin_jwt):
    """Authorization headers with admin JWT."""
    return {"Authorization": f"Bearer {admin_jwt}"}


@pytest.fixture
def scoped_jwt():
    """Create a scoped JWT (non-admin, specific namespace)."""
    from core.jwt_auth import token_manager
    return token_manager.create_access_token(
        session_id="scoped-session",
        namespace="global",
        environment="main",
        is_admin=False,
        scopes=["production"],
    )


@pytest.fixture
def scoped_headers(scoped_jwt):
    """Authorization headers with scoped JWT."""
    return {"Authorization": f"Bearer {scoped_jwt}"}


# =============================================================================
# Auth Routes
# =============================================================================

class TestAuthRoutes:
    """Test /api/v1/auth/* endpoints."""

    def test_login_missing_password(self, client):
        """Login without password returns 400."""
        resp = client.post("/api/v1/auth/login", json={}, content_type="application/json")
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["success"] is False

    def test_login_invalid_credentials(self, client):
        """Login with bad credentials returns 401."""
        resp = client.post("/api/v1/auth/login",
                           json={"password": "definitely_wrong_password_xyz"},
                           content_type="application/json")
        assert resp.status_code == 401

    def test_refresh_missing_token(self, client):
        """Refresh without token returns 400."""
        resp = client.post("/api/v1/auth/refresh", json={}, content_type="application/json")
        assert resp.status_code == 400

    def test_refresh_invalid_token(self, client):
        """Refresh with invalid token returns 401."""
        resp = client.post("/api/v1/auth/refresh",
                           json={"refresh_token": "invalid_token"},
                           content_type="application/json")
        assert resp.status_code == 401

    def test_logout_without_token(self, client):
        """Logout without auth returns 401."""
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 401

    def test_me_with_valid_token(self, client, admin_headers):
        """GET /auth/me with valid token returns session info."""
        resp = client.get("/api/v1/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["data"]["is_admin"] is True
        assert "session_id" in data["data"]

    def test_me_without_token(self, client):
        """GET /auth/me without token returns 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_with_expired_token(self, client):
        """GET /auth/me with expired token returns 401."""
        import jwt as pyjwt
        from core.config import settings
        payload = {"sub": "exp", "typ": "access", "iat": int(time.time())-3600,
                   "exp": int(time.time())-1800}
        token = pyjwt.encode(payload, settings.flask_secret_key, algorithm="HS256")
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401

    def test_logout_revokes_session(self, client, admin_headers, admin_jwt):
        """Logout should revoke the session."""
        resp = client.post("/api/v1/auth/logout", headers=admin_headers)
        assert resp.status_code == 200
        # Token should be invalid after logout
        from core.jwt_auth import token_manager
        # Refresh tokens for this session should be revoked
        tokens = token_manager.get_session_tokens("integration-test-session")
        for t in tokens:
            assert t["is_revoked"] is True


# =============================================================================
# Meta Routes
# =============================================================================

class TestMetaRoutes:
    """Test /api/v1/meta/* endpoints."""

    def test_is_admin_with_admin_token(self, client, admin_headers):
        """is-admin returns true for admin JWT."""
        resp = client.get("/api/v1/meta/is-admin", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_admin"] is True

    def test_is_admin_without_token(self, client):
        """is-admin without token returns false (not error)."""
        resp = client.get("/api/v1/meta/is-admin")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_admin"] is False

    def test_is_admin_with_scoped_token(self, client, scoped_headers):
        """is-admin returns false for non-admin JWT."""
        resp = client.get("/api/v1/meta/is-admin", headers=scoped_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_admin"] is False

    def test_environments_without_token(self, client):
        """environments without token returns 401."""
        resp = client.get("/api/v1/meta/environments")
        assert resp.status_code == 401

    def test_environments_with_expired_jwt(self, client):
        """environments with expired JWT returns 401 (not 403)."""
        import jwt as pyjwt
        from core.config import settings
        payload = {"sub": "exp", "typ": "access", "iat": int(time.time())-3600,
                   "exp": int(time.time())-1800, "is_admin": True, "scopes": ["*"]}
        token = pyjwt.encode(payload, settings.flask_secret_key, algorithm="HS256")
        resp = client.get("/api/v1/meta/environments",
                          headers={"Authorization": f"Bearer {token}"})
        # Should return 401 for expired JWT (not 403)
        assert resp.status_code == 401

    def test_stats_without_token(self, client):
        """stats without token returns 401."""
        resp = client.get("/api/v1/meta/stats")
        assert resp.status_code == 401

    def test_analytics_requires_auth(self, client):
        """analytics without token returns 401."""
        resp = client.get("/api/v1/meta/analytics")
        assert resp.status_code == 401


# =============================================================================
# Environment Routes
# =============================================================================

class TestEnvironmentRoutes:
    """Test /api/v1/<namespace>/<environment> endpoints."""

    def test_environment_without_token(self, client):
        """Environment access without token returns 401."""
        resp = client.get("/api/v1/production/main")
        assert resp.status_code == 401

    def test_environment_meta_without_token(self, client):
        """Environment meta without token returns 401."""
        resp = client.get("/api/v1/production/main/meta")
        assert resp.status_code == 401

    def test_invalid_segment_returns_404(self, client, admin_headers):
        """Path traversal attempt should return 404."""
        resp = client.get("/api/v1/bad..namespace/env", headers=admin_headers)
        assert resp.status_code == 404

    def test_environment_endpoint_validates_segments(self, client, admin_headers):
        """Overly long namespace should abort."""
        long_ns = "a" * 100
        resp = client.get(f"/api/v1/{long_ns}/main", headers=admin_headers)
        assert resp.status_code == 404


# =============================================================================
# Key Management Routes
# =============================================================================

class TestKeyManagementRoutes:
    """Test /api/v1/keys/* endpoints."""

    def test_list_keys_without_token(self, client):
        """Listing keys without token returns 401."""
        resp = client.get("/api/v1/keys/test-ns")
        assert resp.status_code == 401

    def test_create_key_without_token(self, client):
        """Creating key without token returns 401."""
        resp = client.post("/api/v1/keys/test-ns", json={}, content_type="application/json")
        assert resp.status_code == 401

    def test_revoke_key_without_token(self, client):
        """Revoking key without token returns 401."""
        resp = client.delete("/api/v1/keys/test-ns/some-key-id")
        assert resp.status_code == 401


# =============================================================================
# User Management Routes
# =============================================================================

class TestUserManagementRoutes:
    """Test /api/v1/admin/users/* endpoints."""

    def test_list_users_without_token(self, client):
        """Listing users without token returns 403."""
        resp = client.get("/api/v1/admin/users")
        assert resp.status_code == 403

    def test_create_user_without_token(self, client):
        """Creating user without token returns 403."""
        resp = client.post("/api/v1/admin/users", json={"username": "test"}, content_type="application/json")
        assert resp.status_code == 403

    def test_create_user_missing_username(self, client, admin_headers):
        """Creating user without username returns 400."""
        resp = client.post("/api/v1/admin/users", json={}, content_type="application/json",
                           headers=admin_headers)
        assert resp.status_code == 400


# =============================================================================
# Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling behavior across API routes."""

    def test_404_api_returns_json_error(self, client):
        """404 on API path should return JSON error."""
        resp = client.get("/api/v1/nonexistent-endpoint")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "RESOURCE_NOT_FOUND"

    def test_405_api_returns_json_error(self, client, admin_headers):
        """405 on API path should return JSON error."""
        resp = client.patch("/api/v1/meta/is-admin", headers=admin_headers)
        assert resp.status_code == 405
        data = resp.get_json()
        assert data["success"] is False

    def test_response_has_request_id_header(self, client):
        """Responses should include X-Request-ID header."""
        resp = client.get("/api/v1/auth/me")
        assert "X-Request-ID" in resp.headers

    def test_security_headers_on_api(self, client):
        """API responses should include security headers."""
        resp = client.get("/api/v1/meta/is-admin")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"


# =============================================================================
# JWT Protected Route Contract
# =============================================================================

class TestJWTContract:
    """Test JWT decorator contract across all protected routes."""

    def test_all_protected_routes_reject_missing_jwt(self, client):
        """All JWT-protected routes should return 401 when JWT is missing."""
        routes = [
            ("POST", "/api/v1/auth/logout"),
            ("GET", "/api/v1/auth/me"),
            ("GET", "/api/v1/auth/sessions"),
            ("GET", "/api/v1/auth/devices"),
        ]
        for method, path in routes:
            if method == "POST":
                resp = client.post(path)
            else:
                resp = client.get(path)
            assert resp.status_code == 401, f"{method} {path} should return 401"

    def test_all_protected_routes_reject_expired_jwt(self, client):
        """All JWT-protected routes should return 401 for expired tokens."""
        import jwt as pyjwt
        from core.config import settings
        payload = {"sub": "x", "typ": "access", "iat": int(time.time()) - 3600,
                   "exp": int(time.time()) - 1800}
        token = pyjwt.encode(payload, settings.flask_secret_key, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}

        routes = [
            ("POST", "/api/v1/auth/logout"),
        ]
        for method, path in routes:
            if method == "POST":
                resp = client.post(path, headers=headers)
            else:
                resp = client.get(path, headers=headers)
            assert resp.status_code == 401, f"{method} {path} should return 401 for expired token"
