"""
Storage abstraction.

Every storage backend (local disk now, Cloudflare R2 later) implements this
interface. Business logic depends ONLY on this abstract class, never on a
concrete provider. Swapping local -> R2 is then a config change, not a rewrite.

A "storage_key" is a provider-independent path like:
    models/mech-warrior/thumbnail/preview.png
The same key works for local disk and for an S3/R2 bucket.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import BinaryIO


class StorageService(ABC):
    @abstractmethod
    def save(self, file_stream: BinaryIO, storage_key: str, *,
             content_type: str | None = None) -> str:
        """Persist a file at storage_key. Returns the storage_key."""

    @abstractmethod
    def delete(self, storage_key: str) -> None:
        """Delete the file at storage_key. No error if it doesn't exist."""

    @abstractmethod
    def exists(self, storage_key: str) -> bool:
        """True if a file exists at storage_key."""

    @abstractmethod
    def get_url(self, storage_key: str) -> str:
        """
        Return a URL the frontend can use to fetch the file.

        Local: a URL served by our Flask file route.
        R2/S3: the public/CDN URL (or a presigned GET URL).
        This is the ONLY place a storage_key becomes a URL.
        """

    def generate_upload_url(self, storage_key: str, *,
                            content_type: str | None = None) -> dict | None:
        """
        For direct-to-storage uploads (presigned PUT). Returns None for local
        (no presigning); R2 implementation returns {url, fields, ...} later.
        The interface exists now so the R2 flow drops in without touching callers.
        """
        return None
