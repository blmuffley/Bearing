"""Pathfinder confidence feed processor.

Ingests confidence feed data and stores CI confidence records
for fusion scoring during assessments.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from bearing.api.schemas import CIConfidenceRecord, PathfinderConfidenceFeed, TrafficState

logger = logging.getLogger(__name__)


@dataclass
class ConfidenceStore:
    """In-memory store for Pathfinder confidence data.

    In production, this would be backed by ServiceNow tables or a database.
    """

    records: dict[str, CIConfidenceRecord] = field(default_factory=dict)
    coverage_total_monitored: int = 0
    active_cis: int = 0
    idle_cis: int = 0
    deprecated_cis: int = 0
    monitored_subnets: list[str] = field(default_factory=list)
    unmonitored_subnets: list[str] = field(default_factory=list)

    @property
    def has_data(self) -> bool:
        return len(self.records) > 0


# Module-level store (singleton for the application lifecycle)
_store = ConfidenceStore()


def get_confidence_store() -> ConfidenceStore:
    """Get the global confidence store."""
    return _store


class PathfinderProcessor:
    """Processes inbound Pathfinder confidence feeds."""

    def __init__(self) -> None:
        self.store = get_confidence_store()

    def ingest_confidence_feed(self, feed: PathfinderConfidenceFeed) -> int:
        """Ingest a Pathfinder confidence feed.

        Args:
            feed: The confidence feed payload from Pathfinder.

        Returns:
            Number of CI records processed.
        """
        processed = 0
        for record in feed.ci_confidence_records:
            self.store.records[record.ci_sys_id] = record
            processed += 1

        # Update coverage summary
        summary = feed.coverage_summary
        self.store.coverage_total_monitored = summary.total_monitored_hosts
        self.store.active_cis = summary.active_cis
        self.store.idle_cis = summary.idle_cis
        self.store.deprecated_cis = summary.deprecated_cis
        self.store.monitored_subnets = summary.monitored_subnets
        self.store.unmonitored_subnets = summary.unmonitored_subnets_detected

        logger.info(
            "Ingested %d CI confidence records from Pathfinder instance %s. "
            "Coverage: %d monitored hosts, %d active, %d idle, %d deprecated.",
            processed,
            feed.pathfinder_instance_id,
            summary.total_monitored_hosts,
            summary.active_cis,
            summary.idle_cis,
            summary.deprecated_cis,
        )

        return processed

    def get_confidence(self, ci_sys_id: str) -> CIConfidenceRecord | None:
        """Look up Pathfinder confidence data for a specific CI."""
        return self.store.records.get(ci_sys_id)

    def get_traffic_state(self, ci_sys_id: str) -> TrafficState | None:
        """Get the traffic state for a CI from Pathfinder data."""
        record = self.store.records.get(ci_sys_id)
        return record.traffic_state if record else None
