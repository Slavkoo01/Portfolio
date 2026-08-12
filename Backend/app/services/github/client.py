"""
Thin wrapper around the GitHub REST API.

Responsibilities:
  - attach the auth token (from config) to every request
  - support conditional requests (If-None-Match with a stored ETag)
  - surface rate-limit info
  - normalise responses into small typed result objects

This layer knows HTTP + GitHub, but NOT our database. GitHubService orchestrates
it and persists results. Keeping them separate means we can unit-test caching
logic without real network calls.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import requests
from flask import current_app


class GitHubError(Exception):
    """Raised for non-recoverable GitHub API failures."""
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


class GitHubRateLimitError(GitHubError):
    """Raised when the API rate limit is exhausted."""
    def __init__(self, message: str, reset_at: int | None = None):
        super().__init__(message, status=403)
        self.reset_at = reset_at


@dataclass
class GitHubResponse:
    status: int
    data: object | None
    etag: str | None = None
    last_modified: str | None = None
    not_modified: bool = False
    rate_remaining: int | None = None
    rate_reset: int | None = None
    headers: dict = field(default_factory=dict)


class GitHubClient:
    def __init__(self, token: str | None = None, base_url: str | None = None,
                 timeout: int = 15):
        cfg = current_app.config
        self.token = token if token is not None else cfg.get("GITHUB_TOKEN", "")
        self.base_url = (base_url or cfg["GITHUB_API_BASE"]).rstrip("/")
        self.timeout = timeout

    def _headers(self, etag: str | None = None,
                 last_modified: str | None = None) -> dict:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified
        return headers

    def get(self, path: str, *, etag: str | None = None,
            last_modified: str | None = None,
            params: dict | None = None) -> GitHubResponse:
        url = path if path.startswith("http") else f"{self.base_url}/{path.lstrip('/')}"
        resp = requests.get(
            url, headers=self._headers(etag, last_modified),
            params=params, timeout=self.timeout,
        )

        rate_remaining = _int_or_none(resp.headers.get("X-RateLimit-Remaining"))
        rate_reset = _int_or_none(resp.headers.get("X-RateLimit-Reset"))

        # 304: our cached copy is still fresh.
        if resp.status_code == 304:
            return GitHubResponse(
                status=304, data=None, not_modified=True,
                etag=etag, last_modified=last_modified,
                rate_remaining=rate_remaining, rate_reset=rate_reset,
                headers=dict(resp.headers),
            )

        # Rate limited: remaining == 0 with a 403.
        if resp.status_code == 403 and rate_remaining == 0:
            raise GitHubRateLimitError(
                "GitHub API rate limit exceeded.", reset_at=rate_reset
            )

        if resp.status_code == 404:
            raise GitHubError("GitHub resource not found.", status=404)

        if resp.status_code >= 400:
            raise GitHubError(
                f"GitHub API error {resp.status_code}: {resp.text[:200]}",
                status=resp.status_code,
            )

        try:
            data = resp.json()
        except ValueError:
            data = None

        return GitHubResponse(
            status=resp.status_code, data=data,
            etag=resp.headers.get("ETag"),
            last_modified=resp.headers.get("Last-Modified"),
            rate_remaining=rate_remaining, rate_reset=rate_reset,
            headers=dict(resp.headers),
        )


def _int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
