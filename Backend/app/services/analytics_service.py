"""
Analytics business logic (intentionally minimal).

Records pseudonymous page views (no raw IP) and provides simple counts. This is
best-effort: recording must never break a page render, so callers should not
depend on its return value.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from app.models.analytics import PageView
from app.repositories.analytics_repository import AnalyticsRepository
from app.utils.hashing import ip_hash


class AnalyticsService:
    def __init__(self, repo: AnalyticsRepository | None = None):
        self.repo = repo or AnalyticsRepository()

    def record_view(self, path: str, user_agent: str | None,
                    referer: str | None) -> None:
        view = PageView(
            path=path[:512],
            visitor_hash=ip_hash(),
            user_agent=(user_agent or "")[:512] or None,
            referer=(referer or "")[:512] or None,
        )
        self.repo.add(view)
        self.repo.commit()

    def views_since_days(self, days: int) -> int:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        return self.repo.count_since(since)

    def unique_since_days(self, days: int) -> int:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        return self.repo.count_unique_since(since)
