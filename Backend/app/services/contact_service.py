"""
Contact message business logic.

Guests submit messages (no account). Admin lists/reads/updates/deletes them.
Opening a message auto-transitions UNREAD -> READ. ARCHIVED acts as soft delete,
but a hard delete is also available to the admin.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.errors.exceptions import NotFoundError
from app.models.contact import ContactMessage
from app.models.enums import MessageStatus
from app.repositories.contact_repository import ContactRepository


def _now():
    return datetime.now(timezone.utc)


class ContactService:
    def __init__(self, repo: ContactRepository | None = None):
        self.repo = repo or ContactRepository()

    # ---------- public ----------
    def submit(self, data: dict) -> ContactMessage:
        msg = ContactMessage(
            name=data["name"].strip(),
            email=data["email"].strip(),
            subject=(data.get("subject") or None),
            message=data["message"].strip(),
            status=MessageStatus.UNREAD,
        )
        self.repo.add(msg)
        self.repo.commit()
        return msg

    # ---------- admin ----------
    def list(self, *, status: str | None = None, page: int = 1, per_page: int = 20):
        return self.repo.list_filtered(status=status, page=page, per_page=per_page)

    def get(self, message_id: int, *, mark_read: bool = True) -> ContactMessage:
        msg = self.repo.get_by_id(message_id)
        if msg is None:
            raise NotFoundError("Message not found.", code="MESSAGE_NOT_FOUND")
        # Opening an unread message marks it read.
        if mark_read and msg.status == MessageStatus.UNREAD:
            msg.status = MessageStatus.READ
            msg.read_at = _now()
            self.repo.commit()
        return msg

    def update_status(self, message_id: int, status: str) -> ContactMessage:
        msg = self.repo.get_by_id(message_id)
        if msg is None:
            raise NotFoundError("Message not found.", code="MESSAGE_NOT_FOUND")
        msg.status = status
        if status == MessageStatus.READ and msg.read_at is None:
            msg.read_at = _now()
        if status == MessageStatus.REPLIED and msg.replied_at is None:
            msg.replied_at = _now()
        self.repo.commit()
        return msg

    def delete(self, message_id: int) -> None:
        msg = self.repo.get_by_id(message_id)
        if msg is None:
            raise NotFoundError("Message not found.", code="MESSAGE_NOT_FOUND")
        self.repo.delete(msg)
        self.repo.commit()
