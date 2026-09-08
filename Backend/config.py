"""
Application configuration.

Everything comes from environment variables (loaded from .env in development).
Never hardcode secrets here. Config classes are selected by FLASK_ENV.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend root (the directory that contains this file).
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class BaseConfig:
    # --- Core ---
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-change-me")

    # --- Database ---
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/portfolio_dev",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # --- CORS ---
    # Comma-separated list of allowed origins for the React frontend.
    CORS_ORIGINS = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]

    # --- Session cookie / security ---
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = _bool("SESSION_COOKIE_SECURE", False)
    # Name of the non-HttpOnly CSRF cookie the frontend reads and echoes back.
    CSRF_COOKIE_NAME = "csrf_token"
    CSRF_HEADER_NAME = "X-CSRF-Token"
    # How long a login session cookie stays valid.
    from datetime import timedelta as _timedelta
    PERMANENT_SESSION_LIFETIME = _timedelta(days=7)

    # --- Storage ---
    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
    STORAGE_LOCAL_ROOT = os.getenv("STORAGE_LOCAL_ROOT", "storage")
    MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "100"))
    # Flask uses this to reject oversized request bodies outright.
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "100")) * 1024 * 1024

    # --- GitHub ---
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
    GITHUB_API_BASE = "https://api.github.com"
    GITHUB_MAX_CONTENT_KB = int(os.getenv("GITHUB_MAX_CONTENT_KB", "512"))

    # --- Contact form rate limiting ---
    CONTACT_RATE_LIMIT = int(os.getenv("CONTACT_RATE_LIMIT", "5"))
    CONTACT_RATE_WINDOW = int(os.getenv("CONTACT_RATE_WINDOW", "3600"))

    # --- Analytics view tracking rate limiting ---
    VIEW_RATE_LIMIT = int(os.getenv("VIEW_RATE_LIMIT", "120"))
    VIEW_RATE_WINDOW = int(os.getenv("VIEW_RATE_WINDOW", "60"))

    # --- Cloudflare R2 object storage (used when STORAGE_BACKEND=r2) ---
    R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET = os.getenv("R2_BUCKET", "")
    R2_PUBLIC_BASE_URL = os.getenv("R2_PUBLIC_BASE_URL", "")

    TESTING = False
    DEBUG = False


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    # Tests use a separate database. Override with TEST_DATABASE_URL if set.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/portfolio_test",
    )
    # Disable secure cookies so the test client works over http.
    SESSION_COOKIE_SECURE = False


class ProductionConfig(BaseConfig):
    DEBUG = False
    # Force-secure cookies in production; HTTPS is assumed.
    SESSION_COOKIE_SECURE = True
    # Frontend and backend live on DIFFERENT domains (Cloudflare Pages vs
    # Render), so cookies must be SameSite=None to cross sites. None REQUIRES
    # Secure=True (already set above). Override via COOKIE_SAMESITE if needed.
    SESSION_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "None")


_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str | None = None) -> type[BaseConfig]:
    name = (name or os.getenv("FLASK_ENV", "development")).strip().lower()
    return _CONFIG_MAP.get(name, DevelopmentConfig)
