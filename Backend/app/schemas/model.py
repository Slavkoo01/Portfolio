"""Model schemas (marshmallow 4.x): validation in, serialization out."""
from __future__ import annotations

from marshmallow import Schema, fields, validate, post_dump

from app.services.storage.factory import get_storage

SLUG_REGEX = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


# ---------- output ----------
class CategoryOutSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    slug = fields.String()
    description = fields.String(allow_none=True)


class ModelAssetOutSchema(Schema):
    id = fields.Integer()
    asset_type = fields.String()
    file_name = fields.String()
    storage_key = fields.String()
    mime_type = fields.String(allow_none=True)
    file_size = fields.Integer(allow_none=True)

    @post_dump
    def add_url(self, data, **kwargs):
        if data.get("storage_key"):
            data["url"] = get_storage().get_url(data["storage_key"])
        return data


class ModelAnimationOutSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    duration = fields.Float(allow_none=True)
    fps = fields.Integer(allow_none=True)
    loop = fields.Boolean()
    display_order = fields.Integer()


class ModelOutSchema(Schema):
    id = fields.Integer()
    title = fields.String()
    slug = fields.String()
    description = fields.String(allow_none=True)
    is_featured = fields.Boolean()
    is_published = fields.Boolean()
    polygon_count = fields.Integer(allow_none=True)
    vertex_count = fields.Integer(allow_none=True)
    category = fields.Nested(CategoryOutSchema, allow_none=True)
    assets = fields.Nested(ModelAssetOutSchema, many=True)
    animations = fields.Nested(ModelAnimationOutSchema, many=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


# ---------- input (create / update) ----------
class ModelCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    slug = fields.String(
        required=False,
        validate=validate.And(
            validate.Length(min=1, max=200),
            validate.Regexp(SLUG_REGEX, error="Slug must be lowercase, hyphen-separated."),
        ),
    )
    description = fields.String(allow_none=True)
    category_id = fields.Integer(allow_none=True)
    is_featured = fields.Boolean(load_default=False)
    is_published = fields.Boolean(load_default=False)
    polygon_count = fields.Integer(allow_none=True, validate=validate.Range(min=0))
    vertex_count = fields.Integer(allow_none=True, validate=validate.Range(min=0))


class ModelUpdateSchema(Schema):
    """All fields optional for partial update (PUT/PATCH)."""
    title = fields.String(validate=validate.Length(min=1, max=200))
    slug = fields.String(
        validate=validate.And(
            validate.Length(min=1, max=200),
            validate.Regexp(SLUG_REGEX, error="Slug must be lowercase, hyphen-separated."),
        )
    )
    description = fields.String(allow_none=True)
    category_id = fields.Integer(allow_none=True)
    is_featured = fields.Boolean()
    is_published = fields.Boolean()
    polygon_count = fields.Integer(allow_none=True, validate=validate.Range(min=0))
    vertex_count = fields.Integer(allow_none=True, validate=validate.Range(min=0))
