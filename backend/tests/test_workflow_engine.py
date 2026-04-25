import os
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://ticketflow:ticketflow@localhost:5432/ticketflow")
os.environ.setdefault("MCP_SERVER_URL", "http://localhost:8001/mcp")

from app.services.workflow_engine import WorkflowEngine


def make_engine() -> WorkflowEngine:
    return WorkflowEngine(
        SimpleNamespace(
            mcp_server_url="http://localhost:8001/mcp",
            google_api_key=None,
            google_genai_use_vertexai=False,
            enable_heuristic_fallback=True,
            gemini_model="gemini-2.0-flash",
            app_name="ticketflow-agent",
        )
    )


def test_classify_issue_detects_enterprise_outage_severity() -> None:
    engine = make_engine()

    triage = engine._classify_issue(
        "Enterprise renewal risk: production outage in webhook sync and the customer is blocked."
    )

    assert triage["issue_category"] == "Integrations"
    assert triage["assigned_team"] == "Platform Engineering"
    assert triage["severity"] == "high"


def test_extract_customer_details_from_demo_transcript() -> None:
    engine = make_engine()

    details = engine._extract_customer_details(
        "Customer: This is Priya Shah. Email priya.shah@atlascloud.com, phone +1 212 555 0184."
    )

    assert details == {
        "name": "Priya Shah",
        "email": "priya.shah@atlascloud.com",
        "phone": "+1 212 555 0184",
    }


def test_extract_follow_up_tasks_splits_multiple_actions() -> None:
    engine = make_engine()

    tasks = engine._extract_follow_up_tasks(
        "Customer: Please create follow-up for engineering to inspect webhook failures, "
        "send an executive status update, confirm the renewal-risk owner, and schedule a 30 minute call tomorrow at 10 AM."
    )

    assert len(tasks) >= 3
    assert any("send an executive status update" in task for task in tasks)
    assert any("confirm the renewal-risk owner" in task for task in tasks)
    assert any("schedule a 30 minute call" in task for task in tasks)
