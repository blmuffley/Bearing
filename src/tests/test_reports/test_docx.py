"""Tests for DOCX report generation."""

from __future__ import annotations

from bearing.api.schemas import AssessmentResponse, DimensionScoreResponse, FindingResponse
from bearing.reports.docx_report import DOCXReportGenerator


def test_generate_health_scorecard(
    sample_assessment: AssessmentResponse,
    sample_dimension_scores: list[DimensionScoreResponse],
    sample_findings: list[FindingResponse],
) -> None:
    generator = DOCXReportGenerator()
    docx_bytes = generator.generate_health_scorecard(
        sample_assessment, sample_dimension_scores, sample_findings
    )
    assert len(docx_bytes) > 0
    # DOCX files are ZIP archives
    assert docx_bytes[:2] == b"PK"
