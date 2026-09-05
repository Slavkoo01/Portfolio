"""
Public read-only endpoints. No auth. Only published, non-deleted content.

  GET /api/models
  GET /api/models/categories
  GET /api/models/<slug>
  GET /api/projects
  GET /api/projects/<slug>
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.schemas.common import paginated
from app.schemas.model import ModelOutSchema, CategoryOutSchema
from app.schemas.project import ProjectOutSchema
from app.services.model_service import ModelService
from app.services.project_service import ProjectService

public_bp = Blueprint("public", __name__, url_prefix="/api")

_model_out = ModelOutSchema()
_category_out = CategoryOutSchema(many=True)
_project_out = ProjectOutSchema()


def _page_args():
    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    except (TypeError, ValueError):
        page, per_page = 1, 20
    return page, per_page


# ---------- models ----------
@public_bp.get("/models")
def list_models():
    page, per_page = _page_args()
    category = request.args.get("category")
    featured = request.args.get("featured")
    featured_bool = None if featured is None else featured.lower() == "true"

    items, total = ModelService().list_public(
        category_slug=category, featured=featured_bool, page=page, per_page=per_page
    )
    return jsonify(paginated(
        "models", ModelOutSchema(many=True).dump(items), total, page, per_page
    ))


@public_bp.get("/models/categories")
def list_categories():
    cats = ModelService().list_categories()
    return jsonify({"categories": _category_out.dump(cats)})


@public_bp.get("/software")
def list_software():
    from app.models.software import Software
    from app.extensions import db
    from app.schemas.model import SoftwareOutSchema
    rows = db.session.query(Software).order_by(Software.name).all()
    return jsonify({"software": SoftwareOutSchema(many=True).dump(rows)})


@public_bp.get("/models/<slug>")
def get_model(slug: str):
    model = ModelService().get_public_by_slug(slug)
    return jsonify({"model": _model_out.dump(model)})


# ---------- projects ----------
@public_bp.get("/projects")
def list_projects():
    page, per_page = _page_args()
    featured = request.args.get("featured")
    featured_bool = None if featured is None else featured.lower() == "true"

    items, total = ProjectService().list_public(
        featured=featured_bool, page=page, per_page=per_page
    )
    return jsonify(paginated(
        "projects", ProjectOutSchema(many=True).dump(items), total, page, per_page
    ))


@public_bp.get("/projects/<slug>")
def get_project(slug: str):
    project = ProjectService().get_public_by_slug(slug)
    return jsonify({"project": _project_out.dump(project)})


# ---------- github (public, cache-only) ----------
from app.schemas.github import (  # noqa: E402
    GithubRepoOutSchema, GithubFileContentSchema,
)
from app.services.github.read import GitHubReadService  # noqa: E402

_gh_repo_out = GithubRepoOutSchema()
_gh_file_out = GithubFileContentSchema()


@public_bp.get("/projects/<slug>/repository")
def project_repository(slug: str):
    repo = GitHubReadService().get_repo(slug)
    return jsonify({"repository": _gh_repo_out.dump(repo)})


@public_bp.get("/projects/<slug>/repository/tree")
def project_tree(slug: str):
    return jsonify(GitHubReadService().get_tree(slug))


@public_bp.get("/projects/<slug>/repository/file/<path:file_path>")
def project_file(slug: str, file_path: str):
    f = GitHubReadService().get_file(slug, file_path)
    return jsonify({"file": _gh_file_out.dump(f)})
