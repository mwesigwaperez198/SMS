"""finance tables

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cashbook_entries",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=False, index=True),
        sa.Column("date", sa.String(20), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_by", sa.String(120), nullable=False),
        sa.Column("payment_method", sa.String(50), nullable=False),
        sa.Column("receipt_no", sa.String(50), unique=True, nullable=False),
        sa.Column("entry_type", sa.String(20), nullable=False, server_default="Income"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "quotations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=False, index=True),
        sa.Column("quotation_no", sa.String(50), unique=True, nullable=False),
        sa.Column("customer", sa.String(200), nullable=False),
        sa.Column("date", sa.String(20), nullable=False),
        sa.Column("items", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), server_default=""),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="Draft"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "requisitions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=False, index=True),
        sa.Column("req_no", sa.String(50), unique=True, nullable=False),
        sa.Column("department", sa.String(200), nullable=False),
        sa.Column("requested_by", sa.String(120), nullable=False),
        sa.Column("date", sa.String(20), nullable=False),
        sa.Column("items", sa.Text(), nullable=False),
        sa.Column("purpose", sa.Text(), server_default=""),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="Pending"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "bank_accounts",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=False, index=True),
        sa.Column("bank_name", sa.String(200), nullable=False),
        sa.Column("account_name", sa.String(200), nullable=False),
        sa.Column("account_number", sa.String(100), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("bank_accounts")
    op.drop_table("requisitions")
    op.drop_table("quotations")
    op.drop_table("cashbook_entries")
