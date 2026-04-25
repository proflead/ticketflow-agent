from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re


def derive_note_title(body: str) -> str:
    head = body.strip().splitlines()[0] if body.strip() else "Untitled Note"
    return head[:80]


def derive_task_title(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text.strip())
    return cleaned[:120] or "Untitled Task"


def derive_event_title(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text.strip())
    return cleaned[:120] or "Untitled Event"


def parse_relative_schedule(source: str, now: datetime | None = None) -> tuple[datetime, datetime] | None:
    """Parse a tiny subset of scheduling phrases used in the demo prompts."""

    now = now or datetime.now(timezone.utc)
    text = source.lower()
    duration_minutes = 60

    duration_match = re.search(r"(\d+)\s*(minute|minutes|hour|hours)", text)
    if duration_match:
        value = int(duration_match.group(1))
        unit = duration_match.group(2)
        duration_minutes = value * 60 if "hour" in unit else value

    base_day = None
    if "tomorrow" in text:
        base_day = (now + timedelta(days=1)).date()
    elif "today" in text:
        base_day = now.date()
    elif "next business day" in text:
        next_day = now + timedelta(days=1)
        while next_day.weekday() >= 5:
            next_day += timedelta(days=1)
        base_day = next_day.date()
    elif "next week" in text:
        base_day = (now + timedelta(days=7)).date()

    if base_day is None:
        return None

    time_match = re.search(r"(?:at|by|for)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", text)
    if not time_match:
        if "morning" in text:
            hour, minute, meridiem = 9, 0, None
        elif "afternoon" in text:
            hour, minute, meridiem = 14, 0, None
        elif "end of day" in text or "eod" in text:
            hour, minute, meridiem = 17, 0, None
        else:
            return None
    else:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or 0)
        meridiem = time_match.group(3)

    if meridiem == "pm" and hour != 12:
        hour += 12
    if meridiem == "am" and hour == 12:
        hour = 0

    start_at = datetime.combine(base_day, datetime.min.time(), tzinfo=timezone.utc).replace(
        hour=hour, minute=minute
    )
    end_at = start_at + timedelta(minutes=duration_minutes)
    return start_at, end_at
