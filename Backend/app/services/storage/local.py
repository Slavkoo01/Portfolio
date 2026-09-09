"""
Local filesystem storage. Writes files under STORAGE_LOCAL_ROOT (e.g. backend/storage).

Security: storage keys are sanitised to prevent path traversal (../) so a
malicious key can never write or read outside the storage root.
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import BinaryIO

from app.services.storage.base import StorageService


class LocalStorageService(StorageService):
    def __init__(self, root: str, url_prefix: str = "/files"):
        # Absolute, resolved root. All files must live inside this directory.
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.url_prefix = url_prefix.rstrip("/")

    # ---- internal: resolve a key to a safe absolute path ----
    def _resolve(self, storage_key: str) -> Path:
        # Reject absolute keys and normalise the path.
        key = storage_key.lstrip("/")
        target = (self.root / key).resolve()
        # Ensure the resolved path is still inside root (blocks ../ escapes).
        if not str(target).startswith(str(self.root)):
            raise ValueError(f"Illegal storage key (path traversal): {storage_key!r}")
        return target

    def save(self, file_stream: BinaryIO, storage_key: str, *,
             content_type: str | None = None) -> str:
        target = self._resolve(storage_key)
        target.parent.mkdir(parents=True, exist_ok=True)
        # Stream to disk (works for large files without loading into memory).
        with open(target, "wb") as f:
            shutil.copyfileobj(file_stream, f)
        return storage_key

    def delete(self, storage_key: str) -> None:
        target = self._resolve(storage_key)
        if target.exists():
            target.unlink()

    def exists(self, storage_key: str) -> bool:
        return self._resolve(storage_key).is_file()

    def get_url(self, storage_key: str) -> str:
        # Served by the files blueprint (routes/files.py).
        return f"{self.url_prefix}/{storage_key.lstrip('/')}"
