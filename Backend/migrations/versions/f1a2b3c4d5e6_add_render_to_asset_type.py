"""add RENDER to ck_asset_type constraint

Revision ID: f1a2b3c4d5e6
Revises: dd4525231a4f
Create Date: 2026-09-10

The AssetType enum in code gained RENDER, but the DB check constraint still
only allowed MODEL, TEXTURE, THUMBNAIL, ANIMATION, OTHER. Postgres can't ALTER
a check constraint in place, so we drop and recreate it with RENDER included.
"""
from alembic import op

revision = "f1a2b3c4d5e6"
down_revision = "dd4525231a4f"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("ck_asset_type", "model_assets", type_="check")
    op.create_check_constraint(
        "ck_asset_type",
        "model_assets",
        "asset_type IN ('MODEL', 'TEXTURE', 'THUMBNAIL', 'RENDER', 'ANIMATION', 'OTHER')",
    )


def downgrade():
    op.drop_constraint("ck_asset_type", "model_assets", type_="check")
    op.create_check_constraint(
        "ck_asset_type",
        "model_assets",
        "asset_type IN ('MODEL', 'TEXTURE', 'THUMBNAIL', 'ANIMATION', 'OTHER')",
    )
