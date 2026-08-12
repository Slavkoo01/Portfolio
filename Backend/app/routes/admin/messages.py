"""
Admin contact-message endpoints. ADMIN + CSRF.

  GET    /api/admin/messages?status=UNREAD&page=1
  GET    /api/admin/messages/<id>            (marks UNREAD -> READ)
  PATCH  /api/admin/messages/<id>            { status }
  DELETE /api/admin/messages/<id>            (hard delete)
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.auth.decorators import admin_required
from app.errors.exceptions import ValidationError
from app.schemas.common import paginated
from app.schemas.contact import ContactOutSchema, ContactStatusUpdateSchema
from app.services.contact_service import ContactService

admin_messages_bp = Blueprint("admin_messages", __name__, url_prefix="/api/admin/messages")

_out = ContactOutSchema()
_status = ContactStatusUpdateSchema()


@admin_messages_bp.get("")
@admin_required
def list_messages():
    status = request.args.get("status")
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    items, total = ContactService().list(status=status, page=page, per_page=per_page)
    return jsonify(paginated("messages", ContactOutSchema(many=True).dump(items),
                             total, page, per_page))


@admin_messages_bp.get("/<int:message_id>")
@admin_required
def get_message(message_id: int):
    msg = ContactService().get(message_id, mark_read=True)
    return jsonify({"message": _out.dump(msg)})


@admin_messages_bp.patch("/<int:message_id>")
@admin_required
def update_message(message_id: int):
    payload = request.get_json(silent=True) or {}
    errors = _status.validate(payload)
    if errors:
        raise ValidationError(details=errors)
    data = _status.load(payload)
    msg = ContactService().update_status(message_id, data["status"])
    return jsonify({"message": _out.dump(msg)})


@admin_messages_bp.delete("/<int:message_id>")
@admin_required
def delete_message(message_id: int):
    ContactService().delete(message_id)
    return jsonify({"message": "Message deleted."})
