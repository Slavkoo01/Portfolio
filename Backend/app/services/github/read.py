"""
Read-only GitHub cache access for public endpoints. NEVER calls GitHub.
Builds a nested file tree from the flat github_files rows.
"""
from __future__ import annotations

from app.errors.exceptions import NotFoundError
from app.repositories.github_repository import (
    GithubRepoRepository, GithubFileRepository,
)
from app.repositories.project_repository import ProjectRepository


class GitHubReadService:
    def __init__(self):
        self.repos = GithubRepoRepository()
        self.files = GithubFileRepository()
        self.projects = ProjectRepository()

    def _repo_for_public_project(self, slug: str):
        project = self.projects.get_by_slug(slug)  # published + non-deleted only
        if project is None:
            raise NotFoundError("Project not found.", code="PROJECT_NOT_FOUND")
        repo = self.repos.get_by_project_id(project.id)
        if repo is None:
            raise NotFoundError("Repository not synced.", code="REPO_NOT_SYNCED")
        return repo

    def get_repo(self, slug: str):
        return self._repo_for_public_project(slug)

    def get_tree(self, slug: str) -> dict:
        repo = self._repo_for_public_project(slug)
        rows = self.files.list_for_repo(repo.id)
        return self._build_tree(rows)

    def get_file(self, slug: str, path: str):
        repo = self._repo_for_public_project(slug)
        f = self.files.get_by_path(repo.id, path)
        if f is None:
            raise NotFoundError("File not found.", code="FILE_NOT_FOUND")
        return f

    def _build_tree(self, rows) -> dict:
        # Map id -> node dict; attach children by parent_id.
        nodes = {}
        for r in rows:
            nodes[r.id] = {
                "id": r.id, "name": r.name, "path": r.path,
                "type": r.type, "size": r.size, "children": [],
            }
        roots = []
        for r in rows:
            node = nodes[r.id]
            if r.parent_id and r.parent_id in nodes:
                nodes[r.parent_id]["children"].append(node)
            else:
                roots.append(node)
        # Sort: dirs first, then files, alphabetically.
        def sort_nodes(items):
            items.sort(key=lambda n: (n["type"] != "dir", n["name"].lower()))
            for it in items:
                if it["children"]:
                    sort_nodes(it["children"])
        sort_nodes(roots)
        return {"tree": roots}
