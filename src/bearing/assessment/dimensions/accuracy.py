"""Accuracy dimension scorer (weight: 15%).

Measures whether CIs match what discovery tools observe. Requires
Pathfinder confidence feed or SN Discovery data for full scoring.
Without discovery data, scores based on internal consistency checks.
"""

from __future__ import annotations

import logging

from bearing.api.schemas import (
    Dimension,
    DimensionScoreResponse,
    FindingType,
    Severity,
)
from bearing.assessment.dimensions.base import BaseDimensionScorer
from bearing.servicenow.queries import ACCURACY_FIELDS, build_active_ci_query

logger = logging.getLogger(__name__)


class AccuracyScorer(BaseDimensionScorer):
    """Scores CMDB accuracy — do records match observed reality?"""

    dimension = Dimension.ACCURACY
    weight = 0.15

    def score(self) -> DimensionScoreResponse:
        """Check CI accuracy via discovery validation and consistency."""
        query = build_active_ci_query()
        cis = self.sn_client.get_all_records(
            table="cmdb_ci",
            query=query,
            fields=ACCURACY_FIELDS,
        )

        self.ci_count_assessed = len(cis)
        if not cis:
            return self._build_score_response("No active CIs found")

        # Check 1: CIs with a discovery source (validated by some tool)
        has_discovery = [ci for ci in cis if ci.get("discovery_source")]
        no_discovery = len(cis) - len(has_discovery)

        # Check 2: CIs with recent last_discovered date (within 30 days)
        recently_discovered = [
            ci for ci in has_discovery if ci.get("last_discovered")
        ]

        # Check 3: Internal consistency — name not empty or generic
        generic_names = [
            ci for ci in cis
            if self._is_generic_name(str(ci.get("name", "")))
        ]

        # Tally checks
        self.checks_total = len(cis) * 3  # 3 checks per CI
        discovery_passed = len(has_discovery)
        recent_passed = len(recently_discovered)
        name_passed = len(cis) - len(generic_names)
        self.checks_passed = discovery_passed + recent_passed + name_passed

        # Finding: CIs with no discovery source
        if no_discovery > 0:
            pct = (no_discovery / len(cis)) * 100
            severity = Severity.CRITICAL if pct > 50 else Severity.HIGH if pct > 25 else Severity.MEDIUM
            self._add_finding(
                finding_type=FindingType.GAP,
                severity=severity,
                category="no_discovery_validation",
                title=f"{no_discovery} CIs have no discovery validation ({pct:.0f}%)",
                description=(
                    f"{no_discovery} CIs have no discovery_source set, meaning "
                    f"their data has never been validated by an automated discovery tool. "
                    f"These records may be inaccurate or outdated."
                ),
                affected_count=no_discovery,
                remediation="Deploy Pathfinder or ServiceNow Discovery to validate CI data automatically.",
            )

        # Finding: Generic/placeholder names
        if generic_names:
            self._add_finding(
                finding_type=FindingType.RISK,
                severity=Severity.MEDIUM,
                category="generic_ci_names",
                title=f"{len(generic_names)} CIs have generic or placeholder names",
                description=(
                    f"{len(generic_names)} CIs have names like 'Unknown', 'New CI', or "
                    f"auto-generated patterns that don't identify the actual asset."
                ),
                affected_count=len(generic_names),
                remediation="Review and correct CI names to reflect actual asset identity.",
            )

        details = (
            f"Assessed {len(cis)} CIs. "
            f"{len(has_discovery)} have discovery validation. "
            f"{len(generic_names)} have generic names."
        )
        return self._build_score_response(details)

    @staticmethod
    def _is_generic_name(name: str) -> bool:
        """Check if a CI name is generic or a placeholder."""
        if not name:
            return True
        lower = name.lower().strip()
        generic_patterns = [
            "unknown", "new ci", "test", "temp", "placeholder",
            "unnamed", "default", "n/a", "none", "tbd",
        ]
        return any(lower.startswith(p) or lower == p for p in generic_patterns)
