"""Editable homepage statistics (key/value pairs the admin controls)."""
from __future__ import annotations

from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class SiteStat(Base, TimestampMixin):
    __tablename__ = "site_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)  # e.g. "models"
    label: Mapped[str] = mapped_column(String(80), nullable=False)            # "3D Models"
    value: Mapped[str] = mapped_column(String(40), nullable=False)            # "10+"
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
