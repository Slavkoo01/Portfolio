"""3D model domain: Model, ModelCategory, ModelAsset, ModelAnimation."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Float,
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Index,
    UniqueConstraint,
    BigInteger,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin
from app.models.enums import AssetType, check_in
from app.models.software import model_software

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.software import Software


class ModelCategory(Base, TimestampMixin):
    __tablename__ = "model_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    models: Mapped[list["Model"]] = relationship(back_populates="category")

    def __repr__(self) -> str:
        return f"<ModelCategory id={self.id} name={self.name!r}>"


class Model(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "models"
    __table_args__ = (
        CheckConstraint("polygon_count >= 0", name="ck_models_polycount"),
        CheckConstraint("vertex_count >= 0", name="ck_models_vertcount"),
        # Hot public query: published & not soft-deleted.
        Index(
            "ix_models_public",
            "is_published",
            postgresql_where="deleted_at IS NULL",
        ),
        Index(
            "ix_models_featured",
            "is_featured",
            postgresql_where="is_published AND deleted_at IS NULL",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_categories.id", ondelete="SET NULL"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    polygon_count: Mapped[int | None] = mapped_column(Integer)
    vertex_count: Mapped[int | None] = mapped_column(Integer)

    # --- display transform (how the model is posed in the 3D viewer) ---
    # position (world units), rotation (degrees), scale (multiplier).
    position_x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    position_z: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rotation_x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rotation_y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rotation_z: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    scale_x: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    scale_y: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    scale_z: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # --- showroom metadata ---
    tags: Mapped[str | None] = mapped_column(Text)                 # comma-separated
    is_rigged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    texture_info: Mapped[str | None] = mapped_column(String(120))  # e.g. "4K PBR"

    # --- relationships ---
    owner: Mapped["User"] = relationship(back_populates="models")
    category: Mapped["ModelCategory | None"] = relationship(back_populates="models")
    assets: Mapped[list["ModelAsset"]] = relationship(
        back_populates="model", cascade="all, delete-orphan"
    )
    animations: Mapped[list["ModelAnimation"]] = relationship(
        back_populates="model", cascade="all, delete-orphan"
    )
    software: Mapped[list["Software"]] = relationship(
        secondary=model_software, back_populates="models"
    )

    def __repr__(self) -> str:
        return f"<Model id={self.id} slug={self.slug!r}>"


class ModelAsset(Base, TimestampMixin):
    """A physical file belonging to a model. DB stores metadata + storage_key only."""

    __tablename__ = "model_assets"
    __table_args__ = (
        CheckConstraint(check_in("asset_type", AssetType.ALL), name="ck_asset_type"),
        CheckConstraint("file_size >= 0", name="ck_asset_filesize"),
        Index("ix_model_assets_model_type", "model_id", "asset_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    model_id: Mapped[int] = mapped_column(
        ForeignKey("models.id", ondelete="CASCADE"), nullable=False
    )

    asset_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # e.g. "models/mech-warrior/mech.glb" — resolved to a URL by StorageService.
    storage_key: Mapped[str] = mapped_column(String(1024), unique=True, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(160))
    file_size: Mapped[int | None] = mapped_column(BigInteger)

    model: Mapped["Model"] = relationship(back_populates="assets")
    animations: Mapped[list["ModelAnimation"]] = relationship(back_populates="asset")

    def __repr__(self) -> str:
        return f"<ModelAsset id={self.id} type={self.asset_type} key={self.storage_key!r}>"


class ModelAnimation(Base, TimestampMixin):
    """
    A named animation clip for a model.

    Separate from model_assets on purpose: a single .glb can embed several clips
    (many animations -> one MODEL asset), or a clip can be its own file
    (one animation -> one ANIMATION asset). asset_id is therefore nullable.
    """

    __tablename__ = "model_animations"
    __table_args__ = (
        UniqueConstraint("model_id", "name", name="uq_animation_model_name"),
        CheckConstraint("fps >= 0", name="ck_animation_fps"),
        CheckConstraint("duration >= 0", name="ck_animation_duration"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    model_id: Mapped[int] = mapped_column(
        ForeignKey("models.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_assets.id", ondelete="SET NULL"), nullable=True
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    duration: Mapped[float | None] = mapped_column(Numeric(6, 2))
    fps: Mapped[int | None] = mapped_column(SmallInteger)
    loop: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    model: Mapped["Model"] = relationship(back_populates="animations")
    asset: Mapped["ModelAsset | None"] = relationship(back_populates="animations")

    def __repr__(self) -> str:
        return f"<ModelAnimation id={self.id} name={self.name!r}>"
