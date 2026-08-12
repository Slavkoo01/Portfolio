"""
Blueprint registration.

Real blueprints (auth, public, contact, admin/*) are implemented in later phases.
For Phase 3 we register a single health-check blueprint so the app boots and is
verifiably alive before any business endpoints exist.
"""
from __future__ import annotations

from flask import Blueprint, Flask, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    return jsonify({"status": "ok"})


def register_blueprints(app: Flask) -> None:
    from app.routes.auth import auth_bp
    from app.routes.public import public_bp
    from app.routes.files import files_bp
    from app.routes.admin.models import admin_models_bp
    from app.routes.admin.projects import admin_projects_bp
    from app.routes.admin.assets import admin_assets_bp
    from app.routes.admin.github import admin_github_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(admin_models_bp)
    app.register_blueprint(admin_projects_bp)
    app.register_blueprint(admin_assets_bp)
    app.register_blueprint(admin_github_bp)
    # Later phases will add:
    #   app.register_blueprint(contact_bp)
    #   app.register_blueprint(admin_github_bp)  ... etc.
