"""
Admin category endpoints (create / delete). ADMIN + CSRF required.

Deleting a category sets category_id to NULL on its models (ON DELETE SET NULL),
which hides them from the public site until they get a new category.
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from sqlalchemy import func, select

from app.auth.decorators import admin_required
from app.errors.exceptions import ValidationError, NotFoundError
from app.extensions import db
from app.models.model import Model, ModelCategory
from app.schemas.model import CategoryOutSchema
from app.utils.slug import slugify

admin_categories_bp = Blueprint(
    "admin_categories", __name__, url_prefix="/api/admin/categories"
)

_out = CategoryOutSchema()


@admin_categories_bp.get("")
@admin_required
def list_categories():
    rows = db.session.query(ModelCategory).order_by(ModelCategory.name).all()
    # attach a model count so the UI can warn before delete
    out = []
    for c in rows:
        count = db.session.scalar(
            select(func.count()).select_from(Model).where(
                Model.category_id == c.id, Model.deleted_at.is_(None)
            )
        )
        d = _out.dump(c)
        d["model_count"] = count
        out.append(d)
    return jsonify({"categories": out})


@admin_categories_bp.post("")
@admin_required
def create_category():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise ValidationError("Name is required.", code="NAME_REQUIRED")
    slug = (data.get("slug") or slugify(name)).strip()
    existing = db.session.query(ModelCategory).filter(
        (ModelCategory.name == name) | (ModelCategory.slug == slug)
    ).first()
    if existing:
        # idempotent-ish: return the existing one instead of erroring
        return jsonify({"category": _out.dump(existing)}), 200
    cat = ModelCategory(name=name, slug=slug)
    db.session.add(cat)
    db.session.commit()
    return jsonify({"category": _out.dump(cat)}), 201


@admin_categories_bp.delete("/<int:category_id>")
@admin_required
def delete_category(category_id: int):
    cat = db.session.get(ModelCategory, category_id)
    if not cat:
        raise NotFoundError("Category not found.", code="CATEGORY_NOT_FOUND")
    db.session.delete(cat)  # models' category_id -> NULL via ON DELETE SET NULL
    db.session.commit()
    return jsonify({"message": "Category deleted."})
