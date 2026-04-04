from datetime import datetime, timezone

from ticketflow_shared.utils import parse_relative_schedule


def test_parse_relative_schedule_tomorrow_hour() -> None:
    start_at, end_at = parse_relative_schedule(
        "block one hour tomorrow at 10 AM",
        now=datetime(2026, 4, 4, 9, 0, tzinfo=timezone.utc),
    )
    assert start_at.hour == 10
    assert end_at.hour == 11
