"""Shared test fixtures for Bearing tests."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from bearing.api.schemas import (
    AssessmentResponse,
    AssessmentScope,
    AssessmentStatus,
    Dimension,
    DimensionScoreResponse,
    FindingResponse,
    FindingType,
    FusionSource,
    Severity,
    TriggeredBy,
)
from bearing.config import Settings
from bearing.servicenow.client import ServiceNowClient


@pytest.fixture
def mock_settings(monkeypatch: pytest.MonkeyPatch) -> Settings:
    """Settings with test values."""
    monkeypatch.setenv("BEARING_SN_INSTANCE", "https://test.service-now.com")
    monkeypatch.setenv("BEARING_SN_USERNAME", "admin")
    monkeypatch.setenv("BEARING_SN_PASSWORD", "password")
    monkeypatch.setenv("BEARING_API_KEY", "test-api-key")
    return Settings()


@pytest.fixture
def mock_sn_client(mock_settings: Settings) -> MagicMock:
    """Mocked ServiceNow client."""
    client = MagicMock(spec=ServiceNowClient)
    return client


@pytest.fixture
def sample_cis() -> list[dict[str, object]]:
    """Sample CI records for testing."""
    return [
        {
            "sys_id": "ci001",
            "name": "web-server-01",
            "sys_class_name": "cmdb_ci_linux_server",
            "ip_address": "10.0.1.10",
            "owned_by": "user001",
            "support_group": "Linux Team",
            "environment": "Production",
            "operational_status": "1",
            "sys_updated_on": "2026-03-15T10:00:00Z",
            "discovery_source": "ServiceNow",
            "last_discovered": "2026-03-15T10:00:00Z",
        },
        {
            "sys_id": "ci002",
            "name": "db-server-01",
            "sys_class_name": "cmdb_ci_linux_server",
            "ip_address": "10.0.1.20",
            "owned_by": "",
            "support_group": "",
            "environment": "Production",
            "operational_status": "1",
            "sys_updated_on": "2025-06-01T10:00:00Z",
            "discovery_source": "",
            "last_discovered": "",
        },
        {
            "sys_id": "ci003",
            "name": "",
            "sys_class_name": "cmdb_ci",
            "ip_address": "",
            "owned_by": "",
            "support_group": "",
            "environment": "",
            "operational_status": "1",
            "sys_updated_on": "",
            "discovery_source": "",
            "last_discovered": "",
        },
    ]


@pytest.fixture
def sample_assessment() -> AssessmentResponse:
    """Sample assessment response."""
    return AssessmentResponse(
        assessment_id="test-assessment-001",
        name="Test Assessment",
        scope=AssessmentScope.FULL,
        overall_score=42,
        grade="D",
        maturity_level=2,
        maturity_label="Managed",
        findings_count=15,
        critical_findings=3,
        technical_debt_estimate=250000.0,
        ci_count_assessed=1000,
        status=AssessmentStatus.COMPLETED,
        triggered_by=TriggeredBy.MANUAL,
    )


@pytest.fixture
def sample_dimension_scores() -> list[DimensionScoreResponse]:
    """Sample dimension scores."""
    return [
        DimensionScoreResponse(dimension=Dimension.COMPLETENESS, score=55, weight=0.20, checks_passed=550, checks_total=1000),
        DimensionScoreResponse(dimension=Dimension.ACCURACY, score=25, weight=0.15, checks_passed=250, checks_total=1000),
        DimensionScoreResponse(dimension=Dimension.CURRENCY, score=40, weight=0.15, checks_passed=400, checks_total=1000),
        DimensionScoreResponse(dimension=Dimension.RELATIONSHIPS, score=35, weight=0.15, checks_passed=350, checks_total=1000),
        DimensionScoreResponse(dimension=Dimension.CSDM, score=15, weight=0.10, checks_passed=150, checks_total=1000),
        DimensionScoreResponse(dimension=Dimension.CLASSIFICATION, score=60, weight=0.10, checks_passed=600, checks_total=1000),
        DimensionScoreResponse(dimension=Dimension.ORPHANS, score=45, weight=0.10, checks_passed=450, checks_total=1000),
        DimensionScoreResponse(dimension=Dimension.DUPLICATES, score=70, weight=0.05, checks_passed=700, checks_total=1000),
    ]


@pytest.fixture
def sample_findings() -> list[FindingResponse]:
    """Sample findings."""
    return [
        FindingResponse(
            finding_id="f001",
            finding_type=FindingType.GAP,
            severity=Severity.CRITICAL,
            dimension=Dimension.COMPLETENESS,
            category="missing_owner",
            title="500 CIs missing 'owned_by' field",
            description="500 of 1000 CIs do not have an owner assigned.",
            affected_count=500,
            remediation="Assign owners to all CIs.",
            fusion_source=FusionSource.CMDB_ONLY,
        ),
        FindingResponse(
            finding_id="f002",
            finding_type=FindingType.RISK,
            severity=Severity.HIGH,
            dimension=Dimension.CURRENCY,
            category="stale_ci_90_180",
            title="200 CIs not updated in 90-180 days",
            description="200 CIs are significantly stale.",
            affected_count=200,
            fusion_source=FusionSource.CMDB_ONLY,
        ),
    ]
