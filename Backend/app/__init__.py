"""
Application factory.

create_app() builds and configures a Flask app instance. Keeping construction in
a factory (rather than a module-level global) lets tests spin up isolated apps
and keeps extension binding explicit.
"""
from __future__ import annotations

import logging

from flask import Flask
from flask_cors import CORS

from config import get_config
from app.extensions import db, migrate
from app.errors.handlers import register_error_handlers
from app.routes import register_blueprints


def create_app(config_name: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    _configure_logging(app)

    # --- Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)

    # CORS: allow the React origin(s), and allow credentials so the session
    # cookie is sent on cross-origin (localhost:5173 -> localhost:5000) requests.
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
        expose_headers=[app.config["CSRF_HEADER_NAME"]],
    )

    # Import models so their mappers are registered before first request /
    # before Alembic autogenerate runs.
    from app import models  # noqa: F401

    # --- Errors & routes ---
    register_error_handlers(app)
    register_blueprints(app)

    # --- CLI commands (flask create-admin, etc.) ---
    from app.cli import register_cli
    register_cli(app)

    return app


def _configure_logging(app: Flask) -> None:
    level = logging.DEBUG if app.config.get("DEBUG") else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
