"""
Links a Project to a GithubRepository cache row.

Creating a project does NOT touch GitHub (per architecture). This service just
creates/updates the local cache row from the project's github_owner/github_repo
so a later sync has something to populate. Actual GitHub calls happen only in sync.
"""
from __future__ import annotations

from app.errors.exceptions import NotFoundError, ValidationError
from app.models.github import GithubRepository
from app.repositories.github_repository import GithubRepoRepository
from app.repositories.project_repository import ProjectRepository


class GitHubLinkService:
    def __init__(self):
        self.repos = GithubRepoRepository()
        self.projects = ProjectRepository()

    def ensure_repo_for_project(self, project_id: int) -> GithubRepository:
        project = self.projects.get_by_id(project_id)
        if project is None or project.is_deleted:
            raise NotFoundError("Project not found.", code="PROJECT_NOT_FOUND")
        if not project.github_owner or not project.github_repo:
            raise ValidationError(
                "Project has no github_owner/github_repo set.",
                code="NO_GITHUB_LINK",
            )

        existing = self.repos.get_by_project_id(project_id)
        if existing:
            existing.owner = project.github_owner
            existing.name = project.github_repo
            self.repos.commit()
            return existing

        repo = GithubRepository(
            project_id=project_id,
            owner=project.github_owner,
            name=project.github_repo,
        )
        self.repos.add(repo)
        self.repos.commit()
        return repo
