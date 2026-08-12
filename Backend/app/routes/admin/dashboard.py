"""
Admin dashboard endpoint. ADMIN + CSRF.

  GET /api/admin/dashboard  -> counts, views, recent items, github status
"""
from __future__ import annotations

from flask import Blueprint, jsonify

from app.auth.decorators import admin_required
from app.services.dashboard_service import DashboardService

admin_dashboard_bp = Blueprint("admin_dashboard", __name__, url_prefix="/api/admin")


@admin_dashboard_bp.get("/dashboard")
@admin_required
def dashboard():
    return jsonify(DashboardService().build())
