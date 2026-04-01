"""Recommendation engine — generates prioritized remediation actions."""

from __future__ import annotations

import uuid

from bearing.api.schemas import (
    AutomationPotential,
    AvennorthProduct,
    Dimension,
    DimensionScoreResponse,
    Effort,
    FindingResponse,
    RecommendationResponse,
)


class RecommendationEngine:
    """Generates prioritized remediation recommendations from findings."""

    def generate(
        self,
        dimension_scores: list[DimensionScoreResponse],
        findings: list[FindingResponse],
    ) -> list[RecommendationResponse]:
        """Generate recommendations sorted by impact.

        Args:
            dimension_scores: Per-dimension scores.
            findings: All assessment findings.

        Returns:
            Prioritized list of recommendations.
        """
        recommendations: list[RecommendationResponse] = []
        score_map = {s.dimension: s.score for s in dimension_scores}

        # Group findings by dimension
        by_dimension: dict[str, list[FindingResponse]] = {}
        for f in findings:
            dim = f.dimension.value
            by_dimension.setdefault(dim, []).append(f)

        # Generate recommendations for lowest-scoring dimensions first
        sorted_dims = sorted(score_map.items(), key=lambda x: x[1])

        for dimension, score in sorted_dims:
            dim_findings = by_dimension.get(dimension.value, [])
            if not dim_findings:
                continue

            critical_count = sum(1 for f in dim_findings if f.severity.value == "critical")
            high_count = sum(1 for f in dim_findings if f.severity.value == "high")
            total_affected = sum(f.affected_count for f in dim_findings)

            # Determine effort and impact
            impact = min(10, max(1, (100 - score) // 10))
            effort = Effort.HIGH if total_affected > 500 else Effort.MEDIUM if total_affected > 50 else Effort.LOW

            # Determine if Avennorth products can help
            product = self._suggest_product(dimension)
            automation = self._suggest_automation(dimension)

            rec = RecommendationResponse(
                recommendation_id=str(uuid.uuid4()),
                priority=0,  # Set after sorting
                title=self._title_for_dimension(dimension, score, total_affected),
                description=self._description_for_dimension(
                    dimension, score, critical_count, high_count, total_affected
                ),
                dimension=dimension,
                impact_score=impact,
                effort=effort,
                estimated_hours=total_affected * 1.5,
                estimated_cost_savings=total_affected * 150.0,
                avennorth_product=product,
                automation_potential=automation,
            )
            recommendations.append(rec)

        # Sort by impact descending, assign priorities
        recommendations.sort(key=lambda r: r.impact_score, reverse=True)
        for i, rec in enumerate(recommendations, 1):
            rec.priority = i

        return recommendations

    @staticmethod
    def _suggest_product(dimension: Dimension) -> AvennorthProduct:
        """Suggest which Avennorth product addresses this dimension."""
        val = dimension.value
        if val in ("accuracy", "orphans", "relationships"):
            return AvennorthProduct.PATHFINDER
        elif val == "csdm":
            return AvennorthProduct.CONTOUR
        elif val in ("completeness", "classification"):
            return AvennorthProduct.PATHFINDER_CONTOUR
        else:
            return AvennorthProduct.NONE

    @staticmethod
    def _suggest_automation(dimension: Dimension) -> AutomationPotential:
        """Suggest automation potential for this dimension."""
        val = dimension.value
        if val in ("accuracy", "duplicates"):
            return AutomationPotential.FULL
        elif val in ("relationships", "orphans", "classification"):
            return AutomationPotential.PARTIAL
        else:
            return AutomationPotential.MANUAL

    @staticmethod
    def _title_for_dimension(dimension: Dimension, score: int, affected: int) -> str:
        titles = {
            "completeness": f"Improve CI completeness ({affected} CIs missing required fields)",
            "accuracy": f"Validate CI accuracy with discovery tools ({affected} CIs unverified)",
            "currency": f"Address stale CMDB records ({affected} CIs outdated)",
            "relationships": f"Build service dependency maps ({affected} CIs with gap)",
            "csdm": f"Implement CSDM framework ({affected} CIs unmapped)",
            "classification": f"Correct CI classification ({affected} CIs misclassified)",
            "orphans": f"Resolve orphaned CIs ({affected} CIs with no relationships)",
            "duplicates": f"Deduplicate CMDB records ({affected} potential duplicates)",
        }
        return titles.get(dimension.value, f"Address {dimension.value} issues ({affected} affected)")

    @staticmethod
    def _description_for_dimension(
        dimension: Dimension, score: int, critical: int, high: int, affected: int
    ) -> str:
        return (
            f"The {dimension.value} dimension scored {score}/100 with "
            f"{critical} critical and {high} high-severity findings affecting "
            f"{affected} CIs. Addressing this will improve overall CMDB health "
            f"and reduce associated technical debt."
        )
