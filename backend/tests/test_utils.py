from datetime import datetime, timezone

from ticketflow_shared.utils import parse_relative_schedule


def test_parse_relative_schedule_tomorrow_hour() -> None:
    start_at, end_at = parse_relative_schedule(
        "block one hour tomorrow at 10 AM",
        now=datetime(2026, 4, 4, 9, 0, tzinfo=timezone.utc),
    )
    assert start_at.hour == 10
    assert end_at.hour == 11


def test_parse_relative_schedule_tomorrow_morning() -> None:
    start_at, end_at = parse_relative_schedule(
        "schedule a customer callback tomorrow morning",
        now=datetime(2026, 4, 4, 9, 0, tzinfo=timezone.utc),
    )
    assert start_at.hour == 9
    assert end_at.hour == 10


def test_parse_relative_schedule_next_business_day() -> None:
    start_at, end_at = parse_relative_schedule(
        "remind me next business day by 5 pm",
        now=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
    )
    assert start_at.day == 6
    assert start_at.hour == 17
    assert end_at.hour == 18
