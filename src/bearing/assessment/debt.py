"""Technical debt calculator — translates CMDB gaps into dollar estimates."""

from __future__ import annotations

from dataclasses import dataclass

from bearing.api.schemas import Dimension, FindingResponse


@dataclass
class DebtParameters:
    """Customer-configurable cost parameters."""

    hourly_rate: float = 150.0
    avg_hours_to_map_manually: float = 2.0
    avg_additional_mttr_hours: float = 1.5
    incidents_per_year: int = 12
    risk_exposure_per_ci_per_year: float = 5000.0
    avg_hours_to_validate: float = 1.0
    avg_mapping_hours: float = 3.0
    avg_resolution_hours: float = 1.5


# Cost formulas per dimension
DIMENSION_COST_FORMULAS: dict[str, str] = {
    "completeness": "count * avg_hours_to_map_manually * hourly_rate",
    "accuracy": "count * avg_additional_mttr_hours * hourly_rate * incidents_per_year",
    "currency": "count * avg_hours_to_validate * hourly_rate",
    "relationships": "count * avg_additional_mttr_hours * hourly_rate * incidents_per_year",
    "csdm": "count * avg_mapping_hours * hourly_rate",
    "classification": "count * avg_hours_to_map_manually * hourly_rate",
    "orphans": "count * risk_exposure_per_ci_per_year",
    "duplicates": "count * avg_resolution_hours * hourly_rate",
}


class TechnicalDebtCalculator:
    """Calculates technical debt estimates from assessment findings."""

    def __init__(self, params: DebtParameters | None = None) -> None:
        self.params = params or DebtParameters()

    def calculate(self, findings: list[FindingResponse]) -> float:
        """Calculate total technical debt across all findings.

        Args:
            findings: All findings from the assessment.

        Returns:
            Total estimated technical debt in dollars.
        """
        total = 0.0
        for finding in findings:
            total += self._cost_for_finding(finding)
        return total

    def _cost_for_finding(self, finding: FindingResponse) -> float:
        """Calculate cost for a single finding based on its dimension."""
        count = finding.affected_count
        p = self.params

        dim = finding.dimension.value
        if dim == "completeness":
            return count * p.avg_hours_to_map_manually * p.hourly_rate
        elif dim == "accuracy":
            return count * p.avg_additional_mttr_hours * p.hourly_rate * p.incidents_per_year
        elif dim == "currency":
            return count * p.avg_hours_to_validate * p.hourly_rate
        elif dim == "relationships":
            return count * p.avg_additional_mttr_hours * p.hourly_rate * p.incidents_per_year
        elif dim == "csdm":
            return count * p.avg_mapping_hours * p.hourly_rate
        elif dim == "classification":
            return count * p.avg_hours_to_map_manually * p.hourly_rate
        elif dim == "orphans":
            return count * p.risk_exposure_per_ci_per_year
        elif dim == "duplicates":
            return count * p.avg_resolution_hours * p.hourly_rate
        else:
            return finding.estimated_cost

    def calculate_by_dimension(
        self, findings: list[FindingResponse]
    ) -> dict[str, float]:
        """Calculate debt broken down by dimension."""
        result: dict[str, float] = {}
        for finding in findings:
            dim = finding.dimension.value
            cost = self._cost_for_finding(finding)
            result[dim] = result.get(dim, 0.0) + cost
        return result
