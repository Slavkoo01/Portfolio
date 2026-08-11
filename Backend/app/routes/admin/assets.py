"""
Admin asset endpoints (upload/list/delete). ADMIN + CSRF required.

  GET    /api/admin/models/<model_id>/assets
  POST   /api/admin/models/<model_id>/assets     (multipart: file + asset_type)
  DELETE /api/admin/models/<model_id>/assets/<asset_id>

Uploads use multipart/form-data (not JSON) because they carry a binary file.
Fields: `file` (the binary) and `asset_type` (MODEL/TEXTURE/THUMBNAIL/...).
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.auth.decorators import admin_required
from app.errors.exceptions import ValidationError
from app.schemas.asset import AssetOutSchema
from app.services.asset_service import AssetService

admin_assets_bp = Blueprint(
    "admin_assets", __name__, url_prefix="/api/admin/models/<int:model_id>/assets"
)

_out = AssetOutSchema()


@admin_assets_bp.get("")
@admin_required
def list_assets(model_id: int):
    assets = AssetService().list_for_model(model_id)
    return jsonify({"assets": AssetOutSchema(many=True).dump(assets)})


@admin_assets_bp.post("")
@admin_required
def upload_asset(model_id: int):
    # Multipart form: binary file + asset_type text field.
    if "file" not in request.files:
        raise ValidationError("No file provided (form field 'file').",
                              code="NO_FILE")
    file = request.files["file"]
    asset_type = (request.form.get("asset_type") or "").strip().upper()
    if not asset_type:
        raise ValidationError("Missing 'asset_type' form field.",
                              code="MISSING_ASSET_TYPE")

    asset = AssetService().upload(model_id, asset_type, file)
    return jsonify({"asset": _out.dump(asset)}), 201


@admin_assets_bp.delete("/<int:asset_id>")
@admin_required
def delete_asset(model_id: int, asset_id: int):
    AssetService().delete(model_id, asset_id)
    return jsonify({"message": "Asset deleted."})
