"""
Dashboard aggregation service.

Collects the numbers the admin dashboard shows in one place, so the route can
return everything in a single response. Uses existing repositories; adds no new
heavy queries beyond simple counts and small "recent" lists.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func

from app.extensions import db
from app.models.model import Model
from app.models.project import Project
from app.models.contact import ContactMessage
from app.models.enums import MessageStatus
from app.models.github import GithubSync, GithubRepository
from app.repositories.analytics_repository import AnalyticsRepository


def _now():
    return datetime.now(timezone.utc)


class DashboardService:
    def __init__(self):
        self.analytics = AnalyticsRepository()

    def build(self) -> dict:
        return {
            "counts": self._counts(),
            "views": self._views(),
            "recent": self._recent(),
            "github": self._github_status(),
        }

    # ---------- counts ----------
    def _counts(self) -> dict:
        model_count = db.session.scalar(
            select(func.count()).select_from(Model).where(Model.deleted_at.is_(None))
        )
        published_models = db.session.scalar(
            select(func.count()).select_from(Model)
            .where(Model.deleted_at.is_(None), Model.is_published.is_(True))
        )
        project_count = db.session.scalar(
            select(func.count()).select_from(Project).where(Project.deleted_at.is_(None))
        )
        published_projects = db.session.scalar(
            select(func.count()).select_from(Project)
            .where(Project.deleted_at.is_(None), Project.is_published.is_(True))
        )
        total_messages = db.session.scalar(
            select(func.count()).select_from(ContactMessage)
        )
        unread_messages = db.session.scalar(
            select(func.count()).select_from(ContactMessage)
            .where(ContactMessage.status == MessageStatus.UNREAD)
        )
        return {
            "models": model_count,
            "models_published": published_models,
            "projects": project_count,
            "projects_published": published_projects,
            "messages": total_messages,
            "messages_unread": unread_messages,
        }

    # ---------- views ----------
    def _views(self) -> dict:
        now = _now()
        return {
            "total": self.analytics.total(),
            "last_7_days": self.analytics.count_since(now - timedelta(days=7)),
            "last_30_days": self.analytics.count_since(now - timedelta(days=30)),
            "unique_30_days": self.analytics.count_unique_since(now - timedelta(days=30)),
        }

    # ---------- recent ----------
    def _recent(self) -> dict:
        recent_models = db.session.scalars(
            select(Model).where(Model.deleted_at.is_(None))
            .order_by(Model.created_at.desc()).limit(5)
        ).all()
        recent_projects = db.session.scalars(
            select(Project).where(Project.deleted_at.is_(None))
            .order_by(Project.created_at.desc()).limit(5)
        ).all()
        recent_messages = db.session.scalars(
            select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(5)
        ).all()
        return {
            "models": [
                {"id": m.id, "title": m.title, "slug": m.slug,
                 "is_published": m.is_published, "created_at": m.created_at.isoformat()}
                for m in recent_models
            ],
            "projects": [
                {"id": p.id, "title": p.title, "slug": p.slug,
                 "is_published": p.is_published, "created_at": p.created_at.isoformat()}
                for p in recent_projects
            ],
            "messages": [
                {"id": m.id, "name": m.name, "subject": m.subject,
                 "status": m.status, "created_at": m.created_at.isoformat()}
                for m in recent_messages
            ],
        }

    # ---------- github ----------
    def _github_status(self) -> dict:
        repo_count = db.session.scalar(
            select(func.count()).select_from(GithubRepository)
        )
        # Latest sync across all repos.
        latest = db.session.scalar(
            select(GithubSync).order_by(GithubSync.started_at.desc()).limit(1)
        )
        return {
            "repositories": repo_count,
            "last_sync": {
                "status": latest.status,
                "started_at": latest.started_at.isoformat() if latest.started_at else None,
                "finished_at": latest.finished_at.isoformat() if latest.finished_at else None,
            } if latest else None,
        }
