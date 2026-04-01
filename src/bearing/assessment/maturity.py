"""Five-level CMDB maturity model scorer."""

from __future__ import annotations

from bearing.api.schemas import Dimension, DimensionScoreResponse, FindingResponse

MATURITY_LABELS = {
    1: "Ad-hoc",
    2: "Managed",
    3: "Defined",
    4: "Measured",
    5: "Optimized",
}


class MaturityScorer:
    """Determines the CMDB maturity level from assessment data."""

    def assess(
        self,
        overall_score: int,
        dimension_scores: list[DimensionScoreResponse],
        findings: list[FindingResponse],
    ) -> tuple[int, str]:
        """Determine maturity level based on assessment results.

        Args:
            overall_score: Weighted composite health score (0-100).
            dimension_scores: Per-dimension score results.
            findings: All findings from the assessment.

        Returns:
            Tuple of (maturity_level, maturity_label).
        """
        score_map = {s.dimension: s.score for s in dimension_scores}

        # Check CSDM layers populated
        csdm_score = score_map.get(Dimension.CSDM, 0)
        csdm_layers = self._estimate_csdm_layers(csdm_score)

        # Check discovery coverage (approximated from accuracy dimension)
        accuracy_score = score_map.get(Dimension.ACCURACY, 0)
        has_discovery = accuracy_score > 30
        coverage_pct = accuracy_score  # proxy

        # Check governance indicators
        has_governance = self._has_automated_governance(findings, overall_score)
        has_autonomous = overall_score >= 90 and has_governance

        # Determine level
        if overall_score >= 90 and csdm_layers >= 4 and has_autonomous:
            level = 5
        elif overall_score >= 75 and has_governance and coverage_pct >= 80:
            level = 4
        elif overall_score >= 55 and csdm_layers >= 2 and coverage_pct >= 60:
            level = 3
        elif overall_score >= 30 and has_discovery:
            level = 2
        else:
            level = 1

        return level, MATURITY_LABELS[level]

    @staticmethod
    def _estimate_csdm_layers(csdm_score: int) -> int:
        """Estimate number of populated CSDM layers from CSDM compliance score."""
        if csdm_score >= 90:
            return 4
        if csdm_score >= 65:
            return 3
        if csdm_score >= 40:
            return 2
        if csdm_score >= 15:
            return 1
        return 0

    @staticmethod
    def _has_automated_governance(findings: list[FindingResponse], overall_score: int) -> bool:
        """Check for indicators of automated CMDB governance."""
        # If score is high and few critical/high findings, governance is likely active
        critical_high = sum(
            1 for f in findings if f.severity.value in ("critical", "high")
        )
        return overall_score >= 75 and critical_high <= 5
