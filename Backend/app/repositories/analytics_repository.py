"""Page view analytics data access."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func

from app.extensions import db
from app.models.analytics import PageView
from app.repositories.base import BaseRepository


class AnalyticsRepository(BaseRepository[PageView]):
    model = PageView

    def count_since(self, since: datetime) -> int:
        return db.session.scalar(
            select(func.count()).select_from(PageView)
            .where(PageView.created_at >= since)
        )

    def count_unique_since(self, since: datetime) -> int:
        return db.session.scalar(
            select(func.count(func.distinct(PageView.visitor_hash)))
            .where(PageView.created_at >= since)
        )

    def total(self) -> int:
        return db.session.scalar(select(func.count()).select_from(PageView))

    def top_paths_since(self, since: datetime, limit: int = 5) -> list[tuple[str, int]]:
        rows = db.session.execute(
            select(PageView.path, func.count().label("views"))
            .where(PageView.created_at >= since)
            .group_by(PageView.path)
            .order_by(func.count().desc())
            .limit(limit)
        ).all()
        return [(r[0], r[1]) for r in rows]
