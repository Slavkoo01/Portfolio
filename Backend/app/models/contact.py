"""Contact message model. Submitted by guests; no account required."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, Text, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import MessageStatus, check_in


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    __table_args__ = (
        CheckConstraint(check_in("status", MessageStatus.ALL), name="ck_contact_status"),
        Index("ix_contact_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # ARCHIVED acts as the soft-delete for messages, so no deleted_at here.
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=MessageStatus.UNREAD
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<ContactMessage id={self.id} status={self.status}>"
