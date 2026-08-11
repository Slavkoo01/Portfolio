"""
Flask extension instances.

They are created here (unbound) and initialised inside the application factory
via init_app(). This avoids circular imports and lets tests build isolated apps.
"""
from __future__ import annotations

from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from app.models.base import Base

# Bind Flask-SQLAlchemy to our declarative Base so models and migrations share
# the same metadata.
db = SQLAlchemy(model_class=Base)
migrate = Migrate()
