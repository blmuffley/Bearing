"""Completeness dimension scorer (weight: 20%).

Measures what percentage of CIs have required fields populated:
name, class, IP, owner, support group, environment.
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
from bearing.servicenow.queries import COMPLETENESS_FIELDS, build_active_ci_query

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = ["name", "sys_class_name", "ip_address", "owned_by", "support_group", "environment"]


class CompletenessScorer(BaseDimensionScorer):
    """Scores CMDB completeness — are required fields populated?"""

    dimension = Dimension.COMPLETENESS
    weight = 0.20

    def score(self) -> DimensionScoreResponse:
        """Check required field population across all active CIs."""
        query = build_active_ci_query()
        cis = self.sn_client.get_all_records(
            table="cmdb_ci",
            query=query,
            fields=COMPLETENESS_FIELDS,
        )

        self.ci_count_assessed = len(cis)
        if not cis:
            return self._build_score_response("No active CIs found")

        # Check each CI for required field population
        missing_by_field: dict[str, int] = {f: 0 for f in REQUIRED_FIELDS}
        cis_with_all_fields = 0

        for ci in cis:
            all_populated = True
            for field_name in REQUIRED_FIELDS:
                value = ci.get(field_name, "")
                if not value or value == "":
                    missing_by_field[field_name] += 1
                    all_populated = False
            if all_populated:
                cis_with_all_fields += 1

        self.checks_total = len(cis) * len(REQUIRED_FIELDS)
        self.checks_passed = self.checks_total - sum(missing_by_field.values())

        # Generate findings for fields with significant gaps
        for field_name, missing_count in missing_by_field.items():
            if missing_count == 0:
                continue

            pct_missing = (missing_count / len(cis)) * 100

            if pct_missing > 50:
                severity = Severity.CRITICAL
            elif pct_missing > 25:
                severity = Severity.HIGH
            elif pct_missing > 10:
                severity = Severity.MEDIUM
            else:
                severity = Severity.LOW

            self._add_finding(
                finding_type=FindingType.GAP,
                severity=severity,
                category=f"missing_{field_name}",
                title=f"{missing_count} CIs missing '{field_name}' field ({pct_missing:.0f}%)",
                description=(
                    f"{missing_count} of {len(cis)} active CIs ({pct_missing:.1f}%) "
                    f"do not have the '{field_name}' field populated. "
                    f"This field is required for accurate CMDB reporting and governance."
                ),
                affected_count=missing_count,
                remediation=f"Populate the '{field_name}' field on affected CIs via discovery tool or manual update.",
                estimated_effort_hours=missing_count * 0.25,
            )

        details = (
            f"Assessed {len(cis)} CIs. "
            f"{cis_with_all_fields} ({cis_with_all_fields/len(cis)*100:.0f}%) have all required fields. "
            f"Fields checked: {', '.join(REQUIRED_FIELDS)}"
        )
        return self._build_score_response(details)
