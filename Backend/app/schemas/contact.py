"""Contact message schemas (marshmallow 4.x)."""
from __future__ import annotations

from marshmallow import Schema, fields, validate, ValidationError as MMValidationError
from email_validator import validate_email, EmailNotValidError


def _validate_email_field(value: str):
    try:
        validate_email(value, check_deliverability=False)
    except EmailNotValidError as e:
        raise MMValidationError(str(e))


class ContactCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=160))
    email = fields.String(required=True, validate=_validate_email_field)
    subject = fields.String(required=False, allow_none=True,
                            validate=validate.Length(max=255))
    message = fields.String(required=True, validate=validate.Length(min=1, max=5000))


class ContactOutSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    email = fields.String()
    subject = fields.String(allow_none=True)
    message = fields.String()
    status = fields.String()
    created_at = fields.DateTime()
    read_at = fields.DateTime(allow_none=True)
    replied_at = fields.DateTime(allow_none=True)


class ContactStatusUpdateSchema(Schema):
    status = fields.String(
        required=True,
        validate=validate.OneOf(["UNREAD", "READ", "REPLIED", "ARCHIVED"]),
    )
