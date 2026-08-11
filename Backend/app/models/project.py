"""Project model. May optionally link to a cached GitHub repository."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.github import GithubRepository


class Project(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"
    __table_args__ = (
        Index(
            "ix_projects_public",
            "is_published",
            postgresql_where="deleted_at IS NULL",
        ),
        Index(
            "ix_projects_featured",
            "is_featured",
            postgresql_where="is_published AND deleted_at IS NULL",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # The "intended" repo pointer. Cached GitHub data lives in github_repositories.
    # Not every project must have a GitHub repo (non-GitHub projects allowed).
    github_owner: Mapped[str | None] = mapped_column(String(120))
    github_repo: Mapped[str | None] = mapped_column(String(200))
    github_url: Mapped[str | None] = mapped_column(String(512))

    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    owner: Mapped["User"] = relationship(back_populates="projects")
    repository: Mapped["GithubRepository | None"] = relationship(
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id} slug={self.slug!r}>"
