"""Tests for the technical debt calculator."""

from __future__ import annotations

from bearing.api.schemas import Dimension, FindingResponse, FindingType, FusionSource, Severity
from bearing.assessment.debt import DebtParameters, TechnicalDebtCalculator


def test_completeness_cost() -> None:
    calc = TechnicalDebtCalculator()
    finding = FindingResponse(
        finding_id="f1",
        finding_type=FindingType.GAP,
        severity=Severity.HIGH,
        dimension=Dimension.COMPLETENESS,
        category="test",
        title="Test",
        description="Test",
        affected_count=100,
        fusion_source=FusionSource.CMDB_ONLY,
    )
    cost = calc.calculate([finding])
    # 100 * 2.0 * 150.0 = 30,000
    assert cost == 30_000.0


def test_orphans_cost() -> None:
    calc = TechnicalDebtCalculator()
    finding = FindingResponse(
        finding_id="f2",
        finding_type=FindingType.RISK,
        severity=Severity.HIGH,
        dimension=Dimension.ORPHANS,
        category="orphaned_cis",
        title="Test",
        description="Test",
        affected_count=50,
        fusion_source=FusionSource.CMDB_ONLY,
    )
    cost = calc.calculate([finding])
    # 50 * 5000.0 = 250,000
    assert cost == 250_000.0


def test_custom_parameters() -> None:
    params = DebtParameters(hourly_rate=200.0, avg_hours_to_map_manually=3.0)
    calc = TechnicalDebtCalculator(params)
    finding = FindingResponse(
        finding_id="f3",
        finding_type=FindingType.GAP,
        severity=Severity.MEDIUM,
        dimension=Dimension.COMPLETENESS,
        category="test",
        title="Test",
        description="Test",
        affected_count=10,
        fusion_source=FusionSource.CMDB_ONLY,
    )
    cost = calc.calculate([finding])
    # 10 * 3.0 * 200.0 = 6,000
    assert cost == 6_000.0


def test_by_dimension_breakdown() -> None:
    calc = TechnicalDebtCalculator()
    findings = [
        FindingResponse(
            finding_id="f4", finding_type=FindingType.GAP, severity=Severity.HIGH,
            dimension=Dimension.COMPLETENESS, category="a", title="A", description="A",
            affected_count=10, fusion_source=FusionSource.CMDB_ONLY,
        ),
        FindingResponse(
            finding_id="f5", finding_type=FindingType.GAP, severity=Severity.HIGH,
            dimension=Dimension.DUPLICATES, category="b", title="B", description="B",
            affected_count=20, fusion_source=FusionSource.CMDB_ONLY,
        ),
    ]
    breakdown = calc.calculate_by_dimension(findings)
    assert "completeness" in breakdown
    assert "duplicates" in breakdown
    assert breakdown["completeness"] == 10 * 2.0 * 150.0
    assert breakdown["duplicates"] == 20 * 1.5 * 150.0
