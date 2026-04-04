"""Add triage fields to tasks."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260404_0002"
down_revision = "20260404_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("issue_category", sa.String(length=100), nullable=True))
    op.add_column("tasks", sa.Column("assigned_team", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "assigned_team")
    op.drop_column("tasks", "issue_category")
