"""Tests for Pathfinder confidence feed processor."""

from __future__ import annotations

from datetime import datetime, timezone

from bearing.api.schemas import (
    CIConfidenceRecord,
    CoverageSummary,
    PathfinderConfidenceFeed,
    TrafficState,
)
from bearing.fusion.pathfinder import PathfinderProcessor


def test_ingest_confidence_feed() -> None:
    processor = PathfinderProcessor()
    feed = PathfinderConfidenceFeed(
        schema_version="1.0",
        pathfinder_instance_id="pf-test-01",
        servicenow_instance_url="https://test.service-now.com",
        observation_window_hours=24,
        generated_at=datetime.now(timezone.utc),
        ci_confidence_records=[
            CIConfidenceRecord(
                ci_sys_id="ci001",
                ci_class="cmdb_ci_linux_server",
                confidence_score=90,
                traffic_state=TrafficState.ACTIVE,
                last_observation=datetime.now(timezone.utc),
                observation_count=100,
            ),
            CIConfidenceRecord(
                ci_sys_id="ci002",
                ci_class="cmdb_ci_win_server",
                confidence_score=30,
                traffic_state=TrafficState.IDLE,
                last_observation=datetime.now(timezone.utc),
                observation_count=5,
            ),
        ],
        coverage_summary=CoverageSummary(
            total_monitored_hosts=500,
            active_cis=400,
            idle_cis=80,
            deprecated_cis=15,
            unknown_cis=5,
        ),
    )

    count = processor.ingest_confidence_feed(feed)
    assert count == 2

    record = processor.get_confidence("ci001")
    assert record is not None
    assert record.confidence_score == 90
    assert record.traffic_state == TrafficState.ACTIVE

    state = processor.get_traffic_state("ci002")
    assert state == TrafficState.IDLE

    assert processor.get_confidence("nonexistent") is None
