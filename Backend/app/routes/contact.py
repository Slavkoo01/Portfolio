"""
Public contact endpoint. No auth. Rate-limited to deter spam.

  POST /api/contact   { name, email, subject?, message }

CSRF is NOT required here (unauthenticated public form). Abuse is mitigated by
rate limiting per client IP hash.
"""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from app.errors.exceptions import ValidationError
from app.schemas.contact import ContactCreateSchema, ContactOutSchema
from app.services.contact_service import ContactService
from app.services.rate_limit import rate_limiter
from app.utils.hashing import ip_hash

contact_bp = Blueprint("contact", __name__, url_prefix="/api")

_create = ContactCreateSchema()
_out = ContactOutSchema()


@contact_bp.post("/contact")
def submit_contact():
    # Rate limit: default 5 messages per hour per IP hash.
    limit = current_app.config.get("CONTACT_RATE_LIMIT", 5)
    window = current_app.config.get("CONTACT_RATE_WINDOW", 3600)
    rate_limiter.check(f"contact:{ip_hash()}", limit=limit, window_seconds=window)

    payload = request.get_json(silent=True) or {}
    errors = _create.validate(payload)
    if errors:
        raise ValidationError(details=errors)
    data = _create.load(payload)

    msg = ContactService().submit(data)
    # Return minimal confirmation (don't echo full message back).
    return jsonify({
        "message": "Thank you for your message. I'll get back to you soon.",
        "id": msg.id,
    }), 201
