---
outline: deep
---

<!--@include: ../../docs/internal/05_api_reference.md-->

## API Routes Source

The FastAPI routes are defined in `src/bearing/api/routes.py`. All endpoints follow RESTful conventions with Pydantic schema validation.

```python
"""API route definitions."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response

from bearing.api.schemas import (
    AssessmentCreateRequest,
    AssessmentListResponse,
    AssessmentResponse,
    FindingResponse,
    ReportGenerateRequest,
    TrendResponse,
)
from bearing.assessment.engine import AssessmentEngine
from bearing.config import Settings, get_settings
from bearing.reports.docx_report import DOCXReportGenerator
from bearing.reports.pdf import PDFReportGenerator

logger = logging.getLogger(__name__)
router = APIRouter()


def get_engine(settings: Annotated[Settings, Depends(get_settings)]) -> AssessmentEngine:
    """Dependency to get the assessment engine."""
    return AssessmentEngine(settings)


@router.post("/assessments", response_model=AssessmentResponse)
async def create_assessment(
    request: AssessmentCreateRequest,
    background_tasks: BackgroundTasks,
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> AssessmentResponse:
    """Trigger a new CMDB health assessment."""
    assessment = engine.create_assessment(request)
    background_tasks.add_task(engine.run_assessment, assessment.assessment_id)
    return assessment


@router.get("/assessments", response_model=AssessmentListResponse)
async def list_assessments(
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> AssessmentListResponse:
    """List all assessments."""
    assessments = engine.list_assessments()
    return AssessmentListResponse(assessments=assessments, total=len(assessments))


@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(
    assessment_id: str,
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> AssessmentResponse:
    """Get a specific assessment by ID."""
    assessment = engine.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.get("/scores/{assessment_id}")
async def get_dimension_scores(
    assessment_id: str,
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> list[dict[str, object]]:
    """Get dimension scores for an assessment."""
    scores = engine.get_dimension_scores(assessment_id)
    if not scores:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return [s.model_dump() for s in scores]


@router.get("/findings/{assessment_id}", response_model=list[FindingResponse])
async def get_findings(
    assessment_id: str,
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> list[FindingResponse]:
    """Get findings for an assessment."""
    return engine.get_findings(assessment_id)


@router.get("/trends", response_model=TrendResponse)
async def get_trends(
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> TrendResponse:
    """Get historical trend data across assessments."""
    return engine.get_trends()


@router.post("/reports/{assessment_id}/pdf")
async def generate_pdf_report(
    assessment_id: str,
    request: ReportGenerateRequest,
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> Response:
    """Generate a PDF report for an assessment."""
    assessment = engine.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    scores = engine.get_dimension_scores(assessment_id)
    findings = engine.get_findings(assessment_id)

    generator = PDFReportGenerator()
    pdf_bytes = generator.generate_health_scorecard(assessment, scores, findings)

    filename = f"bearing_{request.report_type}_{assessment_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/reports/{assessment_id}/docx")
async def generate_docx_report(
    assessment_id: str,
    request: ReportGenerateRequest,
    engine: Annotated[AssessmentEngine, Depends(get_engine)],
) -> Response:
    """Generate a DOCX report for an assessment."""
    assessment = engine.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    scores = engine.get_dimension_scores(assessment_id)
    findings = engine.get_findings(assessment_id)

    generator = DOCXReportGenerator()
    docx_bytes = generator.generate_health_scorecard(assessment, scores, findings)

    filename = f"bearing_{request.report_type}_{assessment_id[:8]}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

## Webhook Endpoints

Webhook endpoints for receiving data from Pathfinder and Contour.

```python
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
```
