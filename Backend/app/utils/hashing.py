"""Pseudonymous hashing helpers (never store raw IPs)."""
from __future__ import annotations

import hashlib

from flask import current_app, request


def client_ip() -> str:
    # Respect a proxy header if present (deployment), else remote_addr.
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def ip_hash() -> str:
    """A salted hash of the client IP — pseudonymous, not reversible."""
    secret = current_app.config["SECRET_KEY"]
    raw = f"{client_ip()}:{secret}".encode()
    return hashlib.sha256(raw).hexdigest()[:32]
