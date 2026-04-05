from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import Client, types
from google.genai.errors import ClientError
from sqlalchemy import desc, or_, select

from ticketflow_shared.models import Customer, Event, Note, SupportCase, Task, WorkflowRun, WorkflowStatus
from ticketflow_shared.schemas import (
    CustomerRead,
    DeleteResponse,
    EventCreate,
    EventRead,
    NoteCreate,
    NoteRead,
    StateResponse,
    SupportCaseDetailResponse,
    SupportCaseRead,
    TaskAssignmentUpdate,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    WorkflowResult,
    WorkflowRunRead,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowStep,
)
from ticketflow_shared.utils import derive_note_title, derive_task_title, parse_relative_schedule

from app.agents.agent import build_root_agent
from app.config import Settings
from app.db import get_session
from app.services.mcp_gateway import MCPGateway

logger = logging.getLogger(__name__)


class WorkflowEngine:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def run(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        with get_session() as session:
            ai_intake = await self._extract_intake_with_ai(request.prompt)
            triage = self._classify_issue(request.prompt)
            customer = self._get_or_create_customer(
                session,
                request.prompt,
                ai_customer=ai_intake.get("customer") if isinstance(ai_intake, dict) else None,
            )
            support_case = self._create_case(session, request.prompt, triage, customer)
            workflow_run = WorkflowRun(
                case_id=support_case.id,
                request_text=request.prompt,
                status=WorkflowStatus.running,
            )
            session.add(workflow_run)
            session.commit()
            session.refresh(workflow_run)

            try:
                result, engine_mode = await self._run_agents(request.prompt, support_case, customer, ai_intake)
                workflow_run.status = WorkflowStatus.completed
                workflow_run.summary = result.summary
                workflow_run.steps_json = [step.model_dump(mode="json") for step in result.steps]
                workflow_run.artifacts_json = {
                    "engine_mode": engine_mode,
                    "case_summary": result.case_summary,
                    "triage": result.triage,
                    "tasks": [task.model_dump(mode="json") for task in result.tasks],
                    "events": [event.model_dump(mode="json") for event in result.events],
                    "notes": [note.model_dump(mode="json") for note in result.notes],
                }
                workflow_run.completed_at = datetime.now(timezone.utc)
                session.commit()
                return WorkflowRunResponse(
                    workflow_run_id=workflow_run.id,
                    status="completed",
                    engine_mode=engine_mode,
                    summary=result.summary,
                    case_summary=result.case_summary,
                    steps=result.steps,
                    triage=result.triage,
                    case=result.case,
                    customer=result.customer,
                    tasks=result.tasks,
                    events=result.events,
                    notes=result.notes,
                    errors=result.errors,
                )
            except Exception as exc:
                workflow_run.status = WorkflowStatus.failed
                workflow_run.error_message = str(exc)
                workflow_run.summary = "Workflow failed before completion."
                workflow_run.completed_at = datetime.now(timezone.utc)
                session.commit()
                return WorkflowRunResponse(
                    workflow_run_id=workflow_run.id,
                    status="failed",
                    engine_mode="heuristic_fallback",
                    summary="The workflow could not be completed.",
                    case_summary=self._derive_case_summary(request.prompt, triage),
                    steps=[],
                    triage={},
                    case=SupportCaseRead.model_validate(support_case),
                    customer=CustomerRead.model_validate(customer) if customer else None,
                    tasks=[],
                    events=[],
                    notes=[],
                    errors=[str(exc)],
                )

    async def _run_agents(
        self,
        prompt: str,
        support_case: SupportCase,
        customer: Customer | None,
        ai_intake: dict[str, object] | None = None,
    ) -> tuple[WorkflowResult, str]:
        gateway = MCPGateway(
            self.settings.mcp_server_url,
            active_case_id=support_case.id,
            active_customer_id=customer.id if customer else None,
        )
        errors: list[str] = []
        summary = ""
        case_summary = self._derive_case_summary(
            prompt,
            {
                "issue_category": support_case.issue_category or "General Support",
                "assigned_team": support_case.assigned_team or "Support Operations",
                "severity": support_case.severity or "medium",
            },
            ai_summary=ai_intake.get("summary") if isinstance(ai_intake, dict) else None,
        )
        engine_mode = "heuristic_fallback"
        triage = {
            "issue_category": support_case.issue_category or "General Support",
            "assigned_team": support_case.assigned_team or "Support Operations",
            "severity": support_case.severity or "medium",
        }

        if self._can_use_adk():
            try:
                agent = build_root_agent(self.settings.gemini_model, gateway)
                session_service = InMemorySessionService()
                session_id = f"ticketflow-{uuid.uuid4()}"
                await session_service.create_session(
                    app_name=self.settings.app_name, user_id="demo-user", session_id=session_id
                )
                runner = Runner(agent=agent, app_name=self.settings.app_name, session_service=session_service)
                user_message = types.Content(role="user", parts=[types.Part(text=prompt)])
                async for event in runner.run_async(user_id="demo-user", session_id=session_id, new_message=user_message):
                    if event.is_final_response() and event.content and event.content.parts:
                        summary = event.content.parts[0].text or ""
                engine_mode = "gemini_adk"
            except Exception as exc:
                if not self.settings.enable_heuristic_fallback:
                    raise
                logger.exception("ADK/Gemini execution failed; falling back to heuristic mode.")
                errors.append(f"ADK execution failed, used heuristic fallback: {exc}")
                summary = await self._heuristic_fallback(prompt, gateway, triage)
        else:
            summary = await self._heuristic_fallback(prompt, gateway, triage)

        await self._ensure_case_artifacts(prompt, gateway, triage, case_summary, ai_intake)

        if not summary:
            summary = self._compose_summary(gateway)

        return WorkflowResult(
            summary=summary,
            case_summary=case_summary,
            steps=gateway.steps,
            triage=triage,
            case=SupportCaseRead.model_validate(support_case),
            customer=CustomerRead.model_validate(customer) if customer else None,
            tasks=gateway.created_tasks or gateway.listed_tasks,
            events=gateway.created_events or gateway.listed_events,
            notes=gateway.created_notes or gateway.searched_notes,
            errors=errors,
        ), engine_mode

    async def _ensure_case_artifacts(
        self,
        prompt: str,
        gateway: MCPGateway,
        triage: dict[str, str],
        case_summary: str,
        ai_intake: dict[str, object] | None = None,
    ) -> None:
        text = prompt.strip()
        lower = text.lower()

        if "show" in lower or "list" in lower:
            return

        if not gateway.created_notes:
            await gateway.add_note(
                "notes_agent",
                NoteCreate(
                    title="Conversation Summary",
                    body=case_summary,
                    metadata_json={
                        "source": "workflow_summary",
                        "issue_category": triage["issue_category"],
                        "assigned_team": triage["assigned_team"],
                        "conversation": text,
                    },
                ),
            )

        if not gateway.created_tasks:
            ai_task_titles = self._extract_ai_task_titles(ai_intake)
            for task_title in ai_task_titles or self._extract_follow_up_tasks(text):
                await gateway.create_task(
                    "task_agent",
                    TaskCreate(
                        title=task_title,
                        description=case_summary,
                        priority="high" if triage["severity"] == "high" else "medium",
                        issue_category=triage["issue_category"],
                        assigned_team=triage["assigned_team"],
                        assigned_member=None,
                        source_text=text,
                    ),
                )

    def _can_use_adk(self) -> bool:
        return bool(self.settings.google_api_key or self.settings.google_genai_use_vertexai)

    async def _heuristic_fallback(self, prompt: str, gateway: MCPGateway, triage: dict[str, str]) -> str:
        text = prompt.strip()
        lower = text.lower()
        parsed_due = parse_relative_schedule(text)
        due_at = parsed_due[0] if parsed_due else None

        if "show" in lower or "list" in lower:
            if "task" in lower:
                await gateway.list_tasks("task_agent", status="open", limit=10)
            if "event" in lower or "schedule" in lower:
                await gateway.list_events("calendar_agent", limit=10)
            if "note" in lower or "onboarding" in lower:
                query = "onboarding" if "onboarding" in lower else " "
                await gateway.search_notes("notes_agent", query=query.strip() or " ", limit=10)
            return self._compose_summary(gateway)

        if "note:" in lower:
            note_text = text.split("note:", maxsplit=1)[1].strip()
            await gateway.add_note("notes_agent", NoteCreate(title=derive_note_title(note_text), body=note_text))

        if "meeting notes" in lower or "save these meeting notes" in lower:
            await gateway.add_note("notes_agent", NoteCreate(title="Meeting Notes", body=text))
            followups = self._extract_follow_up_tasks(text)
            for task_title in followups:
                await gateway.create_task(
                    "task_agent",
                    TaskCreate(title=task_title, description=text, priority="medium", due_at=due_at, source_text=text),
                )

        if "support issue" in lower:
            await gateway.add_note("notes_agent", NoteCreate(title="Support Issue", body=text))
            followups = self._extract_follow_up_tasks(text)
            if followups:
                for task_title in followups:
                    await gateway.create_task(
                        "task_agent",
                        TaskCreate(
                            title=task_title,
                            description=text,
                            priority="high" if "high" in lower or "urgent" in lower else "medium",
                            due_at=due_at,
                            issue_category=triage["issue_category"],
                            assigned_team=triage["assigned_team"],
                            assigned_member=None,
                            source_text=text,
                        ),
                    )
            else:
                await gateway.create_task(
                    "task_agent",
                    TaskCreate(
                        title=f"{triage['assigned_team']}: follow up on {triage['issue_category']} issue",
                        description=text,
                        priority="high" if "high" in lower or "urgent" in lower else "medium",
                        due_at=due_at,
                        issue_category=triage["issue_category"],
                        assigned_team=triage["assigned_team"],
                        assigned_member=None,
                        source_text=text,
                    ),
                )

        if "task" in lower or "follow-up task" in lower or "follow up task" in lower:
            priority = "high" if "high-priority" in lower or "high priority" in lower else "medium"
            await gateway.create_task(
                "task_agent",
                TaskCreate(
                    title=derive_task_title(text),
                    description=text,
                    priority=priority,
                    due_at=due_at,
                    issue_category=triage["issue_category"] if self._looks_like_issue(lower) else None,
                    assigned_team=triage["assigned_team"] if self._looks_like_issue(lower) else None,
                    source_text=text,
                ),
            )

        return self._compose_summary(gateway)

    def _extract_follow_up_tasks(self, text: str) -> list[str]:
        bullets = []
        for line in text.splitlines():
            clean = line.strip("-* ").strip()
            lowered = clean.lower()
            if clean and any(
                token in lowered
                for token in ["follow", "action", "todo", "next step", "will ", "please ", "need to", "must "]
            ):
                bullets.append(clean[:120])
        if "customer" in text.lower() and not bullets:
            bullets.append("Review the customer conversation and prepare the next response")
        return bullets or ["Review the conversation and define follow-up actions"]

    def _compose_summary(self, gateway: MCPGateway) -> str:
        parts = []
        if gateway.created_tasks:
            parts.append(f"Created {len(gateway.created_tasks)} task(s)")
        if gateway.listed_tasks:
            parts.append(f"returned {len(gateway.listed_tasks)} open task(s)")
        if gateway.created_events:
            parts.append(f"scheduled {len(gateway.created_events)} event(s)")
        if gateway.created_notes:
            parts.append(f"saved {len(gateway.created_notes)} note(s)")
        return ", ".join(parts).capitalize() + "." if parts else "No actions were taken."

    def _looks_like_issue(self, lower_text: str) -> bool:
        return any(token in lower_text for token in ["issue", "bug", "error", "broken", "cannot", "can't", "failed"])

    def _classify_issue(self, prompt: str) -> dict[str, str]:
        text = prompt.lower()
        team = "Support Operations"
        category = "General Support"

        rules = [
            (["login", "password", "auth", "permission", "access denied"], ("Identity & Access", "Authentication")),
            (["email", "notification", "message", "inbox"], ("Communications", "Notifications")),
            (["billing", "invoice", "payment", "pricing", "discount"], ("Billing", "Billing & Pricing")),
            (["onboarding", "setup", "provisioning"], ("Customer Success", "Onboarding")),
            (["api", "integration", "webhook", "sync"], ("Platform Engineering", "Integrations")),
            (["bug", "error", "crash", "broken", "exception"], ("Engineering", "Product Bug")),
            (["ui", "button", "screen", "page", "frontend"], ("Frontend Engineering", "UI Bug")),
        ]

        for keywords, (next_team, next_category) in rules:
            if any(keyword in text for keyword in keywords):
                team = next_team
                category = next_category
                break

        severity = "high" if any(token in text for token in ["urgent", "asap", "critical", "today"]) else "medium"
        return {
            "issue_category": category,
            "assigned_team": team,
            "severity": severity,
        }

    def _create_case(self, session, prompt: str, triage: dict[str, str], customer: Customer | None) -> SupportCase:
        support_case = SupportCase(
            customer_id=customer.id if customer else None,
            title=self._derive_case_title(prompt, triage),
            source_text=prompt,
            issue_category=triage["issue_category"],
            assigned_team=triage["assigned_team"],
            severity=triage["severity"],
            status="open",
        )
        session.add(support_case)
        session.commit()
        session.refresh(support_case)
        return support_case

    def _derive_case_title(self, prompt: str, triage: dict[str, str]) -> str:
        text = prompt.strip().replace("\n", " ")
        if text.lower().startswith("support issue:"):
            text = text.split(":", maxsplit=1)[1].strip()
        base = text[:140] if text else triage["issue_category"]
        return f"{triage['issue_category']}: {base}"

    def _extract_customer_details(self, prompt: str, ai_customer: dict[str, object] | None = None) -> dict[str, str | None]:
        email_match = re.search(r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})", prompt, re.IGNORECASE)
        phone_match = re.search(r"(\+?\d[\d\-\s()]{7,}\d)", prompt)
        name_match = re.search(
            r"(?:customer|client|caller)\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})",
            prompt,
            re.IGNORECASE,
        )
        if not name_match:
            name_match = re.search(
                r"(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})",
                prompt,
                re.IGNORECASE,
            )
        if not name_match:
            name_match = re.search(
                r"(?:reach me at|contact me at|email me at)[^.\n]*\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})",
                prompt,
                re.IGNORECASE,
            )

        return {
            "name": self._normalize_optional_string((ai_customer or {}).get("name")) or (name_match.group(1).strip() if name_match else None),
            "email": self._normalize_optional_string((ai_customer or {}).get("email")) or (email_match.group(1).strip() if email_match else None),
            "phone": self._normalize_optional_string((ai_customer or {}).get("phone")) or (phone_match.group(1).strip() if phone_match else None),
        }

    def _get_or_create_customer(self, session, prompt: str, ai_customer: dict[str, object] | None = None) -> Customer | None:
        details = self._extract_customer_details(prompt, ai_customer)
        if not any(details.values()):
            return None

        conditions = []
        if details["email"]:
            conditions.append(Customer.email == details["email"])
        if details["phone"]:
            conditions.append(Customer.phone == details["phone"])
        if details["name"]:
            conditions.append(Customer.name == details["name"])

        customer = session.scalars(select(Customer).where(or_(*conditions))).first() if conditions else None
        if customer:
            changed = False
            for field in ("name", "email", "phone"):
                if getattr(customer, field) is None and details[field]:
                    setattr(customer, field, details[field])
                    changed = True
            if changed:
                session.commit()
                session.refresh(customer)
            return customer

        customer = Customer(name=details["name"], email=details["email"], phone=details["phone"])
        session.add(customer)
        session.commit()
        session.refresh(customer)
        return customer

    def _derive_case_summary(self, prompt: str, triage: dict[str, str], ai_summary: object | None = None) -> str:
        if isinstance(ai_summary, str) and ai_summary.strip():
            return ai_summary.strip()
        lines = [line.strip(" -*") for line in prompt.splitlines() if line.strip()]
        condensed = " ".join(lines)
        if len(condensed) > 260:
            condensed = condensed[:257].rstrip() + "..."
        return (
            f"Support case classified as {triage['issue_category']} and routed to {triage['assigned_team']} "
            f"with {triage['severity']} priority. Conversation summary: {condensed}"
        )

    def _normalize_optional_string(self, value: object | None) -> str | None:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return None

    def _extract_ai_task_titles(self, ai_intake: dict[str, object] | None) -> list[str]:
        if not isinstance(ai_intake, dict):
            return []
        tasks = ai_intake.get("tasks")
        if not isinstance(tasks, list):
            return []

        titles: list[str] = []
        for item in tasks:
            if isinstance(item, dict):
                title = self._normalize_optional_string(item.get("title"))
                if title:
                    titles.append(title[:120])
            elif isinstance(item, str):
                title = item.strip()
                if title:
                    titles.append(title[:120])
        return titles

    async def _extract_intake_with_ai(self, prompt: str) -> dict[str, object]:
        if not self._can_use_adk():
            return {}

        extraction_prompt = (
            "Extract structured support intake data from this conversation. "
            "Return JSON only with this exact shape: "
            '{"summary":"short summary","customer":{"name":null,"email":null,"phone":null},"tasks":[{"title":"task title"}]}. '
            "Only extract contact details that are explicitly present or strongly implied. "
            "Do not invent customer information.\n\nConversation:\n"
            f"{prompt}"
        )

        try:
            return await self._generate_intake_with_primary_client(extraction_prompt)
        except ClientError as exc:
            if self._should_retry_intake_without_vertex(exc):
                try:
                    return await self._generate_intake_with_api_key(extraction_prompt)
                except Exception:
                    logger.exception("AI intake extraction API-key fallback failed after Vertex error.")
            logger.exception("AI intake extraction failed; falling back to deterministic extraction.")
            return {}
        except Exception:
            logger.exception("AI intake extraction failed; falling back to deterministic extraction.")
            return {}

    async def _generate_intake_with_primary_client(self, extraction_prompt: str) -> dict[str, object]:
        client_kwargs: dict[str, object] = {}
        if self.settings.google_genai_use_vertexai:
            client_kwargs.update(
                {
                    "vertexai": True,
                    "project": self.settings.google_cloud_project,
                    "location": self.settings.google_cloud_location,
                }
            )
        elif self.settings.google_api_key:
            client_kwargs["api_key"] = self.settings.google_api_key
        else:
            return {}

        return await self._generate_intake_with_client_kwargs(client_kwargs, extraction_prompt)

    async def _generate_intake_with_api_key(self, extraction_prompt: str) -> dict[str, object]:
        if not self.settings.google_api_key:
            return {}

        logger.warning(
            "Retrying AI intake extraction with direct Gemini API because Vertex model %s is unavailable.",
            self.settings.gemini_model,
        )
        return await self._generate_intake_with_client_kwargs(
            {"api_key": self.settings.google_api_key},
            extraction_prompt,
        )

    async def _generate_intake_with_client_kwargs(
        self, client_kwargs: dict[str, object], extraction_prompt: str
    ) -> dict[str, object]:
        client = Client(**client_kwargs)
        response = await client.aio.models.generate_content(
            model=self.settings.gemini_model,
            contents=extraction_prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        raw_text = (response.text or "").strip()
        if not raw_text:
            return {}
        parsed = json.loads(raw_text)
        return parsed if isinstance(parsed, dict) else {}

    def _should_retry_intake_without_vertex(self, exc: ClientError) -> bool:
        if not (self.settings.google_genai_use_vertexai and self.settings.google_api_key):
            return False

        error_text = str(exc).lower()
        return exc.code == 404 and (
            "publisher model" in error_text or "not found" in error_text or "does not have access" in error_text
        )

    def get_state(self) -> StateResponse:
        with get_session() as session:
            customers = session.scalars(select(Customer).order_by(desc(Customer.created_at)).limit(20)).all()
            cases = session.scalars(select(SupportCase).order_by(desc(SupportCase.created_at)).limit(10)).all()
            tasks = session.scalars(select(Task).order_by(desc(Task.created_at)).limit(10)).all()
            events = session.scalars(select(Event).order_by(desc(Event.start_at)).limit(10)).all()
            notes = session.scalars(select(Note).order_by(desc(Note.created_at)).limit(10)).all()
            runs = session.scalars(select(WorkflowRun).order_by(desc(WorkflowRun.created_at)).limit(10)).all()
            return StateResponse(
                customers=[CustomerRead.model_validate(customer) for customer in customers],
                cases=[SupportCaseRead.model_validate(case) for case in cases],
                tasks=[TaskRead.model_validate(task) for task in tasks],
                events=[EventRead.model_validate(event) for event in events],
                notes=[NoteRead.model_validate(note) for note in notes],
                workflow_runs=[
                    WorkflowRunRead.model_validate(
                        {
                            "id": run.id,
                            "case_id": run.case_id,
                            "request_text": run.request_text,
                            "status": run.status.value if hasattr(run.status, "value") else run.status,
                            "summary": run.summary,
                            "engine_mode": (run.artifacts_json or {}).get("engine_mode"),
                            "steps_json": run.steps_json,
                            "artifacts_json": run.artifacts_json,
                            "error_message": run.error_message,
                            "created_at": run.created_at,
                            "completed_at": run.completed_at,
                        }
                    )
                    for run in runs
                ],
            )

    def update_task_assignment(self, task_id: str, payload: TaskAssignmentUpdate) -> TaskRead:
        with get_session() as session:
            task = session.get(Task, uuid.UUID(task_id))
            if task is None:
                raise ValueError("Task not found.")
            task.assigned_member = payload.assigned_member
            session.commit()
            session.refresh(task)
            return TaskRead.model_validate(task)

    def update_task(self, task_id: str, payload: TaskUpdate) -> TaskRead:
        with get_session() as session:
            task = session.get(Task, uuid.UUID(task_id))
            if task is None:
                raise ValueError("Task not found.")
            task.title = payload.title
            task.description = payload.description
            task.priority = payload.priority
            task.status = payload.status
            task.due_at = payload.due_at
            session.commit()
            session.refresh(task)
            return TaskRead.model_validate(task)

    def get_case_detail(self, case_id: str) -> SupportCaseDetailResponse:
        with get_session() as session:
            support_case = session.get(SupportCase, uuid.UUID(case_id))
            if support_case is None:
                raise ValueError("Support case not found.")

            customer = session.get(Customer, support_case.customer_id) if support_case.customer_id else None
            tasks = session.scalars(
                select(Task).where(Task.case_id == support_case.id).order_by(desc(Task.created_at))
            ).all()
            runs = session.scalars(
                select(WorkflowRun).where(WorkflowRun.case_id == support_case.id).order_by(desc(WorkflowRun.created_at))
            ).all()

            return SupportCaseDetailResponse(
                case=SupportCaseRead.model_validate(support_case),
                customer=CustomerRead.model_validate(customer) if customer else None,
                tasks=[TaskRead.model_validate(task) for task in tasks],
                workflow_runs=[
                    WorkflowRunRead.model_validate(
                        {
                            "id": run.id,
                            "case_id": run.case_id,
                            "request_text": run.request_text,
                            "status": run.status.value if hasattr(run.status, "value") else run.status,
                            "summary": run.summary,
                            "engine_mode": (run.artifacts_json or {}).get("engine_mode"),
                            "steps_json": run.steps_json,
                            "artifacts_json": run.artifacts_json,
                            "error_message": run.error_message,
                            "created_at": run.created_at,
                            "completed_at": run.completed_at,
                        }
                    )
                    for run in runs
                ],
            )

    def delete_task(self, task_id: str) -> DeleteResponse:
        with get_session() as session:
            task = session.get(Task, uuid.UUID(task_id))
            if task is None:
                raise ValueError("Task not found.")
            session.delete(task)
            session.commit()
            return DeleteResponse(deleted_id=task.id, resource="task")

    def delete_event(self, event_id: str) -> DeleteResponse:
        with get_session() as session:
            event = session.get(Event, uuid.UUID(event_id))
            if event is None:
                raise ValueError("Event not found.")
            session.delete(event)
            session.commit()
            return DeleteResponse(deleted_id=event.id, resource="event")

    def delete_note(self, note_id: str) -> DeleteResponse:
        with get_session() as session:
            note = session.get(Note, uuid.UUID(note_id))
            if note is None:
                raise ValueError("Note not found.")
            session.delete(note)
            session.commit()
            return DeleteResponse(deleted_id=note.id, resource="note")

    def delete_workflow_run(self, workflow_run_id: str) -> DeleteResponse:
        with get_session() as session:
            workflow_run = session.get(WorkflowRun, uuid.UUID(workflow_run_id))
            if workflow_run is None:
                raise ValueError("Workflow run not found.")
            session.delete(workflow_run)
            session.commit()
            return DeleteResponse(deleted_id=workflow_run.id, resource="workflow_run")

    def delete_case(self, case_id: str) -> DeleteResponse:
        with get_session() as session:
            support_case = session.get(SupportCase, uuid.UUID(case_id))
            if support_case is None:
                raise ValueError("Support case not found.")

            tasks = session.scalars(select(Task).where(Task.case_id == support_case.id)).all()
            events = session.scalars(select(Event).where(Event.case_id == support_case.id)).all()
            notes = session.scalars(select(Note).where(Note.case_id == support_case.id)).all()
            runs = session.scalars(select(WorkflowRun).where(WorkflowRun.case_id == support_case.id)).all()

            for record in [*tasks, *events, *notes, *runs]:
                session.delete(record)

            session.delete(support_case)
            session.commit()
            return DeleteResponse(deleted_id=support_case.id, resource="support_case")

    def delete_customer(self, customer_id: str) -> DeleteResponse:
        with get_session() as session:
            customer = session.get(Customer, uuid.UUID(customer_id))
            if customer is None:
                raise ValueError("Customer not found.")
            session.delete(customer)
            session.commit()
            return DeleteResponse(deleted_id=customer.id, resource="customer")
