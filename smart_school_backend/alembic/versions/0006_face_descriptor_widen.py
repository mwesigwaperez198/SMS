"""widen face_descriptor to 5000

Revision ID: 0006_face_descriptor_widen
Revises: 0005_lockout_fields
Create Date: 2026-07-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_face_descriptor_widen"
down_revision = "0005_lockout_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "face_descriptor",
        existing_type=sa.String(2000),
        type_=sa.String(5000),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "face_descriptor",
        existing_type=sa.String(5000),
        type_=sa.String(2000),
        existing_nullable=True,
    )
