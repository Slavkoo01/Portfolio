"""Asset output schema. Adds a resolved `url` field via the storage service."""
from __future__ import annotations

from marshmallow import Schema, fields, post_dump

from app.services.storage.factory import get_storage


class AssetOutSchema(Schema):
    id = fields.Integer()
    asset_type = fields.String()
    file_name = fields.String()
    storage_key = fields.String()
    mime_type = fields.String(allow_none=True)
    file_size = fields.Integer(allow_none=True)
    created_at = fields.DateTime()

    @post_dump
    def add_url(self, data, **kwargs):
        # Resolve the storage_key to a fetchable URL. This is the only place
        # the frontend gets a URL; the key itself stays provider-independent.
        if data.get("storage_key"):
            data["url"] = get_storage().get_url(data["storage_key"])
        return data
