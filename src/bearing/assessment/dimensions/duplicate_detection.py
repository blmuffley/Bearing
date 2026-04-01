"""Duplicate Detection dimension scorer (weight: 5%).

Identifies potential duplicate CIs based on name similarity,
IP address overlap, and serial number matches.
"""

from __future__ import annotations

import logging
from collections import defaultdict

from bearing.api.schemas import (
    Dimension,
    DimensionScoreResponse,
    FindingType,
    Severity,
)
from bearing.assessment.dimensions.base import BaseDimensionScorer
from bearing.servicenow.queries import build_active_ci_query

logger = logging.getLogger(__name__)


class DuplicateDetectionScorer(BaseDimensionScorer):
    """Scores CMDB duplicate prevalence."""

    dimension = Dimension.DUPLICATES
    weight = 0.05

    def score(self) -> DimensionScoreResponse:
        """Detect potential duplicate CIs."""
        query = build_active_ci_query()
        cis = self.sn_client.get_all_records(
            table="cmdb_ci",
            query=query,
            fields=["sys_id", "name", "ip_address", "serial_number", "sys_class_name"],
        )

        self.ci_count_assessed = len(cis)
        if not cis:
            return self._build_score_response("No active CIs found")

        duplicate_count = 0

        # Check 1: IP address duplicates (same IP on multiple CIs)
        ip_map: dict[str, list[str]] = defaultdict(list)
        for ci in cis:
            ip = str(ci.get("ip_address", "")).strip()
            if ip and ip != "0.0.0.0":
                ip_map[ip].append(str(ci.get("sys_id", "")))

        ip_duplicates = {ip: ids for ip, ids in ip_map.items() if len(ids) > 1}
        ip_dup_ci_count = sum(len(ids) for ids in ip_duplicates.values())

        if ip_duplicates:
            duplicate_count += ip_dup_ci_count
            self._add_finding(
                finding_type=FindingType.RISK,
                severity=Severity.HIGH,
                category="duplicate_ip_address",
                title=f"{len(ip_duplicates)} IP addresses shared by multiple CIs ({ip_dup_ci_count} CIs)",
                description=(
                    f"{len(ip_duplicates)} IP addresses are assigned to more than one CI, "
                    f"affecting {ip_dup_ci_count} CIs total. This indicates potential "
                    f"duplicates or stale records that could cause incorrect reporting."
                ),
                affected_count=ip_dup_ci_count,
                remediation="Review CIs sharing IP addresses. Merge duplicates or update stale records.",
            )

        # Check 2: Serial number duplicates
        serial_map: dict[str, list[str]] = defaultdict(list)
        for ci in cis:
            serial = str(ci.get("serial_number", "")).strip()
            if serial and serial.lower() not in ("", "n/a", "none", "unknown"):
                serial_map[serial].append(str(ci.get("sys_id", "")))

        serial_duplicates = {s: ids for s, ids in serial_map.items() if len(ids) > 1}
        serial_dup_ci_count = sum(len(ids) for ids in serial_duplicates.values())

        if serial_duplicates:
            duplicate_count += serial_dup_ci_count
            self._add_finding(
                finding_type=FindingType.RISK,
                severity=Severity.HIGH,
                category="duplicate_serial_number",
                title=f"{len(serial_duplicates)} serial numbers shared by multiple CIs ({serial_dup_ci_count} CIs)",
                description=(
                    f"{len(serial_duplicates)} serial numbers appear on more than one CI. "
                    f"Serial numbers should be unique per physical asset."
                ),
                affected_count=serial_dup_ci_count,
                remediation="Merge duplicate CIs sharing serial numbers. Correct data entry errors.",
            )

        # Check 3: Exact name duplicates within same class
        name_class_map: dict[tuple[str, str], list[str]] = defaultdict(list)
        for ci in cis:
            name = str(ci.get("name", "")).strip().lower()
            cls = str(ci.get("sys_class_name", ""))
            if name:
                name_class_map[(name, cls)].append(str(ci.get("sys_id", "")))

        name_duplicates = {k: ids for k, ids in name_class_map.items() if len(ids) > 1}
        name_dup_ci_count = sum(len(ids) for ids in name_duplicates.values())

        if name_duplicates:
            duplicate_count += name_dup_ci_count
            self._add_finding(
                finding_type=FindingType.RISK,
                severity=Severity.MEDIUM,
                category="duplicate_name_class",
                title=f"{len(name_duplicates)} duplicate name+class combinations ({name_dup_ci_count} CIs)",
                description=(
                    f"{len(name_duplicates)} CIs share the exact same name and class, "
                    f"suggesting duplicates or naming convention issues."
                ),
                affected_count=name_dup_ci_count,
                remediation="Review CIs with identical names. Merge true duplicates and standardize naming.",
            )

        # Score: percentage of CIs that are NOT potential duplicates
        unique_cis = len(cis) - min(duplicate_count, len(cis))
        self.checks_total = len(cis)
        self.checks_passed = unique_cis

        details = (
            f"Assessed {len(cis)} CIs. "
            f"IP duplicates: {len(ip_duplicates)} groups ({ip_dup_ci_count} CIs). "
            f"Serial duplicates: {len(serial_duplicates)} groups ({serial_dup_ci_count} CIs). "
            f"Name+class duplicates: {len(name_duplicates)} groups ({name_dup_ci_count} CIs)."
        )
        return self._build_score_response(details)
