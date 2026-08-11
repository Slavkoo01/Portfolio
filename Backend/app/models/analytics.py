"""Lightweight page-view analytics. Pseudonymous only — no raw PII."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PageView(Base):
    __tablename__ = "page_views"
    __table_args__ = (
        Index("ix_pageviews_created", "created_at"),
        Index("ix_pageviews_path_created", "path", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    # Hash of (ip + user_agent + daily salt). Never the raw IP.
    visitor_hash: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    referer: Mapped[str | None] = mapped_column(String(512))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<PageView id={self.id} path={self.path!r}>"
