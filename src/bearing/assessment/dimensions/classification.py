"""Classification Quality dimension scorer (weight: 10%).

Measures whether CIs are in the correct classes -- servers classified
as generic cmdb_ci instead of specific subclasses like cmdb_ci_linux_server.
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
from bearing.servicenow.queries import CLASSIFICATION_FIELDS, build_active_ci_query

logger = logging.getLogger(__name__)

# Generic classes that should usually have more specific subclasses
GENERIC_CLASSES = {
    "cmdb_ci",
    "cmdb_ci_computer",
    "cmdb_ci_hardware",
    "cmdb_ci_server",  # should be linux/win/unix
}

# Expected specific subclasses
SPECIFIC_SERVER_CLASSES = {
    "cmdb_ci_linux_server",
    "cmdb_ci_win_server",
    "cmdb_ci_unix_server",
    "cmdb_ci_esx_server",
    "cmdb_ci_solaris_server",
    "cmdb_ci_aix_server",
    "cmdb_ci_hpux_server",
}


class ClassificationScorer(BaseDimensionScorer):
    """Scores CI classification quality — are CIs in the right classes?"""

    dimension = Dimension.CLASSIFICATION
    weight = 0.10

    def score(self) -> DimensionScoreResponse:
        """Check CI classification quality across active CIs."""
        query = build_active_ci_query()
        cis = self.sn_client.get_all_records(
            table="cmdb_ci",
            query=query,
            fields=CLASSIFICATION_FIELDS,
        )

        self.ci_count_assessed = len(cis)
        if not cis:
            return self._build_score_response("No active CIs found")

        # Count CIs in overly generic classes
        generic_count = 0
        base_cmdb_ci_count = 0
        class_distribution: dict[str, int] = {}

        for ci in cis:
            cls = str(ci.get("sys_class_name", "cmdb_ci"))
            class_distribution[cls] = class_distribution.get(cls, 0) + 1

            if cls in GENERIC_CLASSES:
                generic_count += 1
            if cls == "cmdb_ci":
                base_cmdb_ci_count += 1

        self.checks_total = len(cis)
        self.checks_passed = len(cis) - generic_count

        # Finding: CIs using base cmdb_ci class
        if base_cmdb_ci_count > 0:
            pct = (base_cmdb_ci_count / len(cis)) * 100
            severity = Severity.HIGH if pct > 10 else Severity.MEDIUM
            self._add_finding(
                finding_type=FindingType.RISK,
                severity=severity,
                category="base_class_ci",
                title=f"{base_cmdb_ci_count} CIs classified as base 'cmdb_ci' ({pct:.0f}%)",
                description=(
                    f"{base_cmdb_ci_count} CIs use the generic base class 'cmdb_ci' "
                    f"instead of a specific subclass. These CIs lack class-specific "
                    f"attributes and cannot be properly managed."
                ),
                affected_count=base_cmdb_ci_count,
                remediation=(
                    "Reclassify CIs to their correct subclass. Deploy Pathfinder for "
                    "behavioral classification that suggests correct CI classes."
                ),
            )

        # Finding: Servers using generic server class
        generic_servers = class_distribution.get("cmdb_ci_server", 0)
        if generic_servers > 0:
            self._add_finding(
                finding_type=FindingType.GAP,
                severity=Severity.MEDIUM,
                category="generic_server_class",
                title=f"{generic_servers} servers classified as generic 'cmdb_ci_server'",
                description=(
                    f"{generic_servers} servers use the generic server class instead of "
                    f"OS-specific classes (linux_server, win_server, etc.). "
                    f"This limits OS-specific reporting and management."
                ),
                affected_count=generic_servers,
                remediation="Reclassify servers to OS-specific subclasses based on discovery data.",
            )

        details = (
            f"Assessed {len(cis)} CIs across {len(class_distribution)} classes. "
            f"{generic_count} in generic classes, {base_cmdb_ci_count} in base cmdb_ci."
        )
        return self._build_score_response(details)
