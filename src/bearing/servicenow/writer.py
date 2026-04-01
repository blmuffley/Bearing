"""Write assessment results to ServiceNow Bearing tables."""

from __future__ import annotations

import logging

from bearing.api.schemas import (
    AssessmentResponse,
    DimensionScoreResponse,
    FindingResponse,
    RecommendationResponse,
)
from bearing.servicenow.client import ServiceNowClient

logger = logging.getLogger(__name__)

# Bearing-owned tables (write-only targets)
TABLE_ASSESSMENT = "x_avnth_bearing_assessment"
TABLE_FINDING = "x_avnth_bearing_finding"
TABLE_SCORE = "x_avnth_bearing_score"
TABLE_TREND = "x_avnth_bearing_trend"
TABLE_RECOMMENDATION = "x_avnth_bearing_recommendation"


class AssessmentWriter:
    """Writes assessment results to ServiceNow Bearing tables."""

    def __init__(self, client: ServiceNowClient) -> None:
        self.client = client

    def write_assessment(self, assessment: AssessmentResponse) -> str:
        """Write assessment metadata to x_avnth_bearing_assessment."""
        data = {
            "u_assessment_id": assessment.assessment_id,
            "u_name": assessment.name,
            "u_scope": assessment.scope.value,
            "u_overall_score": assessment.overall_score,
            "u_maturity_level": assessment.maturity_level,
            "u_maturity_label": assessment.maturity_label,
            "u_findings_count": assessment.findings_count,
            "u_critical_findings": assessment.critical_findings,
            "u_technical_debt_estimate": assessment.technical_debt_estimate,
            "u_ci_count_assessed": assessment.ci_count_assessed,
            "u_has_pathfinder_data": assessment.has_pathfinder_data,
            "u_has_contour_data": assessment.has_contour_data,
            "u_status": assessment.status.value,
            "u_ai_summary": assessment.ai_summary,
            "u_triggered_by": assessment.triggered_by.value,
        }
        result = self.client.write_record(TABLE_ASSESSMENT, data)
        sys_id = str(result.get("sys_id", ""))
        logger.info("Wrote assessment %s to ServiceNow (sys_id: %s)", assessment.assessment_id, sys_id)
        return sys_id

    def write_scores(
        self, assessment_sys_id: str, scores: list[DimensionScoreResponse]
    ) -> None:
        """Write dimension scores to x_avnth_bearing_score."""
        for score in scores:
            data = {
                "u_assessment": assessment_sys_id,
                "u_dimension": score.dimension.value,
                "u_score": score.score,
                "u_weight": score.weight,
                "u_checks_passed": score.checks_passed,
                "u_checks_total": score.checks_total,
                "u_details": score.details,
            }
            self.client.write_record(TABLE_SCORE, data)

    def write_findings(
        self, assessment_sys_id: str, findings: list[FindingResponse]
    ) -> None:
        """Write findings to x_avnth_bearing_finding."""
        for finding in findings:
            data = {
                "u_finding_id": finding.finding_id,
                "u_assessment": assessment_sys_id,
                "u_finding_type": finding.finding_type.value,
                "u_severity": finding.severity.value,
                "u_dimension": finding.dimension.value,
                "u_category": finding.category,
                "u_title": finding.title,
                "u_description": finding.description,
                "u_affected_ci_class": finding.affected_ci_class,
                "u_affected_count": finding.affected_count,
                "u_remediation": finding.remediation,
                "u_estimated_effort_hours": finding.estimated_effort_hours,
                "u_estimated_cost": finding.estimated_cost,
                "u_avennorth_product": finding.avennorth_product.value,
                "u_automation_potential": finding.automation_potential.value,
                "u_fusion_source": finding.fusion_source.value,
            }
            self.client.write_record(TABLE_FINDING, data)

    def write_recommendations(
        self, assessment_sys_id: str, recommendations: list[RecommendationResponse]
    ) -> None:
        """Write recommendations to x_avnth_bearing_recommendation."""
        for rec in recommendations:
            data = {
                "u_recommendation_id": rec.recommendation_id,
                "u_assessment": assessment_sys_id,
                "u_priority": rec.priority,
                "u_title": rec.title,
                "u_description": rec.description,
                "u_dimension": rec.dimension.value,
                "u_impact_score": rec.impact_score,
                "u_effort": rec.effort.value,
                "u_estimated_hours": rec.estimated_hours,
                "u_estimated_cost_savings": rec.estimated_cost_savings,
                "u_avennorth_product": rec.avennorth_product.value,
                "u_automation_potential": rec.automation_potential.value,
            }
            self.client.write_record(TABLE_RECOMMENDATION, data)
