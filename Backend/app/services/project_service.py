"""Project business logic: mirrors ModelService."""
from __future__ import annotations

from datetime import datetime, timezone

from app.errors.exceptions import NotFoundError, ValidationError
from app.models.project import Project
from app.repositories.project_repository import ProjectRepository
from app.utils.slug import unique_slug


class ProjectService:
    def __init__(self, projects: ProjectRepository | None = None):
        self.projects = projects or ProjectRepository()

    # ---------- public ----------
    def get_public_by_slug(self, slug: str) -> Project:
        project = self.projects.get_by_slug(slug)
        if project is None:
            raise NotFoundError("Project not found.", code="PROJECT_NOT_FOUND")
        return project

    def list_public(self, **kwargs):
        return self.projects.list_public(**kwargs)

    # ---------- admin ----------
    def get_admin_by_id(self, project_id: int) -> Project:
        project = self.projects.get_by_id(project_id)
        if project is None or project.is_deleted:
            raise NotFoundError("Project not found.", code="PROJECT_NOT_FOUND")
        return project

    def list_admin(self, **kwargs):
        return self.projects.list_admin(**kwargs)

    # ---------- writes ----------
    def create(self, owner_id: int, data: dict) -> Project:
        slug = self._resolve_slug(
            data.get("slug"), data["title"], data.get("github_repo")
        )
        project = Project(
            owner_id=owner_id,
            title=data["title"],
            slug=slug,
            description=data.get("description"),
            github_owner=data.get("github_owner"),
            github_repo=data.get("github_repo"),
            github_url=data.get("github_url"),
            is_featured=data.get("is_featured", False),
            is_published=data.get("is_published", False),
        )
        self.projects.add(project)
        self.projects.commit()
        return project

    def update(self, project_id: int, data: dict) -> Project:
        project = self.get_admin_by_id(project_id)

        if data.get("slug") and data["slug"] != project.slug:
            if self.projects.slug_exists(data["slug"]):
                raise ValidationError("Slug already in use.", code="SLUG_TAKEN")
            project.slug = data["slug"]

        for field in ("title", "description", "github_owner", "github_repo",
                      "github_url", "is_featured", "is_published"):
            if field in data:
                setattr(project, field, data[field])

        self.projects.commit()
        return project

    def soft_delete(self, project_id: int) -> None:
        project = self.get_admin_by_id(project_id)
        project.deleted_at = datetime.now(timezone.utc)
        self.projects.commit()

    # ---------- helpers ----------
    def _resolve_slug(self, provided: str | None, title: str,
                      github_repo: str | None = None) -> str:
        # 1. An explicit slug always wins.
        if provided:
            if self.projects.slug_exists(provided):
                raise ValidationError("Slug already in use.", code="SLUG_TAKEN")
            return provided
        # 2. Prefer the GitHub repo name — it's unique and stable, so the slug
        #    never inherits a typo from the display title.
        if github_repo:
            return unique_slug(github_repo, self.projects.slug_exists)
        # 3. Fall back to the title for projects without a repo.
        return unique_slug(title, self.projects.slug_exists)
