"""
Model asset business logic.

Ties together: validation (file_validation) + storage (StorageService) + the
database (AssetRepository). Ensures the DB and the filesystem stay consistent:
a DB row is only created after the file is safely written; deleting a row also
deletes the file.
"""
from __future__ import annotations

from flask import current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from app.errors.exceptions import NotFoundError
from app.models.model import ModelAsset
from app.repositories.asset_repository import AssetRepository
from app.repositories.model_repository import ModelRepository
from app.services import file_validation as fv
from app.services.storage.factory import get_storage
from app.utils.slug import slugify


class AssetService:
    def __init__(self, assets: AssetRepository | None = None,
                 models: ModelRepository | None = None):
        self.assets = assets or AssetRepository()
        self.models = models or ModelRepository()

    def list_for_model(self, model_id: int) -> list[ModelAsset]:
        self._require_model(model_id)
        return self.assets.list_for_model(model_id)

    def upload(self, model_id: int, asset_type: str, file: FileStorage) -> ModelAsset:
        model = self._require_model(model_id)

        # --- validation (never trust the client) ---
        fv.validate_asset_type(asset_type)
        original_name = secure_filename(file.filename or "")
        if not original_name:
            from app.errors.exceptions import ValidationError
            raise ValidationError("Missing filename.", code="MISSING_FILENAME")
        ext = fv.validate_extension(asset_type, original_name)

        # Read head for magic-byte sniff, then rewind.
        head = file.stream.read(16)
        file.stream.seek(0)
        fv.sniff_content(ext, head)

        # Size: seek to end to measure, then rewind.
        file.stream.seek(0, 2)
        size = file.stream.tell()
        file.stream.seek(0)
        fv.validate_size(size, current_app.config["MAX_UPLOAD_MB"])

        # --- build a provider-independent storage key ---
        storage_key = self._build_key(model.slug, asset_type, original_name)

        # --- persist file first, then DB row (so no orphan rows on failure) ---
        storage = get_storage()
        storage.save(file.stream, storage_key, content_type=file.mimetype)

        asset = ModelAsset(
            model_id=model.id,
            asset_type=asset_type,
            file_name=original_name,
            storage_key=storage_key,
            mime_type=file.mimetype,
            file_size=size,
        )
        self.assets.add(asset)
        self.assets.commit()
        return asset

    def delete(self, model_id: int, asset_id: int) -> None:
        self._require_model(model_id)
        asset = self.assets.get_by_id(asset_id)
        if asset is None or asset.model_id != model_id:
            raise NotFoundError("Asset not found.", code="ASSET_NOT_FOUND")

        # Delete file from storage first, then the DB row.
        get_storage().delete(asset.storage_key)
        self.assets.delete(asset)
        self.assets.commit()

    # ---------- helpers ----------
    def _require_model(self, model_id: int):
        model = self.models.get_by_id(model_id)
        if model is None or model.is_deleted:
            raise NotFoundError("Model not found.", code="MODEL_NOT_FOUND")
        return model

    def _build_key(self, model_slug: str, asset_type: str, filename: str) -> str:
        # e.g. models/mech-warrior/thumbnail/preview.png
        # Slugify the base name but keep the extension.
        dot = filename.rfind(".")
        base, ext = (filename[:dot], filename[dot:]) if dot != -1 else (filename, "")
        safe_base = slugify(base)
        key = f"models/{model_slug}/{asset_type.lower()}/{safe_base}{ext.lower()}"

        # Avoid collisions: if key exists, append -2, -3, ...
        if not self.assets.storage_key_exists(key) and not get_storage().exists(key):
            return key
        n = 2
        while True:
            candidate = f"models/{model_slug}/{asset_type.lower()}/{safe_base}-{n}{ext.lower()}"
            if (not self.assets.storage_key_exists(candidate)
                    and not get_storage().exists(candidate)):
                return candidate
            n += 1
