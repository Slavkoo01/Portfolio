"""Profile / About-me model. One-to-one with User."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    display_name: Mapped[str | None] = mapped_column(String(120))
    title: Mapped[str | None] = mapped_column(String(160))
    bio: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    location: Mapped[str | None] = mapped_column(String(160))

    # Storage KEY (not a URL, not binary) resolved to a URL by StorageService.
    profile_image: Mapped[str | None] = mapped_column(String(512))
    resume_url: Mapped[str | None] = mapped_column(String(512))

    linkedin_url: Mapped[str | None] = mapped_column(String(512))
    github_url: Mapped[str | None] = mapped_column(String(512))

    user: Mapped["User"] = relationship(back_populates="profile")

    def __repr__(self) -> str:
        return f"<Profile id={self.id} user_id={self.user_id}>"
