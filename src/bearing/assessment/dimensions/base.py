"""Base dimension scorer interface."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod

from bearing.api.schemas import (
    Dimension,
    DimensionScoreResponse,
    FindingResponse,
    FindingType,
    FusionSource,
    Severity,
)
from bearing.servicenow.client import ServiceNowClient


class BaseDimensionScorer(ABC):
    """Abstract base class for all dimension scorers.

    Each dimension scorer queries ServiceNow CMDB tables, evaluates
    quality checks, produces a 0-100 score, and generates findings.
    """

    dimension: Dimension
    weight: float

    def __init__(self, sn_client: ServiceNowClient) -> None:
        self.sn_client = sn_client
        self._findings: list[FindingResponse] = []
        self.checks_passed = 0
        self.checks_total = 0
        self.ci_count_assessed = 0

    @abstractmethod
    def score(self) -> DimensionScoreResponse:
        """Run all checks for this dimension and return a score.

        Returns:
            DimensionScoreResponse with score 0-100.
        """
        ...

    def get_findings(self) -> list[FindingResponse]:
        """Get all findings generated during scoring."""
        return self._findings

    def _add_finding(
        self,
        finding_type: FindingType,
        severity: Severity,
        category: str,
        title: str,
        description: str,
        affected_ci_class: str = "",
        affected_count: int = 1,
        remediation: str = "",
        estimated_effort_hours: float = 0.0,
        estimated_cost: float = 0.0,
    ) -> None:
        """Add a finding to the results."""
        self._findings.append(
            FindingResponse(
                finding_id=str(uuid.uuid4()),
                finding_type=finding_type,
                severity=severity,
                dimension=self.dimension,
                category=category,
                title=title,
                description=description,
                affected_ci_class=affected_ci_class,
                affected_count=affected_count,
                remediation=remediation,
                estimated_effort_hours=estimated_effort_hours,
                estimated_cost=estimated_cost,
                fusion_source=FusionSource.CMDB_ONLY,
            )
        )

    def _build_score_response(self, details: str = "") -> DimensionScoreResponse:
        """Build the score response from accumulated check results."""
        score = round((self.checks_passed / self.checks_total) * 100) if self.checks_total > 0 else 0
        return DimensionScoreResponse(
            dimension=self.dimension,
            score=score,
            weight=self.weight,
            checks_passed=self.checks_passed,
            checks_total=self.checks_total,
            details=details,
        )
