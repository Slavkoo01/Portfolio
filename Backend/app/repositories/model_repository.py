"""Model + ModelCategory data access."""
from __future__ import annotations

from sqlalchemy import select, func

from app.extensions import db
from app.models.model import Model, ModelCategory
from app.repositories.base import BaseRepository


class ModelCategoryRepository(BaseRepository[ModelCategory]):
    model = ModelCategory

    def list_all(self) -> list[ModelCategory]:
        return list(db.session.scalars(select(ModelCategory).order_by(ModelCategory.name)))

    def get_by_slug(self, slug: str) -> ModelCategory | None:
        return db.session.scalar(select(ModelCategory).where(ModelCategory.slug == slug))


class ModelRepository(BaseRepository[Model]):
    model = Model

    def slug_exists(self, slug: str) -> bool:
        stmt = select(func.count()).select_from(Model).where(Model.slug == slug)
        return db.session.scalar(stmt) > 0

    def get_by_slug(self, slug: str, *, include_unpublished: bool = False,
                    include_deleted: bool = False) -> Model | None:
        stmt = select(Model).where(Model.slug == slug)
        if not include_unpublished:
            stmt = stmt.where(Model.is_published.is_(True))
        if not include_deleted:
            stmt = stmt.where(Model.deleted_at.is_(None))
        return db.session.scalar(stmt)

    def list_public(self, *, category_slug: str | None = None,
                    featured: bool | None = None,
                    page: int = 1, per_page: int = 20) -> tuple[list[Model], int]:
        """Published, non-deleted models. Returns (items, total)."""
        base = select(Model).where(
            Model.is_published.is_(True), Model.deleted_at.is_(None)
        )
        if category_slug:
            base = base.join(ModelCategory).where(ModelCategory.slug == category_slug)
        if featured is not None:
            base = base.where(Model.is_featured.is_(featured))

        total = db.session.scalar(
            select(func.count()).select_from(base.subquery())
        )
        items = list(
            db.session.scalars(
                base.order_by(Model.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        return items, total

    def list_admin(self, *, page: int = 1, per_page: int = 20
                   ) -> tuple[list[Model], int]:
        """All non-deleted models incl. drafts. Returns (items, total)."""
        base = select(Model).where(Model.deleted_at.is_(None))
        total = db.session.scalar(select(func.count()).select_from(base.subquery()))
        items = list(
            db.session.scalars(
                base.order_by(Model.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        return items, total
