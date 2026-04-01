"""Currency dimension scorer (weight: 15%).

Measures how stale CMDB data is -- CIs not updated in 90+ days are flagged.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from bearing.api.schemas import (
    Dimension,
    DimensionScoreResponse,
    FindingType,
    Severity,
)
from bearing.assessment.dimensions.base import BaseDimensionScorer
from bearing.servicenow.queries import CURRENCY_FIELDS, build_active_ci_query

logger = logging.getLogger(__name__)

# Staleness thresholds in days
THRESHOLD_CRITICAL = 180
THRESHOLD_HIGH = 90
THRESHOLD_MEDIUM = 60
THRESHOLD_LOW = 30


class CurrencyScorer(BaseDimensionScorer):
    """Scores CMDB currency — how up-to-date is the data?"""

    dimension = Dimension.CURRENCY
    weight = 0.15

    def score(self) -> DimensionScoreResponse:
        """Check data freshness across all active CIs."""
        query = build_active_ci_query()
        cis = self.sn_client.get_all_records(
            table="cmdb_ci",
            query=query,
            fields=CURRENCY_FIELDS,
        )

        self.ci_count_assessed = len(cis)
        if not cis:
            return self._build_score_response("No active CIs found")

        now = datetime.now(timezone.utc)
        stale_buckets = {"critical": 0, "high": 0, "medium": 0, "low": 0, "current": 0}

        for ci in cis:
            updated = ci.get("sys_updated_on", "")
            if not updated:
                stale_buckets["critical"] += 1
                continue

            try:
                updated_dt = datetime.fromisoformat(str(updated).replace(" ", "T"))
                if updated_dt.tzinfo is None:
                    updated_dt = updated_dt.replace(tzinfo=timezone.utc)
                days_old = (now - updated_dt).days
            except (ValueError, TypeError):
                stale_buckets["critical"] += 1
                continue

            if days_old >= THRESHOLD_CRITICAL:
                stale_buckets["critical"] += 1
            elif days_old >= THRESHOLD_HIGH:
                stale_buckets["high"] += 1
            elif days_old >= THRESHOLD_MEDIUM:
                stale_buckets["medium"] += 1
            elif days_old >= THRESHOLD_LOW:
                stale_buckets["low"] += 1
            else:
                stale_buckets["current"] += 1

        # Score: percentage of CIs that are current or only slightly stale
        self.checks_total = len(cis)
        self.checks_passed = stale_buckets["current"] + stale_buckets["low"]

        # Generate findings for stale buckets
        if stale_buckets["critical"] > 0:
            self._add_finding(
                finding_type=FindingType.RISK,
                severity=Severity.CRITICAL,
                category="stale_ci_180_plus",
                title=f"{stale_buckets['critical']} CIs not updated in 180+ days",
                description=(
                    f"{stale_buckets['critical']} CIs have not been updated in over 180 days. "
                    f"These records are likely inaccurate and should be validated or retired."
                ),
                affected_count=stale_buckets["critical"],
                remediation="Validate these CIs against current infrastructure. Retire or archive CIs for decommissioned assets.",
            )

        if stale_buckets["high"] > 0:
            self._add_finding(
                finding_type=FindingType.RISK,
                severity=Severity.HIGH,
                category="stale_ci_90_180",
                title=f"{stale_buckets['high']} CIs not updated in 90-180 days",
                description=(
                    f"{stale_buckets['high']} CIs have not been updated in 90-180 days. "
                    f"Data quality degrades significantly at this staleness level."
                ),
                affected_count=stale_buckets["high"],
                remediation="Enable automated discovery to keep CI data current. Deploy Pathfinder for continuous observation.",
            )

        if stale_buckets["medium"] > 0:
            self._add_finding(
                finding_type=FindingType.GAP,
                severity=Severity.MEDIUM,
                category="stale_ci_60_90",
                title=f"{stale_buckets['medium']} CIs not updated in 60-90 days",
                description=(
                    f"{stale_buckets['medium']} CIs are approaching staleness with "
                    f"no updates in 60-90 days."
                ),
                affected_count=stale_buckets["medium"],
                remediation="Increase discovery frequency or implement scheduled CI validation.",
            )

        details = (
            f"Assessed {len(cis)} CIs. "
            f"Current (<30d): {stale_buckets['current']}, "
            f"Aging (30-60d): {stale_buckets['low']}, "
            f"Stale (60-90d): {stale_buckets['medium']}, "
            f"Very stale (90-180d): {stale_buckets['high']}, "
            f"Critical (180d+): {stale_buckets['critical']}"
        )
        return self._build_score_response(details)
