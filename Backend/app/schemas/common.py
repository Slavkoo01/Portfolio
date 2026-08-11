"""Shared schema helpers."""
from __future__ import annotations

from marshmallow import Schema, fields


class PaginationQuerySchema(Schema):
    page = fields.Integer(load_default=1)
    per_page = fields.Integer(load_default=20)


def paginated(items_key: str, dumped_items, total: int, page: int, per_page: int) -> dict:
    return {
        items_key: dumped_items,
        "pagination": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if per_page else 0,
        },
    }
