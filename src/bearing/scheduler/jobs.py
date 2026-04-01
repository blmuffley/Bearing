"""APScheduler job definitions for scheduled assessments and monitoring."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from bearing.api.schemas import AssessmentCreateRequest, AssessmentScope, TriggeredBy
from bearing.assessment.engine import AssessmentEngine
from bearing.config import Settings

logger = logging.getLogger(__name__)


def create_scheduler(settings: Settings) -> BackgroundScheduler | None:
    """Create and configure the background scheduler.

    Returns None if no schedule is configured.
    """
    if not settings.schedule_cron:
        return None

    scheduler = BackgroundScheduler()

    # Parse cron expression (minute hour day_of_month month day_of_week)
    parts = settings.schedule_cron.split()
    if len(parts) != 5:
        logger.error("Invalid cron expression: %s (expected 5 fields)", settings.schedule_cron)
        return None

    scheduler.add_job(
        run_scheduled_assessment,
        "cron",
        minute=parts[0],
        hour=parts[1],
        day=parts[2],
        month=parts[3],
        day_of_week=parts[4],
        args=[settings],
        id="scheduled_assessment",
        name="Scheduled CMDB Assessment",
    )

    logger.info("Scheduled assessment configured: %s", settings.schedule_cron)
    return scheduler


def run_scheduled_assessment(settings: Settings) -> None:
    """Execute a scheduled assessment."""
    logger.info("Starting scheduled assessment")
    engine = AssessmentEngine(settings)
    request = AssessmentCreateRequest(
        name="Scheduled Assessment",
        scope=AssessmentScope.FULL,
        triggered_by=TriggeredBy.SCHEDULED,
    )
    assessment = engine.create_assessment(request)
    engine.run_assessment(assessment.assessment_id)
    logger.info("Scheduled assessment completed: %s", assessment.assessment_id)
