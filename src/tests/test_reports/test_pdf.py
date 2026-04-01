"""Tests for PDF report generation."""

from __future__ import annotations

from bearing.api.schemas import AssessmentResponse, DimensionScoreResponse, FindingResponse
from bearing.reports.pdf import PDFReportGenerator


def test_generate_health_scorecard(
    sample_assessment: AssessmentResponse,
    sample_dimension_scores: list[DimensionScoreResponse],
    sample_findings: list[FindingResponse],
) -> None:
    generator = PDFReportGenerator()
    pdf_bytes = generator.generate_health_scorecard(
        sample_assessment, sample_dimension_scores, sample_findings
    )
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:5] == b"%PDF-"
