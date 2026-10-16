"""
Pytest configuration and fixtures for Secure Environment Manager tests.
"""
import os
import sys
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch('app.settings') as mock:
        mock.session_timeout_minutes = 60
        mock.max_login_attempts = 5
        mock.lockout_minutes = 15
        mock.session_cookie_secure = True
        mock.cors_origins = ["http://localhost:3000"]
        mock.frontend_url = "http://localhost:3000"
        mock.content_security_policy = "default-src 'self'"
        mock.debug = False
        mock.master_api_token = None
        mock.api_keys_file = "test_api_keys.json"
        mock.data_dir = "test_data"
        yield mock


@pytest.fixture
def app():
    """Create test Flask app."""
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    flask_app.config['SECRET_KEY'] = 'test-secret-key'
    flask_app.config['WTF_CSRF_ENABLED'] = False
    return flask_app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def authenticated_client(client, app):
    """Create authenticated test client."""
    with client.session_transaction() as sess:
        sess['test:test:authed'] = {'ts': datetime.now(timezone.utc).isoformat(), 'id': 'test-session-id'}
        sess['last_active'] = datetime.now(timezone.utc).isoformat()
        sess['session_created'] = datetime.now(timezone.utc).isoformat()
    return client


@pytest.fixture
def mock_audit_logger():
    """Mock audit logger."""
    with patch('audit_logger.audit_logger') as mock:
        mock.log_session_created = MagicMock()
        mock.log_session_revoked = MagicMock()
        mock.log_event = MagicMock()
        mock.log_variable_create = MagicMock()
        mock.log_variable_update = MagicMock()
        mock.log_variable_delete = MagicMock()
        mock.log_bulk_replace = MagicMock()
        mock.log_export = MagicMock()
        mock.log_login_success = MagicMock()
        mock.log_login_failure = MagicMock()
        mock.log_logout = MagicMock()
        yield mock


@pytest.fixture
def sample_secrets():
    """Sample secrets for testing."""
    return {
        "DATABASE_URL": "postgresql://localhost:5432/mydb",
        "API_KEY": "sk-test-1234567890",
        "SECRET_TOKEN": "super-secret-value",
    }


@pytest.fixture
def app_context(app):
    """Provide a Flask application context for tests that need request context."""
    with app.app_context():
        yield


@pytest.fixture
def temp_data_dir(tmp_path):
    """Create temporary data directory."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return data_dir