"""
Base repository.

Repositories are the ONLY layer that touches db.session. They encapsulate
queries and persistence so services and routes never write raw SQLAlchemy.
This generic base provides common get/add/delete helpers; concrete repos add
domain-specific queries.
"""
from __future__ import annotations

from typing import Generic, TypeVar

from app.extensions import db
from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def get_by_id(self, id_: int) -> ModelT | None:
        return db.session.get(self.model, id_)

    def add(self, instance: ModelT) -> ModelT:
        db.session.add(instance)
        return instance

    def delete(self, instance: ModelT) -> None:
        db.session.delete(instance)

    def flush(self) -> None:
        """Flush pending changes to the DB (assign PKs) without committing."""
        db.session.flush()

    def commit(self) -> None:
        db.session.commit()
