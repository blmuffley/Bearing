"""AI-powered analysis generation for assessments."""

from __future__ import annotations

import logging

from bearing.ai.client import AIClient
from bearing.ai.prompts import build_executive_summary_prompt, build_recommendation_prompt
from bearing.api.schemas import AssessmentResponse, DimensionScoreResponse, FindingResponse
from bearing.config import Settings

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """Generates AI-powered analysis for assessment results."""

    def __init__(self, settings: Settings) -> None:
        self.client = AIClient(settings)

    def generate_executive_summary(
        self,
        assessment: AssessmentResponse,
        scores: list[DimensionScoreResponse],
        findings: list[FindingResponse],
    ) -> str:
        """Generate an AI executive summary for the assessment."""
        prompt = build_executive_summary_prompt(assessment, scores, findings)
        return self.client.generate_summary(prompt)

    def generate_recommendations(
        self,
        assessment: AssessmentResponse,
        scores: list[DimensionScoreResponse],
    ) -> str:
        """Generate AI-powered remediation recommendations."""
        prompt = build_recommendation_prompt(assessment, scores)
        return self.client.generate_summary(prompt)
