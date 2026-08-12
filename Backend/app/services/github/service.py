"""
GitHub synchronisation service.

Public reads NEVER hit GitHub — they read the Postgres cache. This service is the
ONLY place that calls GitHub, and only via admin-triggered sync.

sync_repository(repo) is a plain method that takes a GithubRepository row and
returns a result. It has no dependency on Flask request/response, so it can later
be moved into a Celery/RQ task unchanged (the route would enqueue instead of call).
"""
from __future__ import annotations

import base64
from datetime import datetime, timezone

from flask import current_app

from app.extensions import db
from app.models.enums import SyncStatus
from app.models.github import GithubRepository, GithubFile, GithubSync
from app.repositories.github_repository import (
    GithubRepoRepository, GithubFileRepository, GithubSyncRepository,
)
from app.services.github.client import (
    GitHubClient, GitHubError, GitHubRateLimitError,
)

# Extensions whose content we store inline as text (SVG counts — it's XML).
TEXT_EXTENSIONS = {
    ".md", ".txt", ".rst", ".py", ".js", ".jsx", ".ts", ".tsx", ".json",
    ".css", ".scss", ".html", ".xml", ".svg", ".yml", ".yaml", ".toml",
    ".ini", ".cfg", ".c", ".h", ".cpp", ".hpp", ".cc", ".cs", ".java",
    ".go", ".rs", ".rb", ".php", ".sh", ".bat", ".sql", ".lua", ".kt",
    ".swift", ".gitignore", ".env.example", ".dockerignore", "Dockerfile",
}


def _now():
    return datetime.now(timezone.utc)


def _is_text(name: str) -> bool:
    lower = name.lower()
    if lower in {"dockerfile", "makefile", "license", "readme"}:
        return True
    dot = lower.rfind(".")
    ext = lower[dot:] if dot != -1 else ""
    return ext in TEXT_EXTENSIONS


class GitHubService:
    def __init__(self):
        self.repos = GithubRepoRepository()
        self.files = GithubFileRepository()
        self.syncs = GithubSyncRepository()

    # ---------- entry points ----------
    def sync_all(self) -> list[dict]:
        results = []
        for repo in self.repos.list_all():
            results.append(self.sync_repository(repo))
        return results

    def sync_repository(self, repo: GithubRepository) -> dict:
        """Sync one repo. Records a GithubSync audit row. Never raises for
        expected conditions (304, rate limit) — captures them as status."""
        sync = GithubSync(
            repository_id=repo.id, status=SyncStatus.RUNNING, started_at=_now(),
            requests_made=0,
        )
        self.syncs.add(sync)
        self.syncs.commit()

        client = GitHubClient()
        try:
            self._sync_metadata(client, repo, sync)
            # If metadata was 304 (unchanged), we still refresh files opportunistically
            # only when we have no files cached yet.
            existing_files = self.files.list_for_repo(repo.id)
            if sync.status != SyncStatus.NOT_MODIFIED or not existing_files:
                self._sync_tree(client, repo, sync)
                self._sync_readme(client, repo, sync)

            if sync.status == SyncStatus.RUNNING:
                sync.status = SyncStatus.SUCCESS
            sync.last_success_at = _now()
            repo.synced_at = _now()

        except GitHubRateLimitError as e:
            sync.status = SyncStatus.RATE_LIMITED
            sync.error_message = f"Rate limited. Resets at {e.reset_at}."
        except GitHubError as e:
            sync.status = SyncStatus.FAILED
            sync.error_message = str(e)[:1000]
        except Exception as e:  # noqa: BLE001
            sync.status = SyncStatus.FAILED
            sync.error_message = f"Unexpected: {e}"[:1000]
        finally:
            sync.finished_at = _now()
            db.session.commit()

        return {
            "repository_id": repo.id,
            "full_name": repo.full_name,
            "status": sync.status,
            "requests_made": sync.requests_made,
            "error": sync.error_message,
        }

    # ---------- steps ----------
    def _sync_metadata(self, client: GitHubClient, repo: GithubRepository,
                       sync: GithubSync) -> None:
        resp = client.get(f"repos/{repo.owner}/{repo.name}",
                          etag=repo.etag, last_modified=repo.last_modified)
        sync.requests_made += 1

        if resp.not_modified:
            sync.status = SyncStatus.NOT_MODIFIED
            return

        d = resp.data or {}
        repo.github_id = d.get("id")
        repo.full_name = d.get("full_name")
        repo.description = d.get("description")
        repo.html_url = d.get("html_url")
        repo.default_branch = d.get("default_branch")
        repo.language = d.get("language")
        repo.stars = d.get("stargazers_count", 0)
        repo.forks = d.get("forks_count", 0)
        repo.open_issues = d.get("open_issues_count", 0)
        repo.github_created_at = _parse_dt(d.get("created_at"))
        repo.github_updated_at = _parse_dt(d.get("updated_at"))
        # Store validators for next conditional request.
        repo.etag = resp.etag or repo.etag
        repo.last_modified = resp.last_modified or repo.last_modified

    def _sync_tree(self, client: GitHubClient, repo: GithubRepository,
                   sync: GithubSync) -> None:
        branch = repo.default_branch or "main"
        # Recursive tree in one request.
        resp = client.get(
            f"repos/{repo.owner}/{repo.name}/git/trees/{branch}",
            params={"recursive": "1"},
        )
        sync.requests_made += 1
        tree = (resp.data or {}).get("tree", [])

        # Rebuild the cached tree from scratch (simple + reliable for few repos).
        self.files.delete_all_for_repo(repo.id)
        db.session.flush()

        max_kb = current_app.config["GITHUB_MAX_CONTENT_KB"]
        # First pass: create all rows (dirs + files) keyed by path.
        path_to_row: dict[str, GithubFile] = {}
        for entry in tree:
            etype = "dir" if entry["type"] == "tree" else "file"
            name = entry["path"].split("/")[-1]
            row = GithubFile(
                repository_id=repo.id, name=name, path=entry["path"],
                type=etype, size=entry.get("size"), sha=entry.get("sha"),
                synced_at=_now(),
            )
            db.session.add(row)
            path_to_row[entry["path"]] = row
        db.session.flush()

        # Second pass: wire parent_id + fetch text content for small text files.
        for path, row in path_to_row.items():
            if "/" in path:
                parent_path = path.rsplit("/", 1)[0]
                parent = path_to_row.get(parent_path)
                if parent:
                    row.parent_id = parent.id

            if row.type == "file":
                row.download_url = (
                    f"https://raw.githubusercontent.com/"
                    f"{repo.owner}/{repo.name}/{branch}/{path}"
                )
                row.html_url = f"{repo.html_url}/blob/{branch}/{path}"
                # Only fetch+store content for small text files.
                if _is_text(row.name) and (row.size or 0) <= max_kb * 1024:
                    self._fetch_file_content(client, repo, row, sync)
        db.session.flush()

    def _fetch_file_content(self, client: GitHubClient, repo: GithubRepository,
                            row: GithubFile, sync: GithubSync) -> None:
        try:
            resp = client.get(f"repos/{repo.owner}/{repo.name}/contents/{row.path}")
            sync.requests_made += 1
            d = resp.data or {}
            if d.get("encoding") == "base64" and d.get("content"):
                raw = base64.b64decode(d["content"])
                try:
                    row.content = raw.decode("utf-8")
                except UnicodeDecodeError:
                    row.content = None  # actually binary; keep download_url only
        except GitHubError:
            row.content = None  # leave download_url as fallback

    def _sync_readme(self, client: GitHubClient, repo: GithubRepository,
                     sync: GithubSync) -> None:
        try:
            resp = client.get(f"repos/{repo.owner}/{repo.name}/readme")
            sync.requests_made += 1
            d = resp.data or {}
            if d.get("encoding") == "base64" and d.get("content"):
                raw = base64.b64decode(d["content"])
                readme_path = d.get("path", "README.md")
                existing = self.files.get_by_path(repo.id, readme_path)
                content = raw.decode("utf-8", errors="replace")
                if existing:
                    existing.content = content
        except GitHubError:
            pass  # no README is fine


def _parse_dt(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
