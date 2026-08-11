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
    app.register_blueprint(health_bp)
    # Later phases will add:
    #   app.register_blueprint(auth_bp)
    #   app.register_blueprint(public_bp)
    #   app.register_blueprint(contact_bp)
    #   app.register_blueprint(admin_models_bp)  ... etc.
