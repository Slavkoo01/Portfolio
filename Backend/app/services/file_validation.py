"""
Upload validation.

Rules (never trust the client):
  - asset_type must be one of the allowed types
  - extension must be allowed for that asset_type
  - file size must be within the configured limit
  - MIME/content sniffing where feasible (magic bytes) to catch spoofed extensions

We keep the allow-lists in config-adjacent constants here so they're easy to tune.
"""
from __future__ import annotations

from app.errors.exceptions import ValidationError
from app.models.enums import AssetType

# Allowed file extensions per asset type.
ALLOWED_EXTENSIONS: dict[str, set[str]] = {
    AssetType.MODEL: {".glb", ".gltf", ".fbx", ".obj"},
    AssetType.TEXTURE: {".png", ".jpg", ".jpeg", ".webp", ".tga", ".ktx2"},
    AssetType.THUMBNAIL: {".png", ".jpg", ".jpeg", ".webp"},
    AssetType.RENDER: {".png", ".jpg", ".jpeg", ".webp"},
    AssetType.ANIMATION: {".glb", ".gltf", ".fbx"},
    AssetType.OTHER: {".png", ".jpg", ".jpeg", ".webp", ".glb", ".gltf",
                      ".fbx", ".obj", ".zip", ".pdf"},
}

# Magic-byte signatures for common types we can cheaply verify.
# (offset, bytes) — checked at the start of the file unless offset given.
_MAGIC = {
    ".png": [(0, b"\x89PNG\r\n\x1a\n")],
    ".jpg": [(0, b"\xff\xd8\xff")],
    ".jpeg": [(0, b"\xff\xd8\xff")],
    ".webp": [(0, b"RIFF"), (8, b"WEBP")],
    ".glb": [(0, b"glTF")],           # GLB binary header magic
    ".pdf": [(0, b"%PDF")],
    ".zip": [(0, b"PK\x03\x04")],
}


def validate_asset_type(asset_type: str) -> None:
    if asset_type not in AssetType.ALL:
        raise ValidationError(
            f"Invalid asset_type. Allowed: {', '.join(AssetType.ALL)}",
            code="INVALID_ASSET_TYPE",
        )


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot != -1 else ""


def validate_extension(asset_type: str, filename: str) -> str:
    ext = _extension(filename)
    allowed = ALLOWED_EXTENSIONS.get(asset_type, set())
    if ext not in allowed:
        raise ValidationError(
            f"Extension {ext or '(none)'} not allowed for {asset_type}. "
            f"Allowed: {', '.join(sorted(allowed))}",
            code="INVALID_EXTENSION",
        )
    return ext


def validate_size(size_bytes: int, max_mb: int) -> None:
    if size_bytes <= 0:
        raise ValidationError("Empty file.", code="EMPTY_FILE")
    if size_bytes > max_mb * 1024 * 1024:
        raise ValidationError(
            f"File too large. Max {max_mb} MB.", code="FILE_TOO_LARGE"
        )


def sniff_content(ext: str, head: bytes) -> None:
    """
    Verify magic bytes for types we know. If we have no signature for the ext,
    we skip (can't verify e.g. .fbx/.obj/.tga cheaply) rather than reject.
    """
    signatures = _MAGIC.get(ext)
    if not signatures:
        return  # no known signature; extension check already passed
    for offset, magic in signatures:
        if head[offset:offset + len(magic)] != magic:
            raise ValidationError(
                f"File content does not match {ext} format.",
                code="CONTENT_MISMATCH",
            )
