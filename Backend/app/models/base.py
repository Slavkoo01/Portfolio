"""
Declarative base and shared mixins for all ORM models (SQLAlchemy 2.x style).

- Base:            the declarative base every model inherits from.
- TimestampMixin:  created_at / updated_at, managed by the database.
- SoftDeleteMixin: deleted_at, plus an `is_deleted` convenience property.

Mixins are opt-in per model so we don't force timestamps/soft-delete onto
tables that don't need them (junctions, cache, audit rows).
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Root declarative base. All models inherit from this."""


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
