"""ModelAsset data access."""
from __future__ import annotations

from sqlalchemy import select

from app.extensions import db
from app.models.model import ModelAsset
from app.repositories.base import BaseRepository


class AssetRepository(BaseRepository[ModelAsset]):
    model = ModelAsset

    def list_for_model(self, model_id: int) -> list[ModelAsset]:
        return list(
            db.session.scalars(
                select(ModelAsset).where(ModelAsset.model_id == model_id)
            )
        )

    def storage_key_exists(self, storage_key: str) -> bool:
        return db.session.scalar(
            select(ModelAsset).where(ModelAsset.storage_key == storage_key)
        ) is not None
