"""
Admin software endpoints (list / create / update / delete / icon upload).
ADMIN + CSRF required. Lets you manage the software list and upload custom
icons instead of relying on an external CDN.
"""
from __future__ import annotations

import io
import os

from flask import Blueprint, jsonify, request

from app.auth.decorators import admin_required
from app.errors.exceptions import ValidationError, NotFoundError
from app.extensions import db
from app.models.software import Software
from app.schemas.model import SoftwareOutSchema
from app.services.storage.factory import get_storage
from app.utils.slug import slugify

admin_software_bp = Blueprint("admin_software", __name__, url_prefix="/api/admin/software")

_out = SoftwareOutSchema()

ICON_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}


@admin_software_bp.get("")
@admin_required
def list_software():
    rows = db.session.query(Software).order_by(Software.name).all()
    return jsonify({"software": SoftwareOutSchema(many=True).dump(rows)})


@admin_software_bp.post("")
@admin_required
def create_software():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise ValidationError("Name is required.", code="NAME_REQUIRED")
    slug = (data.get("slug") or slugify(name)).strip()
    if db.session.query(Software).filter(
        (Software.name == name) | (Software.slug == slug)
    ).first():
        raise ValidationError("Software with this name/slug exists.", code="SOFTWARE_EXISTS")
    sw = Software(name=name, slug=slug, icon_url=data.get("icon_url") or None)
    db.session.add(sw)
    db.session.commit()
    return jsonify({"software": _out.dump(sw)}), 201


@admin_software_bp.put("/<int:software_id>")
@admin_required
def update_software(software_id: int):
    sw = db.session.get(Software, software_id)
    if not sw:
        raise NotFoundError("Software not found.", code="SOFTWARE_NOT_FOUND")
    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        sw.name = data["name"].strip()
    if "icon_url" in data:
        sw.icon_url = data["icon_url"] or None
    db.session.commit()
    return jsonify({"software": _out.dump(sw)})


@admin_software_bp.delete("/<int:software_id>")
@admin_required
def delete_software(software_id: int):
    sw = db.session.get(Software, software_id)
    if not sw:
        raise NotFoundError("Software not found.", code="SOFTWARE_NOT_FOUND")
    db.session.delete(sw)
    db.session.commit()
    return jsonify({"message": "Software deleted."})


@admin_software_bp.post("/<int:software_id>/icon")
@admin_required
def upload_icon(software_id: int):
    sw = db.session.get(Software, software_id)
    if not sw:
        raise NotFoundError("Software not found.", code="SOFTWARE_NOT_FOUND")
    if "file" not in request.files:
        raise ValidationError("No file provided (form field 'file').", code="NO_FILE")
    file = request.files["file"]
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ICON_EXTS:
        raise ValidationError(
            f"Icon must be one of: {', '.join(sorted(ICON_EXTS))}", code="BAD_ICON_EXT"
        )

    storage = get_storage()
    key = f"software/{sw.slug}/icon{ext}"
    data = file.read()
    storage.save(io.BytesIO(data), key, content_type=file.mimetype)
    # store the served URL
    sw.icon_url = storage.get_url(key)
    db.session.commit()
    return jsonify({"software": _out.dump(sw)})
