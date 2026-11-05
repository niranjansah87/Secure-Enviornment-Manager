"""
Comprehensive user service tests — 22 scenarios.
Covers user CRUD, password hashing, verification, role management, edge cases.
"""
import pytest
from pathlib import Path


@pytest.fixture
def svc(tmp_path):
    """Create UserService with temp file."""
    from services.user_service import UserService
    users_file = tmp_path / "users.json"
    return UserService(users_file=users_file)


# =============================================================================
# Password Hashing Helpers
# =============================================================================

class TestPasswordHashing:
    """Test password hash/verify helpers."""

    def test_hash_and_verify_match(self):
        """Hashed password should verify against original."""
        from services.user_service import _hash_password, _verify_password_hash
        hashed = _hash_password("my_secure_password")
        assert _verify_password_hash(hashed, "my_secure_password") is True

    def test_hash_and_verify_mismatch(self):
        """Wrong password should not verify."""
        from services.user_service import _hash_password, _verify_password_hash
        hashed = _hash_password("correct_horse_battery_staple")
        assert _verify_password_hash(hashed, "wrong_password") is False

    def test_hash_is_unique_each_time(self):
        """Each hash call produces unique output (different salts)."""
        from services.user_service import _hash_password
        h1 = _hash_password("password123")
        h2 = _hash_password("password123")
        assert h1 != h2  # Different salts

    def test_hash_format_structure(self):
        """Hash should follow pbkdf2_sha256$iterations$salt$hash format."""
        from services.user_service import _hash_password
        hashed = _hash_password("test")
        parts = hashed.split("$")
        assert len(parts) == 4
        assert parts[0] == "pbkdf2_sha256"
        assert int(parts[1]) >= 100000  # High iteration count

    def test_malformed_hash_returns_false(self):
        """Verifying against malformed hash should return False."""
        from services.user_service import _verify_password_hash
        assert _verify_password_hash("bad_hash", "anything") is False

    def test_wrong_scheme_returns_false(self):
        """Hash with wrong scheme should return False."""
        from services.user_service import _verify_password_hash
        assert _verify_password_hash("md5$1000$abc$def", "test") is False


# =============================================================================
# User Creation
# =============================================================================

class TestUserCreation:
    """Test user account creation."""

    def test_create_user_returns_ids(self, svc):
        """create_user returns user_id and temp_password."""
        user_id, temp_pw = svc.create_user(
            username="developer1",
            role="developer",
            email="dev@test.com",
        )
        assert user_id.startswith("usr_")
        assert len(user_id) == 20  # "usr_" + 16 hex chars
        assert len(temp_pw) >= 12

    def test_create_user_admin_role(self, svc):
        """Admin role should be accepted."""
        user_id, _ = svc.create_user(username="admin2", role="admin")
        user = svc.get_user(user_id)
        assert user["role"] == "admin"

    def test_create_user_invalid_role_raises(self, svc):
        """Invalid role should raise ValueError."""
        with pytest.raises(ValueError, match="Invalid role"):
            svc.create_user(username="test", role="superadmin")

    def test_create_duplicate_username_raises(self, svc):
        """Duplicate username (case-insensitive) should raise."""
        svc.create_user(username="john")
        with pytest.raises(ValueError, match="already taken"):
            svc.create_user(username="JOHN")

    def test_create_user_must_change_password_default(self, svc):
        """New users should have must_change_password=True."""
        user_id, _ = svc.create_user(username="newuser")
        user = svc.get_user(user_id)
        assert user["must_change_password"] is True

    def test_create_user_with_scopes(self, svc):
        """User created with scopes should retain them."""
        user_id, _ = svc.create_user(
            username="scoped_dev",
            scopes=["production", "staging"],
        )
        user = svc.get_user(user_id)
        assert "production" in user["scopes"]
        assert "staging" in user["scopes"]

    def test_create_user_without_email(self, svc):
        """User without email should have empty string."""
        user_id, _ = svc.create_user(username="noemail")
        user = svc.get_user(user_id)
        assert user["email"] == ""

    def test_create_user_active_by_default(self, svc):
        """New user should be active."""
        user_id, _ = svc.create_user(username="activeuser")
        user = svc.get_user(user_id)
        assert user["status"] == "active"


# =============================================================================
# Password Verification (Login)
# =============================================================================

class TestPasswordVerification:
    """Test user password verification for login."""

    def test_verify_correct_credentials(self, svc):
        """Correct username + password should verify."""
        user_id, temp_pw = svc.create_user(username="login_test")
        user = svc.verify_password("login_test", temp_pw)
        assert user is not None
        assert user["username"] == "login_test"

    def test_verify_wrong_password(self, svc):
        """Wrong password should return None."""
        svc.create_user(username="testuser")
        result = svc.verify_password("testuser", "wrong_password")
        assert result is None

    def test_verify_wrong_username(self, svc):
        """Nonexistent username should return None."""
        result = svc.verify_password("no_such_user", "password")
        assert result is None

    def test_verify_disabled_user(self, svc):
        """Disabled user should not verify."""
        user_id, temp_pw = svc.create_user(username="disabled_user")
        svc.disable_user(user_id)
        result = svc.verify_password("disabled_user", temp_pw)
        assert result is None

    def test_verify_updates_last_login(self, svc):
        """Successful login should update last_login timestamp."""
        user_id, temp_pw = svc.create_user(username="login_tracker")
        svc.verify_password("login_tracker", temp_pw)
        user = svc.get_user(user_id)
        assert user["last_login"] is not None


# =============================================================================
# Password Change
# =============================================================================

class TestPasswordChange:
    """Test password change flows."""

    def test_change_password_with_correct_current(self, svc):
        """Change password with correct current password."""
        user_id, temp_pw = svc.create_user(username="changer")
        result = svc.change_password(user_id, "new_password_123", current_password=temp_pw)
        assert result is True
        # Old password should no longer work
        assert svc.verify_password("changer", temp_pw) is None
        # New password should work
        assert svc.verify_password("changer", "new_password_123") is not None

    def test_change_password_wrong_current(self, svc):
        """Change password with wrong current should fail."""
        user_id, _ = svc.create_user(username="changer2")
        result = svc.change_password(user_id, "newpass123", current_password="wrong")
        assert result is False

    def test_change_password_too_short_raises(self, svc):
        """Password < 8 chars should raise ValueError."""
        user_id, _ = svc.create_user(username="shortpw")
        with pytest.raises(ValueError, match="at least 8"):
            svc.change_password(user_id, "short")

    def test_change_password_clears_must_change(self, svc):
        """Changing password should clear must_change_password flag."""
        user_id, temp_pw = svc.create_user(username="mustchange")
        assert svc.get_user(user_id)["must_change_password"] is True
        svc.change_password(user_id, "new_password_123", current_password=temp_pw)
        assert svc.get_user(user_id)["must_change_password"] is False


# =============================================================================
# Admin Operations
# =============================================================================

class TestAdminOperations:
    """Test admin-level user operations."""

    def test_admin_reset_password(self, svc):
        """Admin reset returns new temp password."""
        user_id, _ = svc.create_user(username="resettarget")
        new_pw = svc.admin_reset_password(user_id)
        assert new_pw is not None
        assert len(new_pw) >= 12
        user = svc.get_user(user_id)
        assert user["must_change_password"] is True

    def test_admin_reset_nonexistent_returns_none(self, svc):
        """Resetting nonexistent user returns None."""
        assert svc.admin_reset_password("usr_nonexistent") is None

    def test_disable_user(self, svc):
        """Disabling user sets status to disabled."""
        user_id, _ = svc.create_user(username="tobedisabled")
        assert svc.disable_user(user_id) is True
        assert svc.get_user(user_id)["status"] == "disabled"

    def test_disable_nonexistent_returns_false(self, svc):
        """Disabling nonexistent user returns False."""
        assert svc.disable_user("usr_nonexistent") is False

    def test_delete_user(self, svc):
        """Deleting user removes from store."""
        user_id, _ = svc.create_user(username="tobedeleted")
        assert svc.delete_user(user_id) is True
        assert svc.get_user(user_id) is None

    def test_delete_nonexistent_returns_false(self, svc):
        """Deleting nonexistent returns False."""
        assert svc.delete_user("usr_nonexistent") is False

    def test_update_user_email_and_role(self, svc):
        """Update allowed fields on a user."""
        user_id, _ = svc.create_user(username="updatable")
        updated = svc.update_user(user_id, {"email": "new@test.com", "role": "admin"})
        assert updated is not None
        assert updated["email"] == "new@test.com"
        assert updated["role"] == "admin"

    def test_update_user_invalid_role_raises(self, svc):
        """Updating with invalid role should raise ValueError."""
        user_id, _ = svc.create_user(username="badrole")
        with pytest.raises(ValueError, match="Invalid role"):
            svc.update_user(user_id, {"role": "superuser"})

    def test_update_user_invalid_status_raises(self, svc):
        """Updating with invalid status should raise ValueError."""
        user_id, _ = svc.create_user(username="badstatus")
        with pytest.raises(ValueError, match="Invalid status"):
            svc.update_user(user_id, {"status": "deleted"})


# =============================================================================
# List and Read
# =============================================================================

class TestListAndRead:
    """Test user listing and retrieval."""

    @pytest.fixture
    def svc_with_users(self, svc):
        svc.create_user(username="alpha", email="alpha@test.com", role="admin")
        svc.create_user(username="beta", email="beta@test.com", role="developer")
        svc.create_user(username="gamma", role="developer")
        return svc

    def test_list_users_returns_all(self, svc_with_users):
        """List all users."""
        users = svc_with_users.list_users()
        usernames = {u["username"] for u in users}
        assert usernames == {"alpha", "beta", "gamma"}

    def test_list_users_excludes_hashes(self, svc_with_users):
        """Listed users should never include password_hash."""
        users = svc_with_users.list_users()
        for u in users:
            assert "password_hash" not in u

    def test_get_user_by_id(self, svc_with_users):
        """Get user by user_id."""
        users = svc_with_users.list_users()
        alpha = next(u for u in users if u["username"] == "alpha")
        user = svc_with_users.get_user(alpha["user_id"])
        assert user["username"] == "alpha"

    def test_get_user_by_username(self, svc_with_users):
        """Get user by username."""
        user = svc_with_users.get_user_by_username("beta")
        assert user is not None
        assert user["email"] == "beta@test.com"

    def test_get_user_by_username_case_insensitive(self, svc_with_users):
        """Username lookup should be case-insensitive."""
        user = svc_with_users.get_user_by_username("BETA")
        assert user is not None
        assert user["username"] == "beta"

    def test_get_nonexistent_user(self, svc):
        """Nonexistent user returns None."""
        assert svc.get_user("usr_nonexistent") is None
        assert svc.get_user_by_username("nobody") is None
