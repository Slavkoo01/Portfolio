"""GitHub cache data access: repositories, files, syncs."""
from __future__ import annotations

from sqlalchemy import select, delete as sa_delete

from app.extensions import db
from app.models.github import GithubRepository, GithubFile, GithubSync
from app.repositories.base import BaseRepository


class GithubRepoRepository(BaseRepository[GithubRepository]):
    model = GithubRepository

    def get_by_project_id(self, project_id: int) -> GithubRepository | None:
        return db.session.scalar(
            select(GithubRepository).where(GithubRepository.project_id == project_id)
        )

    def list_all(self) -> list[GithubRepository]:
        return list(db.session.scalars(select(GithubRepository)))


class GithubFileRepository(BaseRepository[GithubFile]):
    model = GithubFile

    def list_for_repo(self, repo_id: int) -> list[GithubFile]:
        return list(
            db.session.scalars(
                select(GithubFile)
                .where(GithubFile.repository_id == repo_id)
                .order_by(GithubFile.path)
            )
        )

    def get_by_path(self, repo_id: int, path: str) -> GithubFile | None:
        return db.session.scalar(
            select(GithubFile).where(
                GithubFile.repository_id == repo_id, GithubFile.path == path
            )
        )

    def delete_all_for_repo(self, repo_id: int) -> None:
        db.session.execute(
            sa_delete(GithubFile).where(GithubFile.repository_id == repo_id)
        )


class GithubSyncRepository(BaseRepository[GithubSync]):
    model = GithubSync

    def latest_for_repo(self, repo_id: int) -> GithubSync | None:
        return db.session.scalar(
            select(GithubSync)
            .where(GithubSync.repository_id == repo_id)
            .order_by(GithubSync.started_at.desc())
            .limit(1)
        )
