"""
Admin GitHub endpoints. ADMIN + CSRF. The ONLY place that triggers GitHub calls.

  POST /api/admin/github/sync                       -> sync all linked repos
  POST /api/admin/projects/<project_id>/github/link -> create cache row from project
  POST /api/admin/github/repositories/<repo_id>/sync-> sync one repo
  GET  /api/admin/github/repositories               -> list cached repos + last sync
"""
from __future__ import annotations

from flask import Blueprint, jsonify

from app.auth.decorators import admin_required
from app.errors.exceptions import NotFoundError
from app.repositories.github_repository import (
    GithubRepoRepository, GithubSyncRepository,
)
from app.schemas.github import GithubRepoOutSchema, GithubSyncOutSchema
from app.services.github.service import GitHubService
from app.services.github.link import GitHubLinkService

admin_github_bp = Blueprint("admin_github", __name__, url_prefix="/api/admin")

_repo_out = GithubRepoOutSchema()
_sync_out = GithubSyncOutSchema()


@admin_github_bp.post("/projects/<int:project_id>/github/link")
@admin_required
def link_project(project_id: int):
    repo = GitHubLinkService().ensure_repo_for_project(project_id)
    return jsonify({"repository": _repo_out.dump(repo)}), 201


@admin_github_bp.post("/github/sync")
@admin_required
def sync_all():
    results = GitHubService().sync_all()
    return jsonify({"results": results})


@admin_github_bp.post("/github/repositories/<int:repo_id>/sync")
@admin_required
def sync_one(repo_id: int):
    repo = GithubRepoRepository().get_by_id(repo_id)
    if repo is None:
        raise NotFoundError("Repository not found.", code="REPO_NOT_FOUND")
    result = GitHubService().sync_repository(repo)
    return jsonify({"result": result})


@admin_github_bp.get("/github/repositories")
@admin_required
def list_repos():
    repos = GithubRepoRepository().list_all()
    syncs = GithubSyncRepository()
    out = []
    for r in repos:
        latest = syncs.latest_for_repo(r.id)
        out.append({
            "repository": _repo_out.dump(r),
            "last_sync": _sync_out.dump(latest) if latest else None,
        })
    return jsonify({"repositories": out})
