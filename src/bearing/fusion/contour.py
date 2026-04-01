"""Contour service model event processor.

Processes inbound service model events from Contour for
CSDM compliance scoring enrichment.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ServiceModelEvent:
    """A service model update event from Contour."""

    event_type: str  # service_model.created, service_model.updated
    model_version: str
    changed_services: list[str]
    received_at: datetime


@dataclass
class ContourStore:
    """In-memory store for Contour service model data."""

    events: list[ServiceModelEvent] = field(default_factory=list)
    latest_model_version: str = ""

    @property
    def has_data(self) -> bool:
        return len(self.events) > 0


_store = ContourStore()


def get_contour_store() -> ContourStore:
    """Get the global Contour data store."""
    return _store


class ContourProcessor:
    """Processes inbound Contour service model events."""

    def __init__(self) -> None:
        self.store = get_contour_store()

    def process_event(self, payload: dict[str, object]) -> None:
        """Process a Contour service model event."""
        event = ServiceModelEvent(
            event_type=str(payload.get("event_type", "unknown")),
            model_version=str(payload.get("model_version", "")),
            changed_services=list(payload.get("changed_services", [])),
            received_at=datetime.now(),
        )
        self.store.events.append(event)
        self.store.latest_model_version = event.model_version

        logger.info(
            "Processed Contour event: %s (version %s, %d services changed)",
            event.event_type,
            event.model_version,
            len(event.changed_services),
        )
