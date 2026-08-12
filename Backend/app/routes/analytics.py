"""
Public page-view tracking. No auth. Rate-limited and best-effort.

  POST /api/analytics/view   { path }

The frontend calls this on navigation. Failures are swallowed (a tracking error
must never break the user's page). We store only a pseudonymous visitor hash.
"""
from __future__ import annotations

import logging

from flask import Blueprint, current_app, jsonify, request

from app.services.analytics_service import AnalyticsService
from app.services.rate_limit import rate_limiter
from app.utils.hashing import ip_hash

log = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.post("/view")
def track_view():
    payload = request.get_json(silent=True) or {}
    path = (payload.get("path") or "").strip()
    if not path:
        return jsonify({"ok": False}), 200  # nothing to record, don't error

    # Light rate limit to prevent flooding (per IP hash).
    try:
        rate_limiter.check(
            f"view:{ip_hash()}",
            limit=current_app.config.get("VIEW_RATE_LIMIT", 120),
            window_seconds=current_app.config.get("VIEW_RATE_WINDOW", 60),
        )
    except Exception:  # noqa: BLE001
        return jsonify({"ok": False}), 200  # over limit: silently skip

    try:
        AnalyticsService().record_view(
            path=path,
            user_agent=request.headers.get("User-Agent"),
            referer=request.headers.get("Referer"),
        )
    except Exception as e:  # noqa: BLE001
        log.warning("Failed to record page view: %s", e)
        return jsonify({"ok": False}), 200

    return jsonify({"ok": True}), 201
