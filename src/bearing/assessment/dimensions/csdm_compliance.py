"""CSDM Compliance dimension scorer (weight: 10%).

Measures which CSDM layers are populated (Business Service, Business App,
Technical Service, Infrastructure) and what percentage of infrastructure
CIs map up to a business service.
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

logger = logging.getLogger(__name__)

CSDM_LAYERS = [
    ("Business Service", "cmdb_ci_service", "operational_status=1"),
    ("Business Application", "cmdb_ci_business_app", "operational_status=1"),
    ("Technical Service", "cmdb_ci_service_auto", "operational_status=1"),
    ("Infrastructure", "cmdb_ci_server", "operational_status=1^ORoperational_status=6"),
]


class CSDMComplianceScorer(BaseDimensionScorer):
    """Scores CSDM framework adoption and compliance."""

    dimension = Dimension.CSDM
    weight = 0.10

    def score(self) -> DimensionScoreResponse:
        """Check CSDM layer population and infrastructure-to-service mapping."""
        layer_counts: dict[str, int] = {}
        populated_layers = 0

        # Check each CSDM layer
        for layer_name, table, query in CSDM_LAYERS:
            try:
                count = self.sn_client.get_record_count(table, query)
                layer_counts[layer_name] = count
                if count > 0:
                    populated_layers += 1
            except Exception:
                logger.warning("Could not query CSDM layer: %s (%s)", layer_name, table)
                layer_counts[layer_name] = 0

        # Check infrastructure-to-service mapping via svc_ci_assoc
        infra_count = layer_counts.get("Infrastructure", 0)
        mapped_count = 0
        if infra_count > 0:
            try:
                mapped_count = self.sn_client.get_record_count("svc_ci_assoc")
            except Exception:
                logger.warning("Could not query svc_ci_assoc")

        # Score calculation: layers populated + mapping coverage
        self.checks_total = len(CSDM_LAYERS) + (1 if infra_count > 0 else 0)
        self.checks_passed = populated_layers
        if infra_count > 0:
            mapping_ratio = min(1.0, mapped_count / infra_count)
            if mapping_ratio > 0.5:
                self.checks_passed += 1

        self.ci_count_assessed = sum(layer_counts.values())

        # Generate findings for missing layers
        for layer_name, count in layer_counts.items():
            if count == 0:
                self._add_finding(
                    finding_type=FindingType.GAP,
                    severity=Severity.HIGH if layer_name == "Business Service" else Severity.MEDIUM,
                    category=f"csdm_missing_{layer_name.lower().replace(' ', '_')}",
                    title=f"CSDM layer '{layer_name}' is not populated",
                    description=(
                        f"The {layer_name} layer of the CSDM framework has zero records. "
                        f"Without this layer, service-oriented CMDB management cannot function properly."
                    ),
                    affected_count=1,
                    remediation=f"Populate the {layer_name} layer. Deploy Contour for automated service model building.",
                )

        # Finding: low infrastructure-to-service mapping
        if infra_count > 0 and mapped_count < infra_count * 0.5:
            unmapped = infra_count - mapped_count
            self._add_finding(
                finding_type=FindingType.GAP,
                severity=Severity.HIGH,
                category="csdm_unmapped_infrastructure",
                title=f"{unmapped} infrastructure CIs not mapped to a service",
                description=(
                    f"{unmapped} of {infra_count} infrastructure CIs are not associated "
                    f"with any business service. These assets are invisible to service impact analysis."
                ),
                affected_count=unmapped,
                remediation="Map infrastructure CIs to business services using svc_ci_assoc. Deploy Contour for automated CSDM mapping.",
            )

        details = (
            f"CSDM layers populated: {populated_layers}/{len(CSDM_LAYERS)}. "
            + ", ".join(f"{name}: {count}" for name, count in layer_counts.items())
        )
        return self._build_score_response(details)
