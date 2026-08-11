"""Admin project endpoints. All require ADMIN + CSRF."""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from app.auth.decorators import admin_required
from app.errors.exceptions import ValidationError
from app.schemas.common import paginated
from app.schemas.project import ProjectOutSchema, ProjectCreateSchema, ProjectUpdateSchema
from app.services.project_service import ProjectService

admin_projects_bp = Blueprint("admin_projects", __name__, url_prefix="/api/admin/projects")

_out = ProjectOutSchema()
_create = ProjectCreateSchema()
_update = ProjectUpdateSchema()


@admin_projects_bp.get("")
@admin_required
def list_projects():
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    items, total = ProjectService().list_admin(page=page, per_page=per_page)
    return jsonify(paginated("projects", ProjectOutSchema(many=True).dump(items),
                             total, page, per_page))


@admin_projects_bp.get("/<int:project_id>")
@admin_required
def get_project(project_id: int):
    project = ProjectService().get_admin_by_id(project_id)
    return jsonify({"project": _out.dump(project)})


@admin_projects_bp.post("")
@admin_required
def create_project():
    payload = request.get_json(silent=True) or {}
    errors = _create.validate(payload)
    if errors:
        raise ValidationError(details=errors)
    data = _create.load(payload)
    project = ProjectService().create(owner_id=g.current_user.id, data=data)
    return jsonify({"project": _out.dump(project)}), 201


@admin_projects_bp.put("/<int:project_id>")
@admin_required
def update_project(project_id: int):
    payload = request.get_json(silent=True) or {}
    errors = _update.validate(payload)
    if errors:
        raise ValidationError(details=errors)
    data = _update.load(payload)
    project = ProjectService().update(project_id, data)
    return jsonify({"project": _out.dump(project)})


@admin_projects_bp.delete("/<int:project_id>")
@admin_required
def delete_project(project_id: int):
    ProjectService().soft_delete(project_id)
    return jsonify({"message": "Project deleted."})
