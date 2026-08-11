"""
Authentication business logic.

Verifies credentials, updates last_login, and transparently upgrades password
hashes when the algorithm parameters change. Knows nothing about HTTP/cookies —
that lives in the route and the session helpers.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.errors.exceptions import AuthenticationError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.security import hash_password, needs_rehash, verify_password


class AuthService:
    def __init__(self, users: UserRepository | None = None):
        self.users = users or UserRepository()

    def authenticate(self, identifier: str, password: str) -> User:
        """
        Return the user on valid credentials, else raise AuthenticationError.

        The same generic error is raised for "no such user" and "wrong password"
        so we don't leak which usernames exist.
        """
        user = self.users.get_by_username_or_email(identifier)
        # Always run verify to keep timing roughly constant even when user is None.
        stored = user.password_hash if user else _DUMMY_HASH
        ok = verify_password(stored, password)

        if not user or not ok:
            raise AuthenticationError("Invalid credentials.", code="INVALID_CREDENTIALS")
        if not user.is_active:
            raise AuthenticationError("Account is disabled.", code="ACCOUNT_DISABLED")

        # Transparent hash upgrade if params strengthened since signup.
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)

        user.last_login_at = datetime.now(timezone.utc)
        self.users.commit()
        return user


# A precomputed hash of a random value, used to equalise timing when the user
# doesn't exist (mitigates username-enumeration via response time).
_DUMMY_HASH = hash_password("dummy-password-for-timing-equalisation")
