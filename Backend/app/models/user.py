"""User account model."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, String, Boolean
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import UserRole, check_in

if TYPE_CHECKING:
    from app.models.profile import Profile
    from app.models.skill import Skill
    from app.models.model import Model
    from app.models.project import Project


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(check_in("role", UserRole.ALL), name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # CITEXT gives case-insensitive uniqueness without lower() gymnastics.
    username: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.USER)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # --- relationships ---
    profile: Mapped["Profile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    skills: Mapped[list["Skill"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    models: Mapped[list["Model"]] = relationship(back_populates="owner")
    projects: Mapped[list["Project"]] = relationship(back_populates="owner")

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r} role={self.role}>"
