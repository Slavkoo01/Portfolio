"""Skill model. Belongs directly to a user (single-owner design, no junction)."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Skill(Base, TimestampMixin):
    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_skills_user_name"),
        CheckConstraint(
            "proficiency >= 0 AND proficiency <= 100", name="ck_skills_proficiency"
        ),
        CheckConstraint("years_experience >= 0", name="ck_skills_years"),
        Index("ix_skills_user_order", "user_id", "display_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str | None] = mapped_column(String(80))
    # 0-100 percentage, matching the UI skill bars.
    proficiency: Mapped[int | None] = mapped_column(SmallInteger)
    years_experience: Mapped[float | None] = mapped_column(Numeric(3, 1))
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user: Mapped["User"] = relationship(back_populates="skills")

    def __repr__(self) -> str:
        return f"<Skill id={self.id} name={self.name!r}>"
