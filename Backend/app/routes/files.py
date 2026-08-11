"""
Local file serving.

Serves files written by LocalStorageService under /files/<storage_key>.
This route exists ONLY for the local backend — in production with R2/S3 the
storage service returns CDN URLs directly and this route isn't used.

Path traversal is blocked by the storage service's key resolution.
"""
from __future__ import annotations

from flask import Blueprint, current_app, send_file

from app.errors.exceptions import NotFoundError
from app.services.storage.factory import get_storage
from app.services.storage.local import LocalStorageService

files_bp = Blueprint("files", __name__, url_prefix="/files")


@files_bp.get("/<path:storage_key>")
def serve_file(storage_key: str):
    storage = get_storage()
    # Only the local backend serves through Flask.
    if not isinstance(storage, LocalStorageService):
        raise NotFoundError("File serving not available for this backend.")

    if not storage.exists(storage_key):
        raise NotFoundError("File not found.", code="FILE_NOT_FOUND")

    abs_path = storage._resolve(storage_key)  # already traversal-safe
    return send_file(abs_path)
