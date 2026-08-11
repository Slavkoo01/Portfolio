"""
CSRF protection via the double-submit-cookie pattern.

Why we need it: session cookies are sent automatically by the browser, so a
malicious third-party site could trigger authenticated state-changing requests
(classic CSRF). To defend:

  1. We issue a random CSRF token in a NON-HttpOnly cookie (readable by JS).
  2. The React frontend reads that cookie and echoes the value in an
     X-CSRF-Token header on every POST/PUT/PATCH/DELETE.
  3. The server compares header vs cookie. Match => same-origin JS made the
     request (a cross-site attacker can't read the cookie to copy it).

Safe methods (GET/HEAD/OPTIONS) are exempt. The public contact endpoint is
unauthenticated and protected by rate limiting instead (Phase 8).
"""
from __future__ import annotations

import hmac
import secrets

from flask import current_app, request

from app.errors.exceptions import AuthorizationError

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def set_csrf_cookie(response, token: str | None = None):
    """Attach a fresh CSRF cookie to a response. Returns the token used."""
    token = token or generate_csrf_token()
    cfg = current_app.config
    response.set_cookie(
        cfg["CSRF_COOKIE_NAME"],
        token,
        httponly=False,  # frontend JS must read it
        secure=cfg["SESSION_COOKIE_SECURE"],
        samesite=cfg["SESSION_COOKIE_SAMESITE"],
        path="/",
    )
    return token


def verify_csrf() -> None:
    """
    Raise AuthorizationError if the CSRF header doesn't match the cookie.
    No-op for safe methods.
    """
    if request.method in SAFE_METHODS:
        return

    cfg = current_app.config
    cookie_token = request.cookies.get(cfg["CSRF_COOKIE_NAME"])
    header_token = request.headers.get(cfg["CSRF_HEADER_NAME"])

    if not cookie_token or not header_token:
        raise AuthorizationError(
            "Missing CSRF token.", code="CSRF_MISSING"
        )
    # Constant-time comparison to avoid timing leaks.
    if not hmac.compare_digest(cookie_token, header_token):
        raise AuthorizationError(
            "CSRF token mismatch.", code="CSRF_INVALID"
        )
