"""Software / tools used to create 3D models, plus the model<->software junction."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String, Table, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.model import Model

# Association table for the many-to-many between models and software.
# A plain Core Table is the idiomatic choice for a junction with no extra columns.
model_software = Table(
    "model_software",
    Base.metadata,
    Column(
        "model_id",
        ForeignKey("models.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "software_id",
        ForeignKey("software.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Index("ix_model_software_software", "software_id"),
)


class Software(Base, TimestampMixin):
    __tablename__ = "software"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(512))

    models: Mapped[list["Model"]] = relationship(
        secondary=model_software, back_populates="software"
    )

    def __repr__(self) -> str:
        return f"<Software id={self.id} name={self.name!r}>"
