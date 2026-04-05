"""Add customers and task owner fields.

Revision ID: 20260405_0004
Revises: 20260404_0003
Create Date: 2026-04-05
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260405_0004"
down_revision = "20260404_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.add_column("support_cases", sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("tasks", sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("tasks", sa.Column("assigned_member", sa.String(length=100), nullable=True))

    op.create_foreign_key(
        "fk_support_cases_customer_id_customers",
        "support_cases",
        "customers",
        ["customer_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_tasks_customer_id_customers",
        "tasks",
        "customers",
        ["customer_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_customer_id_customers", "tasks", type_="foreignkey")
    op.drop_constraint("fk_support_cases_customer_id_customers", "support_cases", type_="foreignkey")
    op.drop_column("tasks", "assigned_member")
    op.drop_column("tasks", "customer_id")
    op.drop_column("support_cases", "customer_id")
    op.drop_table("customers")
