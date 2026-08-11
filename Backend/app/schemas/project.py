"""Project schemas (marshmallow 4.x)."""
from __future__ import annotations

from marshmallow import Schema, fields, validate

SLUG_REGEX = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class ProjectOutSchema(Schema):
    id = fields.Integer()
    title = fields.String()
    slug = fields.String()
    description = fields.String(allow_none=True)
    github_owner = fields.String(allow_none=True)
    github_repo = fields.String(allow_none=True)
    github_url = fields.String(allow_none=True)
    is_featured = fields.Boolean()
    is_published = fields.Boolean()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class ProjectCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    slug = fields.String(
        required=False,
        validate=validate.And(
            validate.Length(min=1, max=200),
            validate.Regexp(SLUG_REGEX, error="Slug must be lowercase, hyphen-separated."),
        ),
    )
    description = fields.String(allow_none=True)
    github_owner = fields.String(allow_none=True, validate=validate.Length(max=120))
    github_repo = fields.String(allow_none=True, validate=validate.Length(max=200))
    github_url = fields.String(allow_none=True, validate=validate.Length(max=512))
    is_featured = fields.Boolean(load_default=False)
    is_published = fields.Boolean(load_default=False)


class ProjectUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=200))
    slug = fields.String(
        validate=validate.And(
            validate.Length(min=1, max=200),
            validate.Regexp(SLUG_REGEX, error="Slug must be lowercase, hyphen-separated."),
        )
    )
    description = fields.String(allow_none=True)
    github_owner = fields.String(allow_none=True, validate=validate.Length(max=120))
    github_repo = fields.String(allow_none=True, validate=validate.Length(max=200))
    github_url = fields.String(allow_none=True, validate=validate.Length(max=512))
    is_featured = fields.Boolean()
    is_published = fields.Boolean()
