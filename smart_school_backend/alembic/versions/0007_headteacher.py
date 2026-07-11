"""headteacher role and leave_requests table

Revision ID: 0007_headteacher
Revises: 0006_face_descriptor_widen
Create Date: 2026-07-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_headteacher"
down_revision = "0006_face_descriptor_widen"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leave_requests",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("school_id", sa.Integer, sa.ForeignKey("schools.id"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("decided_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Seed headteacher role (id=10) — safe upsert via raw SQL
    op.execute(
        """
        INSERT INTO roles (id, name, description)
        VALUES (10, 'headteacher', 'Head teacher who oversees academic staff, approves leave, and monitors school-wide performance.')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
        """
    )


def downgrade() -> None:
    op.drop_table("leave_requests")
    op.execute("DELETE FROM roles WHERE id = 10")
