"""GitHub cache output schemas."""
from __future__ import annotations

from marshmallow import Schema, fields


class GithubRepoOutSchema(Schema):
    id = fields.Integer()
    owner = fields.String()
    name = fields.String()
    full_name = fields.String(allow_none=True)
    description = fields.String(allow_none=True)
    html_url = fields.String(allow_none=True)
    default_branch = fields.String(allow_none=True)
    language = fields.String(allow_none=True)
    stars = fields.Integer()
    forks = fields.Integer()
    open_issues = fields.Integer()
    synced_at = fields.DateTime(allow_none=True)


class GithubFileNodeSchema(Schema):
    """A node in the file tree (no content — that's fetched per-file)."""
    id = fields.Integer()
    name = fields.String()
    path = fields.String()
    type = fields.String()
    size = fields.Integer(allow_none=True)


class GithubFileContentSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    path = fields.String()
    type = fields.String()
    size = fields.Integer(allow_none=True)
    download_url = fields.String(allow_none=True)
    html_url = fields.String(allow_none=True)
    content = fields.String(allow_none=True)


class GithubSyncOutSchema(Schema):
    id = fields.Integer()
    status = fields.String()
    started_at = fields.DateTime(allow_none=True)
    finished_at = fields.DateTime(allow_none=True)
    last_success_at = fields.DateTime(allow_none=True)
    error_message = fields.String(allow_none=True)
    requests_made = fields.Integer()
