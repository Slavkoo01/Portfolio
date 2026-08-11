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
