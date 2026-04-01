"""Tests for fusion finding generation."""

from __future__ import annotations

from datetime import datetime, timezone

from bearing.api.schemas import (
    CIConfidenceRecord,
    BehavioralClassification,
    TrafficState,
)
from bearing.fusion.findings import FusionFindingGenerator
from bearing.fusion.pathfinder import ConfidenceStore


def test_no_findings_without_pathfinder_data() -> None:
    store = ConfidenceStore()
    generator = FusionFindingGenerator(store)
    findings = generator.generate([{"sys_id": "ci001"}])
    assert findings == []


def test_detect_shadow_it() -> None:
    store = ConfidenceStore()
    store.records["unknown_ci"] = CIConfidenceRecord(
        ci_sys_id="unknown_ci",
        ci_class="cmdb_ci_server",
        confidence_score=80,
        traffic_state=TrafficState.ACTIVE,
        last_observation=datetime.now(timezone.utc),
        observation_count=50,
    )

    generator = FusionFindingGenerator(store)
    cmdb_cis = [{"sys_id": "ci001"}]  # unknown_ci not in CMDB

    findings = generator.generate(cmdb_cis)
    shadow = [f for f in findings if f.category == "shadow_it"]
    assert len(shadow) == 1
    assert shadow[0].severity.value == "critical"


def test_detect_ghost_cis() -> None:
    store = ConfidenceStore()
    store.records["ci001"] = CIConfidenceRecord(
        ci_sys_id="ci001",
        ci_class="cmdb_ci_server",
        confidence_score=10,
        traffic_state=TrafficState.DEPRECATED,
        last_observation=datetime.now(timezone.utc),
        observation_count=0,
    )

    generator = FusionFindingGenerator(store)
    cmdb_cis = [{"sys_id": "ci001", "operational_status": "1", "sys_class_name": "cmdb_ci_server"}]

    findings = generator.generate(cmdb_cis)
    ghosts = [f for f in findings if f.category == "ghost_cis"]
    assert len(ghosts) == 1


def test_detect_misclassification() -> None:
    store = ConfidenceStore()
    store.records["ci001"] = CIConfidenceRecord(
        ci_sys_id="ci001",
        ci_class="cmdb_ci_server",
        confidence_score=90,
        traffic_state=TrafficState.ACTIVE,
        last_observation=datetime.now(timezone.utc),
        observation_count=100,
        behavioral_classification=BehavioralClassification(
            suggested_class="cmdb_ci_app_server",
            classification_confidence=85,
            reasoning="Receiving HTTP traffic",
        ),
    )

    generator = FusionFindingGenerator(store)
    cmdb_cis = [{"sys_id": "ci001", "sys_class_name": "cmdb_ci_server", "operational_status": "1"}]

    findings = generator.generate(cmdb_cis)
    misclass = [f for f in findings if f.category == "behavioral_misclassification"]
    assert len(misclass) == 1
