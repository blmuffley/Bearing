"""Health Scorecard report template -- single-page assessment summary."""

from __future__ import annotations

# Template content and structure definitions for the health scorecard.
# Used by both PDF and DOCX generators.

REPORT_TYPE = "health_scorecard"
DISPLAY_NAME = "CMDB Health Scorecard"
DESCRIPTION = "Single-page summary: overall score, dimension scores, top findings, maturity level."

SECTIONS = [
    "overall_score",
    "maturity_level",
    "technical_debt",
    "dimension_scores",
    "top_findings",
    "ai_summary",
]
