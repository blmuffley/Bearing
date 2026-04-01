"""Relationships dimension scorer (weight: 15%).

Measures whether service dependencies are mapped -- percentage of CIs
with at least one relationship, bidirectional relationship coverage.
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
from bearing.servicenow.queries import RELATIONSHIP_FIELDS, build_active_ci_query

logger = logging.getLogger(__name__)


class RelationshipsScorer(BaseDimensionScorer):
    """Scores CMDB relationship coverage and quality."""

    dimension = Dimension.RELATIONSHIPS
    weight = 0.15

    def score(self) -> DimensionScoreResponse:
        """Check relationship coverage across active CIs."""
        # Get all active CIs
        ci_query = build_active_ci_query()
        cis = self.sn_client.get_all_records(
            table="cmdb_ci",
            query=ci_query,
            fields=["sys_id"],
        )
        ci_sys_ids = {str(ci.get("sys_id", "")) for ci in cis}

        self.ci_count_assessed = len(cis)
        if not cis:
            return self._build_score_response("No active CIs found")

        # Get all relationships
        relationships = self.sn_client.get_all_records(
            table="cmdb_rel_ci",
            fields=RELATIONSHIP_FIELDS,
        )

        # Find CIs that appear in at least one relationship
        cis_with_rel: set[str] = set()
        for rel in relationships:
            parent = str(rel.get("parent", {}).get("value", "") if isinstance(rel.get("parent"), dict) else rel.get("parent", ""))
            child = str(rel.get("child", {}).get("value", "") if isinstance(rel.get("child"), dict) else rel.get("child", ""))
            if parent in ci_sys_ids:
                cis_with_rel.add(parent)
            if child in ci_sys_ids:
                cis_with_rel.add(child)

        cis_without_rel = len(ci_sys_ids) - len(cis_with_rel)

        # Score: percentage with at least one relationship
        self.checks_total = len(cis)
        self.checks_passed = len(cis_with_rel)

        # Finding: CIs with no relationships
        if cis_without_rel > 0:
            pct = (cis_without_rel / len(cis)) * 100
            severity = Severity.CRITICAL if pct > 50 else Severity.HIGH if pct > 25 else Severity.MEDIUM

            self._add_finding(
                finding_type=FindingType.GAP,
                severity=severity,
                category="no_relationships",
                title=f"{cis_without_rel} CIs have no service dependencies mapped ({pct:.0f}%)",
                description=(
                    f"{cis_without_rel} active CIs have zero relationships in cmdb_rel_ci. "
                    f"Without dependency mapping, service impact analysis during incidents "
                    f"will be incomplete and MTTR will be extended."
                ),
                affected_count=cis_without_rel,
                remediation=(
                    "Deploy Pathfinder to automatically discover service dependencies "
                    "through network traffic observation. Manually map critical application "
                    "dependencies for high-priority services."
                ),
            )

        details = (
            f"Assessed {len(cis)} CIs against {len(relationships)} relationships. "
            f"{len(cis_with_rel)} CIs have relationships, "
            f"{cis_without_rel} have none."
        )
        return self._build_score_response(details)
