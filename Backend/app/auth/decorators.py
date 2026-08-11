"""
Route protection decorators.

  @login_required  -> any authenticated, active user
  @admin_required  -> authenticated user whose role is ADMIN

Both attach the resolved user to flask.g.current_user so the route/service can
use it without re-querying. CSRF is verified here for state-changing methods,
so every protected write is CSRF-checked in one place.
"""
from __future__ import annotations

from functools import wraps

from flask import g

from app.auth.csrf import verify_csrf
from app.auth.session import load_current_user
from app.errors.exceptions import AuthenticationError, AuthorizationError


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = load_current_user()
        if user is None:
            raise AuthenticationError()
        verify_csrf()
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = load_current_user()
        if user is None:
            raise AuthenticationError()
        if not user.is_admin:
            raise AuthorizationError()
        verify_csrf()
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper
