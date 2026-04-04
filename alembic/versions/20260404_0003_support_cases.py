"""Add support cases and link records to cases."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260404_0003"
down_revision = "20260404_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "support_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("issue_category", sa.String(length=100), nullable=True),
        sa.Column("assigned_team", sa.String(length=100), nullable=True),
        sa.Column("severity", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.add_column("tasks", sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("events", sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("notes", sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("workflow_runs", sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True))

    op.create_foreign_key("fk_tasks_case_id", "tasks", "support_cases", ["case_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_events_case_id", "events", "support_cases", ["case_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_notes_case_id", "notes", "support_cases", ["case_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key(
        "fk_workflow_runs_case_id", "workflow_runs", "support_cases", ["case_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_workflow_runs_case_id", "workflow_runs", type_="foreignkey")
    op.drop_constraint("fk_notes_case_id", "notes", type_="foreignkey")
    op.drop_constraint("fk_events_case_id", "events", type_="foreignkey")
    op.drop_constraint("fk_tasks_case_id", "tasks", type_="foreignkey")

    op.drop_column("workflow_runs", "case_id")
    op.drop_column("notes", "case_id")
    op.drop_column("events", "case_id")
    op.drop_column("tasks", "case_id")
    op.drop_table("support_cases")
