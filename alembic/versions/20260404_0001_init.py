"""Initial TicketFlow schema."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260404_0001"
down_revision = None
branch_labels = None
depends_on = None


task_priority = postgresql.ENUM("low", "medium", "high", name="task_priority", create_type=False)
task_status = postgresql.ENUM("open", "completed", name="task_status", create_type=False)
event_status = postgresql.ENUM("scheduled", "cancelled", name="event_status", create_type=False)
workflow_status = postgresql.ENUM("running", "completed", "failed", name="workflow_status", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    task_priority.create(bind, checkfirst=True)
    task_status.create(bind, checkfirst=True)
    event_status.create(bind, checkfirst=True)
    workflow_status.create(bind, checkfirst=True)

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", task_priority, nullable=False),
        sa.Column("status", task_status, nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", event_status, nullable=False),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "workflow_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("request_text", sa.Text(), nullable=False),
        sa.Column("status", workflow_status, nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("steps_json", sa.JSON(), nullable=False),
        sa.Column("artifacts_json", sa.JSON(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("workflow_runs")
    op.drop_table("notes")
    op.drop_table("events")
    op.drop_table("tasks")

    bind = op.get_bind()
    workflow_status.drop(bind, checkfirst=True)
    event_status.drop(bind, checkfirst=True)
    task_status.drop(bind, checkfirst=True)
    task_priority.drop(bind, checkfirst=True)
