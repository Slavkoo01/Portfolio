"""
Slug utilities.

A slug is a URL-safe version of a title: "Mech Warrior" -> "mech-warrior".
Used in public URLs like /api/models/mech-warrior. We generate from a title and
guarantee uniqueness by appending -2, -3, ... if needed.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Callable

_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    """Turn arbitrary text into a lowercase, hyphenated, ASCII slug."""
    # Normalise accented characters to ASCII (č -> c, ž -> z, etc.).
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower().strip()
    value = _slug_re.sub("-", value)
    value = value.strip("-")
    return value or "item"


def unique_slug(base_title: str, exists: Callable[[str], bool]) -> str:
    """
    Generate a unique slug from base_title.

    `exists(slug)` must return True if that slug is already taken. We append a
    numeric suffix until we find a free one.
    """
    base = slugify(base_title)
    if not exists(base):
        return base
    n = 2
    while exists(f"{base}-{n}"):
        n += 1
    return f"{base}-{n}"
