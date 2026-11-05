"""
Comprehensive API key service tests — 22 scenarios.
Covers key creation, verification, revocation, RBAC scoping, expiry, migration, edge cases.
"""
import json
import os
import pytest
from unittest.mock import patch


@pytest.fixture
def temp_keys_file(tmp_path):
    """Create a temporary API keys file for testing."""
    keys_file = tmp_path / "api_keys.json"
    return str(keys_file)


@pytest.fixture
def svc(temp_keys_file):
    """Create ApiKeyService with temp file."""
    from services.api_key_service import ApiKeyService
    return ApiKeyService(keys_file=temp_keys_file)


# =============================================================================
# Key Creation
# =============================================================================

class TestKeyCreation:
    """Test API key creation."""

    def test_create_key_returns_raw_and_id(self, svc):
        """create_key returns raw key and key_id."""
        raw_key, key_id = svc.create_key(
            namespace="production",
            created_by="admin",
            description="CI/CD pipeline key",
        )
        assert raw_key.startswith("sem_")
        assert len(raw_key) > 40
        assert len(key_id) == 16  # token_hex(8)

    def test_create_custom_key_format(self, svc):
        """Custom key with valid format should be accepted."""
        raw_key, key_id = svc.create_key(
            namespace="staging",
            custom_key="my-custom-key-2024",
            created_by="admin",
        )
        assert raw_key == "my-custom-key-2024"

    def test_custom_key_too_short_raises(self, svc):
        """Custom key shorter than 8 chars should raise ValueError."""
        with pytest.raises(ValueError, match="at least 8"):
            svc.create_key(namespace="test", custom_key="short")

    def test_custom_key_bad_chars_raises(self, svc):
        """Custom key with invalid characters should raise ValueError."""
        with pytest.raises(ValueError, match="can only contain"):
            svc.create_key(namespace="test", custom_key="key with spaces!")

    def test_custom_key_too_long_raises(self, svc):
        """Custom key > 64 chars should raise ValueError."""
        with pytest.raises(ValueError, match="at most 64"):
            svc.create_key(namespace="test", custom_key="a" * 65)

    def test_create_key_with_validity_days(self, svc):
        """Key with validity_days should have expires_at set."""
        raw_key, key_id = svc.create_key(
            namespace="temp",
            validity_days=7,
        )
        info = svc.get_key_info("temp", key_id)
        assert info["expires_at"] is not None

    def test_create_key_no_expiry(self, svc):
        """Key with validity_days=0 should have no expiry."""
        raw_key, key_id = svc.create_key(
            namespace="permanent",
            validity_days=0,
        )
        info = svc.get_key_info("permanent", key_id)
        assert info["expires_at"] is None

    def test_create_key_with_allowed_namespaces(self, svc):
        """Key scoped to specific namespaces."""
        raw_key, key_id = svc.create_key(
            namespace="main",
            allowed_namespaces=["main", "staging"],
        )
        keys = svc.list_keys("main")
        assert keys[0]["namespaces"] == ["main", "staging"]

    def test_create_key_with_allowed_environments(self, svc):
        """Key scoped to specific environments."""
        raw_key, key_id = svc.create_key(
            namespace="main",
            allowed_environments=["main/prod", "main/dev"],
        )
        keys = svc.list_keys("main")
        assert "main/prod" in keys[0]["environments"]

    def test_create_key_bound_to_user(self, svc):
        """Key bound to a user ID."""
        raw_key, key_id = svc.create_key(
            namespace="dev",
            bound_user_id="usr_test123",
        )
        keys = svc.list_keys("dev")
        assert keys[0]["bound_user_id"] == "usr_test123"


# =============================================================================
# Key Verification
# =============================================================================

class TestKeyVerification:
    """Test API key verification."""

    def test_verify_valid_key(self, svc):
        """Valid key should verify successfully."""
        raw_key, key_id = svc.create_key(namespace="test")
        is_valid, info = svc.verify_key(raw_key)
        assert is_valid is True
        assert info["key_id"] == key_id
        assert info["namespace"] == "test"

    def test_verify_invalid_key(self, svc):
        """Invalid key should not verify."""
        is_valid, info = svc.verify_key("not-a-valid-key-at-all")
        assert is_valid is False
        assert info is None

    def test_verify_revoked_key(self, svc):
        """Revoked key should not verify."""
        raw_key, key_id = svc.create_key(namespace="test")
        svc.revoke_key("test", key_id)
        is_valid, info = svc.verify_key(raw_key)
        assert is_valid is False

    def test_verify_key_namespace_check(self, svc):
        """Key scoped to specific namespaces should respect scope."""
        raw_key, _ = svc.create_key(
            namespace="main",
            allowed_namespaces=["main"],  # Only "main"
        )
        is_valid, _ = svc.verify_key(raw_key, required_namespace="main")
        assert is_valid is True
        is_valid, _ = svc.verify_key(raw_key, required_namespace="staging")
        assert is_valid is False

    def test_verify_key_environment_check(self, svc):
        """Key scoped to specific environments should respect scope."""
        raw_key, _ = svc.create_key(
            namespace="main",
            allowed_environments=["main/prod"],
        )
        is_valid, _ = svc.verify_key(raw_key, required_namespace="main", required_environment="prod")
        assert is_valid is True
        is_valid, _ = svc.verify_key(raw_key, required_namespace="main", required_environment="dev")
        assert is_valid is False

    def test_verify_key_updates_last_used(self, svc):
        """Successful verification should update last_used."""
        raw_key, key_id = svc.create_key(namespace="test")
        info_before = svc.get_key_info("test", key_id)
        assert info_before["last_used"] is None
        svc.verify_key(raw_key)
        info_after = svc.get_key_info("test", key_id)
        assert info_after["last_used"] is not None


# =============================================================================
# Key Revocation
# =============================================================================

class TestKeyRevocation:
    """Test API key revocation (permanent deletion)."""

    def test_revoke_existing_key(self, svc):
        """Revoking existing key removes it permanently."""
        raw_key, key_id = svc.create_key(namespace="test")
        assert svc.revoke_key("test", key_id) is True
        assert svc.get_key_info("test", key_id) is None

    def test_revoke_nonexistent_key(self, svc):
        """Revoking nonexistent key returns False."""
        assert svc.revoke_key("test", "nonexistent_id") is False

    def test_revoke_cleans_empty_namespace(self, svc):
        """Revoking last key in namespace removes namespace."""
        raw_key, key_id = svc.create_key(namespace="test")
        svc.revoke_key("test", key_id)
        assert svc.list_keys("test") == []


# =============================================================================
# Key Listing
# =============================================================================

class TestKeyListing:
    """Test key listing and info retrieval."""

    def test_list_keys_empty_namespace(self, svc):
        """Listing empty namespace returns empty list."""
        assert svc.list_keys("nonexistent") == []

    def test_list_keys_returns_metadata_only(self, svc):
        """List should return metadata, never the raw key."""
        raw_key, key_id = svc.create_key(namespace="test")
        keys = svc.list_keys("test")
        assert len(keys) == 1
        assert "key" not in keys[0]  # No raw/hashed key
        assert keys[0]["key_id"] == key_id

    def test_get_key_info_nonexistent(self, svc):
        """Getting info for nonexistent key returns None."""
        assert svc.get_key_info("test", "bad_id") is None


# =============================================================================
# Custom Key Validation
# =============================================================================

class TestCustomKeyValidation:
    """Test custom key format validation."""

    @pytest.fixture
    def svc(self, temp_keys_file):
        from services.api_key_service import ApiKeyService
        return ApiKeyService(keys_file=temp_keys_file)

    def test_empty_key_invalid(self, svc):
        valid, msg = svc.validate_custom_key_format("")
        assert valid is False

    def test_short_key_invalid(self, svc):
        valid, msg = svc.validate_custom_key_format("abc")
        assert valid is False

    def test_min_length_key_valid(self, svc):
        valid, msg = svc.validate_custom_key_format("abcdefgh12345678")  # 16 chars (min)
        assert valid is True

    def test_max_length_key_valid(self, svc):
        valid, msg = svc.validate_custom_key_format("a" * 64)
        assert valid is True
