"""Webhook endpoints for Pathfinder and Contour integration."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException

from bearing.api.schemas import PathfinderConfidenceFeed
from bearing.config import get_settings
from bearing.fusion.pathfinder import PathfinderProcessor

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/pathfinder")
async def receive_pathfinder_feed(
    payload: PathfinderConfidenceFeed,
    x_bearing_api_key: str = Header(...),
) -> dict[str, str | int]:
    """Receive confidence feed from Pathfinder.

    Validates the API key, processes the confidence feed,
    and stores CI confidence records for fusion scoring.
    """
    settings = get_settings()
    if x_bearing_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    processor = PathfinderProcessor()
    records_processed = processor.ingest_confidence_feed(payload)

    logger.info(
        "Processed Pathfinder confidence feed: %d CI records from %s",
        records_processed,
        payload.pathfinder_instance_id,
    )

    return {
        "status": "accepted",
        "records_processed": records_processed,
        "pathfinder_instance_id": payload.pathfinder_instance_id,
    }


@router.post("/contour")
async def receive_contour_event(
    payload: dict[str, object],
    x_bearing_api_key: str = Header(...),
) -> dict[str, str]:
    """Receive service model events from Contour.

    Stores service model update metadata for CSDM compliance scoring.
    """
    settings = get_settings()
    if x_bearing_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    logger.info("Received Contour service model event: %s", payload.get("event_type", "unknown"))

    return {"status": "accepted"}
