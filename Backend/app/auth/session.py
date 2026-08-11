"""
Session helpers.

The signed session cookie stores only the user id and role. On each request that
needs the user, we load them fresh from the DB (so deactivation / role changes
take effect immediately, and we never trust stale data from the cookie).
"""
from __future__ import annotations

from flask import session

from app.models.user import User
from app.repositories.user_repository import UserRepository

_SESSION_USER_ID = "user_id"
_SESSION_ROLE = "role"


def login_session(user: User) -> None:
    session.clear()
    session[_SESSION_USER_ID] = user.id
    session[_SESSION_ROLE] = user.role
    session.permanent = True


def logout_session() -> None:
    session.clear()


def current_user_id() -> int | None:
    return session.get(_SESSION_USER_ID)


def load_current_user() -> User | None:
    """Load the logged-in user from the DB, or None if not logged in / inactive."""
    uid = current_user_id()
    if uid is None:
        return None
    user = UserRepository().get_by_id(uid)
    if user is None or not user.is_active:
        return None
    return user
