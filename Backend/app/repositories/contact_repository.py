"""Contact message data access."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func

from app.extensions import db
from app.models.contact import ContactMessage
from app.models.enums import MessageStatus
from app.repositories.base import BaseRepository


class ContactRepository(BaseRepository[ContactMessage]):
    model = ContactMessage

    def list_filtered(self, *, status: str | None = None,
                      page: int = 1, per_page: int = 20
                      ) -> tuple[list[ContactMessage], int]:
        base = select(ContactMessage)
        if status:
            base = base.where(ContactMessage.status == status)
        total = db.session.scalar(select(func.count()).select_from(base.subquery()))
        items = list(
            db.session.scalars(
                base.order_by(ContactMessage.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        return items, total

    def count_by_status(self, status: str) -> int:
        return db.session.scalar(
            select(func.count()).select_from(ContactMessage)
            .where(ContactMessage.status == status)
        )

    def count_recent_from_ip_hash(self, ip_hash: str, minutes: int) -> int:
        """Used for rate limiting — count messages from an IP hash in a window.
        (Requires the ip_hash column; if not present we fall back to 0.)"""
        # ContactMessage has no ip_hash column in the base schema, so this is a
        # placeholder for a DB-backed limiter. The in-memory limiter is used now.
        return 0
