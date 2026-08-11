"""
Password hashing utilities.

Uses Argon2id (via argon2-cffi), the current recommended password hashing
algorithm. We wrap the library so the rest of the app depends on a small,
stable interface rather than argon2 directly — swapping algorithms later
(if ever) touches only this file.
"""
from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

# Default parameters are sensible for a web app. Tune later if needed.
_hasher = PasswordHasher()


def hash_password(plain: str) -> str:
    """Return an Argon2id hash string for the given plaintext password."""
    if not plain:
        raise ValueError("Password must not be empty.")
    return _hasher.hash(plain)


def verify_password(stored_hash: str, plain: str) -> bool:
    """
    Return True if `plain` matches `stored_hash`.

    Returns False on mismatch or malformed hash rather than raising, so callers
    can treat verification as a simple boolean.
    """
    try:
        return _hasher.verify(stored_hash, plain)
    except (VerifyMismatchError, InvalidHashError, ValueError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    """
    True if the stored hash was made with weaker params than current defaults.
    Call after a successful verify to transparently upgrade a user's hash.
    """
    try:
        return _hasher.check_needs_rehash(stored_hash)
    except (InvalidHashError, ValueError):
        return False
