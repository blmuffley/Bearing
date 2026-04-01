"""Orphan Analysis dimension scorer (weight: 10%).

Identifies CIs with zero relationships -- no parents, children, or dependencies.
These are invisible to service impact analysis.
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
from bearing.servicenow.queries import build_active_ci_query

logger = logging.getLogger(__name__)


class OrphanAnalysisScorer(BaseDimensionScorer):
    """Scores the extent of orphaned CIs in the CMDB."""

    dimension = Dimension.ORPHANS
    weight = 0.10

    def score(self) -> DimensionScoreResponse:
        """Identify CIs with no relationships."""
        # Get all active CI sys_ids
        ci_query = build_active_ci_query()
        cis = self.sn_client.get_all_records(
            table="cmdb_ci",
            query=ci_query,
            fields=["sys_id", "sys_class_name"],
        )
        ci_sys_ids = {str(ci.get("sys_id", "")) for ci in cis}

        self.ci_count_assessed = len(cis)
        if not cis:
            return self._build_score_response("No active CIs found")

        # Get all relationship endpoints
        relationships = self.sn_client.get_all_records(
            table="cmdb_rel_ci",
            fields=["parent", "child"],
        )

        connected: set[str] = set()
        for rel in relationships:
            parent = str(rel.get("parent", {}).get("value", "") if isinstance(rel.get("parent"), dict) else rel.get("parent", ""))
            child = str(rel.get("child", {}).get("value", "") if isinstance(rel.get("child"), dict) else rel.get("child", ""))
            connected.add(parent)
            connected.add(child)

        # Find orphans (active CIs not in any relationship)
        orphans = ci_sys_ids - connected
        orphan_count = len(orphans)

        self.checks_total = len(cis)
        self.checks_passed = len(cis) - orphan_count

        # Categorize orphans by class
        orphan_by_class: dict[str, int] = {}
        for ci in cis:
            if str(ci.get("sys_id", "")) in orphans:
                cls = str(ci.get("sys_class_name", "cmdb_ci"))
                orphan_by_class[cls] = orphan_by_class.get(cls, 0) + 1

        if orphan_count > 0:
            pct = (orphan_count / len(cis)) * 100
            severity = Severity.CRITICAL if pct > 40 else Severity.HIGH if pct > 20 else Severity.MEDIUM

            # Top orphan classes for the description
            top_classes = sorted(orphan_by_class.items(), key=lambda x: x[1], reverse=True)[:5]
            class_detail = ", ".join(f"{cls}: {count}" for cls, count in top_classes)

            self._add_finding(
                finding_type=FindingType.RISK,
                severity=severity,
                category="orphaned_cis",
                title=f"{orphan_count} orphaned CIs with zero relationships ({pct:.0f}%)",
                description=(
                    f"{orphan_count} of {len(cis)} active CIs ({pct:.1f}%) have no "
                    f"relationships in cmdb_rel_ci. These CIs are invisible to service "
                    f"impact analysis — any incident affecting them cannot be correlated "
                    f"to business services. Top classes: {class_detail}"
                ),
                affected_count=orphan_count,
                remediation=(
                    "Deploy Pathfinder to automatically discover relationships through "
                    "network traffic observation. For critical assets, manually map "
                    "dependencies to business services."
                ),
            )

        details = (
            f"Assessed {len(cis)} CIs. {orphan_count} orphans found "
            f"across {len(orphan_by_class)} classes."
        )
        return self._build_score_response(details)
