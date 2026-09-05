"""
Model business logic: create/update/delete, slug generation, publish filtering.

Services orchestrate repositories; they never touch HTTP or the raw session
(the repository owns the session). Public reads go through *_public methods that
enforce published + non-deleted; admin reads see everything non-deleted.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.errors.exceptions import NotFoundError, ValidationError
from app.models.model import Model
from app.repositories.model_repository import ModelRepository, ModelCategoryRepository
from app.utils.slug import unique_slug


class ModelService:
    def __init__(self, models: ModelRepository | None = None,
                 categories: ModelCategoryRepository | None = None):
        self.models = models or ModelRepository()
        self.categories = categories or ModelCategoryRepository()

    # ---------- public reads ----------
    def get_public_by_slug(self, slug: str) -> Model:
        model = self.models.get_by_slug(slug)
        if model is None:
            raise NotFoundError("Model not found.", code="MODEL_NOT_FOUND")
        return model

    def list_public(self, **kwargs):
        return self.models.list_public(**kwargs)

    def list_categories(self):
        return self.categories.list_all()

    # ---------- admin reads ----------
    def get_admin_by_id(self, model_id: int) -> Model:
        model = self.models.get_by_id(model_id)
        if model is None or model.is_deleted:
            raise NotFoundError("Model not found.", code="MODEL_NOT_FOUND")
        return model

    def list_admin(self, **kwargs):
        return self.models.list_admin(**kwargs)

    # ---------- writes ----------
    def create(self, owner_id: int, data: dict) -> Model:
        self._validate_category(data.get("category_id"))
        slug = self._resolve_slug(data.get("slug"), data["title"])

        model = Model(
            owner_id=owner_id,
            title=data["title"],
            slug=slug,
            description=data.get("description"),
            category_id=data.get("category_id"),
            is_featured=data.get("is_featured", False),
            is_published=data.get("is_published", False),
            polygon_count=data.get("polygon_count"),
            vertex_count=data.get("vertex_count"),
            position_x=data.get("position_x", 0.0),
            position_y=data.get("position_y", 0.0),
            position_z=data.get("position_z", 0.0),
            rotation_x=data.get("rotation_x", 0.0),
            rotation_y=data.get("rotation_y", 0.0),
            rotation_z=data.get("rotation_z", 0.0),
            scale_x=data.get("scale_x", 1.0),
            scale_y=data.get("scale_y", 1.0),
            scale_z=data.get("scale_z", 1.0),
            tags=data.get("tags"),
            is_rigged=data.get("is_rigged", False),
            texture_info=data.get("texture_info"),
        )
        self._set_software(model, data.get("software_ids"))
        self.models.add(model)
        self.models.commit()
        return model

    def update(self, model_id: int, data: dict) -> Model:
        model = self.get_admin_by_id(model_id)

        if "category_id" in data:
            self._validate_category(data["category_id"])

        # If slug explicitly provided, validate uniqueness; else keep existing.
        if data.get("slug") and data["slug"] != model.slug:
            if self.models.slug_exists(data["slug"]):
                raise ValidationError("Slug already in use.", code="SLUG_TAKEN")
            model.slug = data["slug"]

        transform_fields = (
            "position_x", "position_y", "position_z",
            "rotation_x", "rotation_y", "rotation_z",
            "scale_x", "scale_y", "scale_z",
        )
        for field in ("title", "description", "category_id", "is_featured",
                      "is_published", "polygon_count", "vertex_count",
                      "tags", "is_rigged", "texture_info",
                      *transform_fields):
            if field in data:
                setattr(model, field, data[field])

        if "software_ids" in data:
            self._set_software(model, data["software_ids"])

        self.models.commit()
        return model

    def _set_software(self, model, software_ids):
        """Replace the model's software list from a list of software IDs."""
        if not software_ids:
            model.software = []
            return
        from app.models.software import Software
        from app.extensions import db
        rows = db.session.query(Software).filter(Software.id.in_(software_ids)).all()
        model.software = rows

    def soft_delete(self, model_id: int) -> None:
        model = self.get_admin_by_id(model_id)
        model.deleted_at = datetime.now(timezone.utc)
        self.models.commit()

    # ---------- helpers ----------
    def _resolve_slug(self, provided: str | None, title: str) -> str:
        if provided:
            if self.models.slug_exists(provided):
                raise ValidationError("Slug already in use.", code="SLUG_TAKEN")
            return provided
        return unique_slug(title, self.models.slug_exists)

    def _validate_category(self, category_id: int | None) -> None:
        if category_id is None:
            return
        if self.categories.get_by_id(category_id) is None:
            raise ValidationError("Category does not exist.", code="CATEGORY_NOT_FOUND")
