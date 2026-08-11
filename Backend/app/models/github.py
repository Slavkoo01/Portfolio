"""
GitHub cache models.

Everything GitHub-related is cached in PostgreSQL so public visits never call
the GitHub API. Source-code TEXT is stored inline (content); binary files store
NULL content and keep a download_url pointing at GitHub's raw CDN.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import GithubFileType, SyncStatus, check_in

if TYPE_CHECKING:
    from app.models.project import Project


class GithubRepository(Base, TimestampMixin):
    """Cached repository metadata. ETag/Last-Modified live here (cache validators)."""

    __tablename__ = "github_repositories"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    github_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    owner: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(320))
    description: Mapped[str | None] = mapped_column(Text)
    html_url: Mapped[str | None] = mapped_column(String(512))
    default_branch: Mapped[str | None] = mapped_column(String(120))
    language: Mapped[str | None] = mapped_column(String(80))

    stars: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    forks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    open_issues: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    last_commit_sha: Mapped[str | None] = mapped_column(String(64))
    github_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    github_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Conditional-request validators for the next sync.
    etag: Mapped[str | None] = mapped_column(String(255))
    last_modified: Mapped[str | None] = mapped_column(String(255))

    project: Mapped["Project"] = relationship(back_populates="repository")
    files: Mapped[list["GithubFile"]] = relationship(
        back_populates="repository", cascade="all, delete-orphan"
    )
    syncs: Mapped[list["GithubSync"]] = relationship(
        back_populates="repository", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<GithubRepository id={self.id} full_name={self.full_name!r}>"


class GithubFile(Base, TimestampMixin):
    """A file or directory in the cached repo tree (self-referential via parent_id)."""

    __tablename__ = "github_files"
    __table_args__ = (
        CheckConstraint(check_in("type", GithubFileType.ALL), name="ck_ghfile_type"),
        UniqueConstraint("repository_id", "path", name="uq_ghfile_repo_path"),
        Index("ix_ghfile_repo_parent", "repository_id", "parent_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    repository_id: Mapped[int] = mapped_column(
        ForeignKey("github_repositories.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("github_files.id", ondelete="CASCADE"), nullable=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    size: Mapped[int | None] = mapped_column(BigInteger)
    sha: Mapped[str | None] = mapped_column(String(64))
    download_url: Mapped[str | None] = mapped_column(String(1024))
    html_url: Mapped[str | None] = mapped_column(String(1024))
    # NULL for binaries / oversized files; source text is stored inline.
    content: Mapped[str | None] = mapped_column(Text)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    repository: Mapped["GithubRepository"] = relationship(back_populates="files")
    parent: Mapped["GithubFile | None"] = relationship(
        remote_side="GithubFile.id", back_populates="children"
    )
    children: Mapped[list["GithubFile"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<GithubFile id={self.id} path={self.path!r} type={self.type}>"


class GithubSync(Base, TimestampMixin):
    """Append-only audit log of sync attempts. No cache validators here."""

    __tablename__ = "github_syncs"
    __table_args__ = (
        CheckConstraint(check_in("status", SyncStatus.ALL), name="ck_ghsync_status"),
        CheckConstraint("requests_made >= 0", name="ck_ghsync_requests"),
        Index("ix_ghsync_repo_started", "repository_id", "started_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    repository_id: Mapped[int] = mapped_column(
        ForeignKey("github_repositories.id", ondelete="CASCADE"), nullable=False
    )

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=SyncStatus.PENDING)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    requests_made: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    repository: Mapped["GithubRepository"] = relationship(back_populates="syncs")

    def __repr__(self) -> str:
        return f"<GithubSync id={self.id} status={self.status}>"
