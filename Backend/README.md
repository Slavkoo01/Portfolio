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
