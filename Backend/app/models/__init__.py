"""
Import every model here so that:
  1. Alembic autogenerate sees all tables via Base.metadata.
  2. Relationship string references resolve at mapper-configuration time.

Order matters only enough that all names are importable; SQLAlchemy resolves
relationships lazily, so simple alphabetical-ish grouping is fine.
"""
from app.models.base import Base  # noqa: F401

from app.models.user import User  # noqa: F401
from app.models.profile import Profile  # noqa: F401
from app.models.skill import Skill  # noqa: F401
from app.models.software import Software, model_software  # noqa: F401
from app.models.model import (  # noqa: F401
    Model,
    ModelCategory,
    ModelAsset,
    ModelAnimation,
)
from app.models.project import Project  # noqa: F401
from app.models.github import (  # noqa: F401
    GithubRepository,
    GithubFile,
    GithubSync,
)
from app.models.contact import ContactMessage  # noqa: F401
from app.models.analytics import PageView  # noqa: F401
from app.models.site_stats import SiteStat  # noqa: F401

__all__ = [
    "Base",
    "User",
    "Profile",
    "Skill",
    "Software",
    "model_software",
    "Model",
    "ModelCategory",
    "ModelAsset",
    "ModelAnimation",
    "Project",
    "GithubRepository",
    "GithubFile",
    "GithubSync",
    "ContactMessage",
    "PageView",
]
