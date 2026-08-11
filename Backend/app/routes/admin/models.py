"""
Admin model endpoints. All require ADMIN + CSRF. See drafts and deleted-excluded.

  GET    /api/admin/models
  GET    /api/admin/models/<id>
  POST   /api/admin/models
  PUT    /api/admin/models/<id>
  DELETE /api/admin/models/<id>
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from app.auth.decorators import admin_required
from app.errors.exceptions import ValidationError
from app.schemas.common import paginated
from app.schemas.model import ModelOutSchema, ModelCreateSchema, ModelUpdateSchema
from app.services.model_service import ModelService

admin_models_bp = Blueprint("admin_models", __name__, url_prefix="/api/admin/models")

_out = ModelOutSchema()
_create = ModelCreateSchema()
_update = ModelUpdateSchema()


@admin_models_bp.get("")
@admin_required
def list_models():
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    items, total = ModelService().list_admin(page=page, per_page=per_page)
    return jsonify(paginated("models", ModelOutSchema(many=True).dump(items),
                             total, page, per_page))


@admin_models_bp.get("/<int:model_id>")
@admin_required
def get_model(model_id: int):
    model = ModelService().get_admin_by_id(model_id)
    return jsonify({"model": _out.dump(model)})


@admin_models_bp.post("")
@admin_required
def create_model():
    payload = request.get_json(silent=True) or {}
    errors = _create.validate(payload)
    if errors:
        raise ValidationError(details=errors)
    data = _create.load(payload)
    model = ModelService().create(owner_id=g.current_user.id, data=data)
    return jsonify({"model": _out.dump(model)}), 201


@admin_models_bp.put("/<int:model_id>")
@admin_required
def update_model(model_id: int):
    payload = request.get_json(silent=True) or {}
    errors = _update.validate(payload)
    if errors:
        raise ValidationError(details=errors)
    data = _update.load(payload)
    model = ModelService().update(model_id, data)
    return jsonify({"model": _out.dump(model)})


@admin_models_bp.delete("/<int:model_id>")
@admin_required
def delete_model(model_id: int):
    ModelService().soft_delete(model_id)
    return jsonify({"message": "Model deleted."})
