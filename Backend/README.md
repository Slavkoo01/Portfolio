# Portfolio Backend — Phase 3

Flask + SQLAlchemy 2.x + PostgreSQL backend for a 3D-artist / software-developer
portfolio. This drop contains the foundation: config, application factory,
ORM models, and the initial Alembic migration. Auth, CRUD, storage, GitHub sync,
contact, dashboard, tests and seed data come in later phases.

## What's in this phase

- `config.py` — env-driven Dev/Test/Prod config
- `app/extensions.py` — db + migrate instances
- `app/models/` — all 15 tables (SQLAlchemy 2.x typed models)
- `app/errors/` — typed exceptions + JSON error handlers
- `app/__init__.py` — `create_app()` application factory
- `app/routes/__init__.py` — health check only for now (`GET /api/health`)
- `migrations/` — initial migration (validated: applies, reverses, no drift)

## First-time setup (Windows / PowerShell)

1. Create and activate a virtualenv, then install deps:

       python -m venv venv
       .\venv\Scripts\Activate.ps1
       pip install -r requirements.txt

2. Create your local database in pgAdmin (or psql):

       CREATE DATABASE portfolio_dev;

3. Copy the env template and fill in your real values:

       copy .env.example .env
       # then edit .env — set DATABASE_URL password and a strong SECRET_KEY

4. Apply the migration (this also enables the `citext` extension automatically):

       $env:FLASK_APP = "run.py"
       flask db upgrade

5. Run the dev server and check it's alive:

       python run.py
       # open http://127.0.0.1:5000/api/health  -> {"status": "ok"}

## Migration workflow (for later phases)

- Generate a new migration after model changes:  `flask db migrate -m "message"`
- Apply migrations:                              `flask db upgrade`
- Roll back one step:                            `flask db downgrade -1`
- Reset local DB to empty:                       `flask db downgrade base`

Always review the generated migration before upgrading — autogenerate is a
starting point, not gospel (e.g. the `citext` extension line was added by hand
in the initial migration).

## Architecture notes

- Models hold persistence only. Query logic goes in `repositories/`,
  business logic in `services/`, HTTP glue in `routes/`, validation/serialization
  in `schemas/`. These layers are scaffolded and get filled in the next phases.
- File binaries are NOT stored in Postgres — only a `storage_key` string.
  GitHub source text IS cached in Postgres (`github_files.content`); binaries
  keep a `download_url` instead.
- "Enum" columns are VARCHAR + CHECK (see `app/models/enums.py`), chosen over
  native PG enums for painless Alembic migrations.

---

# Phase 4 — Authentication & Authorization

Session-cookie auth (not JWT), Argon2 password hashing, CSRF protection, and
role-based route guards.

## New pieces

- `app/services/security.py`     — Argon2id hash/verify
- `app/services/auth_service.py` — credential verification, last-login, rehash
- `app/services/user_service.py` — admin/user creation
- `app/auth/session.py`          — session login/logout, load current user
- `app/auth/csrf.py`             — double-submit CSRF token
- `app/auth/decorators.py`       — @login_required, @admin_required
- `app/repositories/`            — base + user repositories (only layer using db.session)
- `app/schemas/auth.py`          — login validation + safe user output
- `app/routes/auth.py`           — /api/auth/login|logout|me|csrf
- `app/cli.py`                   — `flask create-admin`

## Create your admin user

    $env:FLASK_APP = "run.py"
    flask create-admin
    # prompts for username, email, and password (hidden, entered twice)

## Auth endpoints

- `POST /api/auth/login`   body: {"identifier": "<username-or-email>", "password": "..."}
                           -> sets session + csrf_token cookies, returns user
- `POST /api/auth/logout`  (requires login + X-CSRF-Token header)
- `GET  /api/auth/me`      -> {"user": {...}} or {"user": null}
- `GET  /api/auth/csrf`    -> sets csrf_token cookie (frontend calls on load)

## How the frontend (React, later) will use this

1. On app load, call `GET /api/auth/csrf` (sets the readable csrf_token cookie)
   and `GET /api/auth/me` (to know if already logged in).
2. To log in: `POST /api/auth/login`. The browser stores the session cookie.
3. For every POST/PUT/PATCH/DELETE: read the `csrf_token` cookie value and send
   it as the `X-CSRF-Token` header. GET requests need no CSRF.
4. Use `credentials: 'include'` on fetch so cookies are sent cross-origin
   (localhost:5173 -> localhost:5000).

## Testing (validated in this drop)

- login with wrong password -> 401 INVALID_CREDENTIALS (no username enumeration)
- login correct -> 200, session + csrf cookies, no password_hash in response
- /me reflects login state
- state-changing request without CSRF header -> 403 CSRF_MISSING
- non-admin hitting an @admin_required route -> 403 FORBIDDEN

---

# Phase 5 — Model & Project CRUD

Full create/read/update/delete for models and projects, with slug generation,
publish/draft filtering, soft delete, and pagination.

## New pieces

- `app/utils/slug.py`                    — slugify + unique-slug generation
- `app/repositories/model_repository.py` — Model + ModelCategory queries
- `app/repositories/project_repository.py`
- `app/services/model_service.py`        — model business logic
- `app/services/project_service.py`
- `app/schemas/model.py` / `project.py` / `common.py`
- `app/routes/public.py`                 — public read-only endpoints
- `app/routes/admin/models.py` / `projects.py`

## Public endpoints (no auth, published + non-deleted only)

    GET /api/models?page=1&per_page=20&category=<slug>&featured=true
    GET /api/models/categories
    GET /api/models/<slug>
    GET /api/projects?page=1&per_page=20&featured=true
    GET /api/projects/<slug>

## Admin endpoints (ADMIN + CSRF, see drafts)

    GET    /api/admin/models
    GET    /api/admin/models/<id>
    POST   /api/admin/models
    PUT    /api/admin/models/<id>
    DELETE /api/admin/models/<id>     (soft delete)
    (same shape for /api/admin/projects)

## Create-model body (POST /api/admin/models)

    {
      "title": "Mech Warrior",       // required; slug auto-generated if omitted
      "slug": "mech-warrior",        // optional, must be lowercase-hyphenated
      "description": "...",
      "category_id": 1,               // optional, must exist
      "is_featured": false,
      "is_published": false,          // draft by default
      "polygon_count": 45678,
      "vertex_count": 23456
    }

## Behaviour verified in this drop

- draft models/projects are hidden from public list + detail (404), visible to admin
- publishing makes them appear publicly
- duplicate title auto-dedupes slug (mech-warrior -> mech-warrior-2)
- explicit duplicate slug -> 422 SLUG_TAKEN
- invalid slug format -> 422
- soft delete removes from both public and admin listings
- unauthenticated admin write -> 401

## Note on transform columns

The 3D viewer transform fields (position/rotation/scale) you added to the Model
table are NOT yet in the update schema. They'll be wired into ModelUpdateSchema
when we build the asset upload / edit flow (Phase 6) so the admin "Edit 3D Model"
panel can write them.

---

# Phase 6 — File Storage & 3D Asset Uploads

Local filesystem storage behind a provider-independent abstraction, with
validated uploads. Swappable to Cloudflare R2 / S3 later via config only.

## New pieces

- `app/services/storage/base.py`    — StorageService interface (save/delete/exists/get_url)
- `app/services/storage/local.py`   — LocalStorageService (writes to backend/storage/)
- `app/services/storage/factory.py` — picks backend from STORAGE_BACKEND
- `app/services/file_validation.py` — extension + size + magic-byte checks
- `app/repositories/asset_repository.py`
- `app/services/asset_service.py`   — ties validation + storage + DB together
- `app/schemas/asset.py`            — asset output with resolved url
- `app/routes/files.py`             — serves local files at /files/<key>
- `app/routes/admin/assets.py`      — upload/list/delete endpoints

## Endpoints

    GET    /api/admin/models/<model_id>/assets
    POST   /api/admin/models/<model_id>/assets      (multipart/form-data)
    DELETE /api/admin/models/<model_id>/assets/<asset_id>
    GET    /files/<storage_key>                      (local file serving)

## Uploading (multipart, NOT json)

POST /api/admin/models/<id>/assets with form-data fields:
  - `file`       : the binary file
  - `asset_type` : MODEL | TEXTURE | THUMBNAIL | ANIMATION | OTHER

## How files are stored

- DB stores only a `storage_key` string, e.g.
      models/mech-warrior/thumbnail/preview.png
- The actual bytes go to `backend/storage/<storage_key>` locally.
- `get_url()` turns the key into a fetchable URL (`/files/...` locally,
  a CDN URL on R2 later). The key never changes — only the backend does.

## Validation (never trusts the client)

- asset_type must be valid
- extension must be allowed for that asset_type
- size within MAX_UPLOAD_MB
- magic-byte sniff catches spoofed extensions (e.g. text renamed .png -> rejected)
- storage keys are traversal-safe (../ escapes blocked)

## Verified in this drop

- valid PNG uploads, lands on disk, served via /files, appears in model GET
- spoofed extension -> 422 CONTENT_MISMATCH
- disallowed extension (.exe) -> 422 INVALID_EXTENSION
- invalid asset_type -> 422
- upload without auth -> 401
- delete removes the file from disk
- path traversal blocked

## Switching to R2 later (no code changes to callers)

1. Implement `R2StorageService(StorageService)` (S3 API via boto3).
2. Uncomment the r2 branch in `storage/factory.py`.
3. Set STORAGE_BACKEND=r2 and R2_* env vars.
Business logic and routes stay identical because they only use the interface.

---

# Phase 7 — GitHub Integration & Caching

Displays your repositories (metadata, README, file tree, source) from a Postgres
cache. Public visits NEVER call GitHub — only admin-triggered sync does.

## Architecture

    Visitor -> Flask -> Postgres cache            (never GitHub)
    Admin sync -> Flask -> GitHub API -> Postgres cache

## New pieces

- `app/services/github/client.py`  — GitHub API wrapper (token, ETag, rate limit)
- `app/services/github/service.py` — sync logic (metadata, tree, files, README)
- `app/services/github/read.py`    — public cache reads + nested tree builder
- `app/services/github/link.py`    — link a project to a cache row (no GitHub call)
- `app/repositories/github_repository.py`
- `app/schemas/github.py`
- `app/routes/admin/github.py`     — admin sync endpoints
- public github endpoints added to `app/routes/public.py`

## Public endpoints (cache-only, no auth)

    GET /api/projects/<slug>/repository
    GET /api/projects/<slug>/repository/tree
    GET /api/projects/<slug>/repository/file/<path>

## Admin endpoints (ADMIN + CSRF — the ONLY GitHub-calling endpoints)

    POST /api/admin/projects/<project_id>/github/link
    POST /api/admin/github/sync
    POST /api/admin/github/repositories/<repo_id>/sync
    GET  /api/admin/github/repositories

## Workflow

1. Create a project with github_owner + github_repo set.
2. POST .../github/link  -> creates the cache row.
3. POST .../sync         -> pulls metadata, tree, README, small text files.
4. Public endpoints now serve everything from Postgres.

## Caching behaviour

- ETag stored on github_repositories; next sync sends If-None-Match.
- 304 Not Modified -> status NOT_MODIFIED, no further work (saves rate limit).
- Rate limit (403 + remaining 0) -> status RATE_LIMITED, recorded, no crash.
- Text files (code, md, svg, ...) under GITHUB_MAX_CONTENT_KB stored inline.
- Binary files (png, etc.) store NULL content + a raw.githubusercontent download_url.
- github_syncs is an append-only audit log (status/timing/errors/requests_made).

## Needs a GitHub token

Set GITHUB_TOKEN in .env (a fine-grained or classic PAT with public repo read).
Without a token, sync still works for public repos but with a much lower rate limit.

## Future: background worker

sync_repository(repo) is HTTP-agnostic. To move to Celery/RQ later, the admin
route enqueues instead of calling directly — the sync logic stays identical.

---

# Phase 8 — Contact Messages

Public contact form (no account needed) + admin management, with anti-spam
rate limiting.

## New pieces

- `app/repositories/contact_repository.py`
- `app/services/contact_service.py`   — submit + admin list/read/status/delete
- `app/services/rate_limit.py`        — in-memory per-IP rate limiter
- `app/utils/hashing.py`              — pseudonymous IP hashing (no raw IPs)
- `app/schemas/contact.py`            — validation (incl. email) + output
- `app/routes/contact.py`             — public POST /api/contact
- `app/routes/admin/messages.py`      — admin endpoints

## Endpoints

Public (no auth, rate-limited):
    POST /api/contact   { name, email, subject?, message }

Admin (ADMIN + CSRF):
    GET    /api/admin/messages?status=UNREAD&page=1
    GET    /api/admin/messages/<id>        (auto marks UNREAD -> READ)
    PATCH  /api/admin/messages/<id>        { status }
    DELETE /api/admin/messages/<id>        (hard delete)

## Behaviour

- guests submit without an account; CSRF not required on the public form
- email validated server-side; name/message required
- rate limited (default 5/hour per IP hash) -> 429 when exceeded
- opening a message auto-transitions UNREAD -> READ (sets read_at)
- status transitions set read_at / replied_at timestamps
- ARCHIVED is the soft-delete status; DELETE hard-deletes
- guests cannot access /api/admin/messages -> 401

## Config (.env)

    CONTACT_RATE_LIMIT=5      # messages allowed per window
    CONTACT_RATE_WINDOW=3600  # window in seconds

## Note on the rate limiter

In-memory, per-process — resets on restart and isn't shared across multiple
workers. Fine for a single-process personal portfolio. If you deploy with
multiple workers, swap in a Redis-backed limiter (Flask-Limiter); the call
site stays the same.

---

# Phase 9 — Dashboard & Analytics

Single admin dashboard endpoint aggregating counts, views, recent items, and
GitHub status; plus lightweight pseudonymous page-view tracking.

## New pieces

- `app/repositories/analytics_repository.py`
- `app/services/analytics_service.py`   — record views, simple counts
- `app/services/dashboard_service.py`   — aggregates everything for the dashboard
- `app/routes/admin/dashboard.py`       — GET /api/admin/dashboard
- `app/routes/analytics.py`             — POST /api/analytics/view

## Endpoints

Public (no auth, rate-limited, best-effort):
    POST /api/analytics/view   { path }

Admin (ADMIN + CSRF):
    GET /api/admin/dashboard

## Dashboard response shape

    {
      "counts":  { models, models_published, projects, projects_published,
                   messages, messages_unread },
      "views":   { total, last_7_days, last_30_days, unique_30_days },
      "recent":  { models[], projects[], messages[] },   // 5 each
      "github":  { repositories, last_sync }
    }

## Analytics design (intentionally minimal)

- stores only a pseudonymous visitor hash (IP+secret hashed), never raw IP
- recording is best-effort: a tracking failure returns ok:false, never errors
- rate-limited (default 120/min per IP hash)
- no rollup tables — simple time-window counts are enough for a portfolio
- the frontend calls POST /api/analytics/view on navigation

## Config (.env)

    VIEW_RATE_LIMIT=120   # view pings allowed per window per IP
    VIEW_RATE_WINDOW=60   # window in seconds
