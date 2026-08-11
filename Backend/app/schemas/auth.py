"""
Auth request/response schemas (marshmallow 4.x).

Load schemas validate incoming JSON; dump schemas shape outgoing JSON and, most
importantly, ensure sensitive fields (password_hash) never leave the server.
"""
from __future__ import annotations

from marshmallow import Schema, fields, validate


class LoginSchema(Schema):
    # Accept username OR email in a single "identifier" field.
    identifier = fields.String(required=True, validate=validate.Length(min=1, max=255))
    password = fields.String(required=True, validate=validate.Length(min=1, max=255))


class UserOutSchema(Schema):
    """Public-safe representation of a user. Note: no password_hash field."""

    id = fields.Integer()
    username = fields.String()
    email = fields.String()
    role = fields.String()
    is_active = fields.Boolean()
    last_login_at = fields.DateTime()
    created_at = fields.DateTime()
