"""Public: read homepage stats. Admin: update them."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from sqlalchemy import select

from app.auth.decorators import admin_required
from app.extensions import db
from app.models.site_stats import SiteStat

# public
stats_bp = Blueprint("stats", __name__, url_prefix="/api")


@stats_bp.get("/stats")
def list_stats():
    rows = db.session.scalars(
        select(SiteStat).order_by(SiteStat.display_order, SiteStat.id)
    ).all()
    return jsonify({"stats": [
        {"key": s.key, "label": s.label, "value": s.value} for s in rows
    ]})


# admin
admin_stats_bp = Blueprint("admin_stats", __name__, url_prefix="/api/admin")


@admin_stats_bp.get("/stats")
@admin_required
def admin_list_stats():
    rows = db.session.scalars(
        select(SiteStat).order_by(SiteStat.display_order, SiteStat.id)
    ).all()
    return jsonify({"stats": [
        {"id": s.id, "key": s.key, "label": s.label, "value": s.value,
         "display_order": s.display_order} for s in rows
    ]})


@admin_stats_bp.put("/stats")
@admin_required
def admin_update_stats():
    """Bulk update: body { stats: [ {key, label, value}, ... ] }.
    Upserts by key; unknown keys are created."""
    data = request.get_json(silent=True) or {}
    incoming = data.get("stats", [])

    # keys that should remain after this save
    keep_keys = set()
    for i, item in enumerate(incoming):
        key = (item.get("key") or "").strip()
        label = (item.get("label") or "").strip()
        value = (item.get("value") or "").strip()
        # skip incomplete rows entirely
        if not key or not label or not value:
            continue
        keep_keys.add(key)
        row = db.session.scalar(select(SiteStat).where(SiteStat.key == key))
        if row is None:
            row = SiteStat(key=key)
            db.session.add(row)
        row.label = label
        row.value = value
        row.display_order = i

    # delete any stats the form no longer contains (form is the source of truth)
    all_rows = db.session.scalars(select(SiteStat)).all()
    for row in all_rows:
        if row.key not in keep_keys:
            db.session.delete(row)

    db.session.commit()
    return admin_list_stats()
