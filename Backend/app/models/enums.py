"""
String constants used for VARCHAR + CHECK "enum" columns.

We deliberately avoid native PostgreSQL ENUM types: they are painful to alter
via Alembic migrations. Instead each column is a VARCHAR constrained by a CHECK,
with the allowed values centralised here so models and services share one source.
"""
from __future__ import annotations


class UserRole:
    ADMIN = "ADMIN"
    USER = "USER"
    ALL = (ADMIN, USER)


class AssetType:
    MODEL = "MODEL"
    TEXTURE = "TEXTURE"
    THUMBNAIL = "THUMBNAIL"
    ANIMATION = "ANIMATION"
    OTHER = "OTHER"
    ALL = (MODEL, TEXTURE, THUMBNAIL, ANIMATION, OTHER)


class GithubFileType:
    FILE = "file"
    DIR = "dir"
    ALL = (FILE, DIR)


class SyncStatus:
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    NOT_MODIFIED = "NOT_MODIFIED"
    RATE_LIMITED = "RATE_LIMITED"
    FAILED = "FAILED"
    ALL = (PENDING, RUNNING, SUCCESS, NOT_MODIFIED, RATE_LIMITED, FAILED)


class MessageStatus:
    UNREAD = "UNREAD"
    READ = "READ"
    REPLIED = "REPLIED"
    ARCHIVED = "ARCHIVED"
    ALL = (UNREAD, READ, REPLIED, ARCHIVED)


def check_in(column: str, values) -> str:
    """Build a SQL 'IN (...)' predicate string for a CHECK constraint."""
    joined = ", ".join(f"'{v}'" for v in values)
    return f"{column} IN ({joined})"
