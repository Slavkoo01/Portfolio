"""Project data access."""
from __future__ import annotations

from sqlalchemy import select, func

from app.extensions import db
from app.models.project import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    model = Project

    def slug_exists(self, slug: str) -> bool:
        stmt = select(func.count()).select_from(Project).where(Project.slug == slug)
        return db.session.scalar(stmt) > 0

    def get_by_slug(self, slug: str, *, include_unpublished: bool = False,
                    include_deleted: bool = False) -> Project | None:
        stmt = select(Project).where(Project.slug == slug)
        if not include_unpublished:
            stmt = stmt.where(Project.is_published.is_(True))
        if not include_deleted:
            stmt = stmt.where(Project.deleted_at.is_(None))
        return db.session.scalar(stmt)

    def list_public(self, *, featured: bool | None = None,
                    page: int = 1, per_page: int = 20) -> tuple[list[Project], int]:
        base = select(Project).where(
            Project.is_published.is_(True), Project.deleted_at.is_(None)
        )
        if featured is not None:
            base = base.where(Project.is_featured.is_(featured))
        total = db.session.scalar(select(func.count()).select_from(base.subquery()))
        items = list(
            db.session.scalars(
                base.order_by(Project.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        return items, total

    def list_admin(self, *, page: int = 1, per_page: int = 20
                   ) -> tuple[list[Project], int]:
        base = select(Project).where(Project.deleted_at.is_(None))
        total = db.session.scalar(select(func.count()).select_from(base.subquery()))
        items = list(
            db.session.scalars(
                base.order_by(Project.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        return items, total
