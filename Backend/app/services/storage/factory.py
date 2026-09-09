"""
Storage factory. Picks the backend from config (STORAGE_BACKEND) and caches one
instance per app. Callers use get_storage() and never construct a backend directly.
"""
from __future__ import annotations

from flask import current_app, g

from app.services.storage.base import StorageService
from app.services.storage.local import LocalStorageService
from app.services.storage.r2 import R2StorageService


def get_storage() -> StorageService:
    # Cache on flask.g so we build one per request context.
    if "storage" in g:
        return g.storage

    backend = current_app.config["STORAGE_BACKEND"]
    if backend == "local":
        storage = LocalStorageService(current_app.config["STORAGE_LOCAL_ROOT"])
    elif backend == "r2":
        storage = R2StorageService(
            account_id=current_app.config["R2_ACCOUNT_ID"],
            access_key_id=current_app.config["R2_ACCESS_KEY_ID"],
            secret_access_key=current_app.config["R2_SECRET_ACCESS_KEY"],
            bucket=current_app.config["R2_BUCKET"],
            public_base_url=current_app.config["R2_PUBLIC_BASE_URL"],
        )
    else:
        raise RuntimeError(f"Unknown STORAGE_BACKEND: {backend!r}")

    g.storage = storage
    return storage