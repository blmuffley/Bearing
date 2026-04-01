"""Tests for webhook endpoints."""

from __future__ import annotations

import os

from fastapi.testclient import TestClient

os.environ.setdefault("BEARING_SN_INSTANCE", "https://test.service-now.com")
os.environ.setdefault("BEARING_SN_USERNAME", "admin")
os.environ.setdefault("BEARING_SN_PASSWORD", "password")
os.environ.setdefault("BEARING_API_KEY", "test-key")

from bearing.main import app  # noqa: E402

client = TestClient(app)


def test_pathfinder_webhook_missing_key() -> None:
    response = client.post(
        "/api/webhooks/pathfinder",
        json={"schema_version": "1.0"},
    )
    assert response.status_code == 422  # Missing required header


def test_pathfinder_webhook_invalid_key() -> None:
    response = client.post(
        "/api/webhooks/pathfinder",
        json={
            "schema_version": "1.0",
            "pathfinder_instance_id": "pf-01",
            "servicenow_instance_url": "https://test.service-now.com",
            "observation_window_hours": 24,
            "generated_at": "2026-03-31T12:00:00Z",
            "ci_confidence_records": [],
            "coverage_summary": {
                "total_monitored_hosts": 0,
                "active_cis": 0,
                "idle_cis": 0,
                "deprecated_cis": 0,
                "unknown_cis": 0,
            },
        },
        headers={"X-Bearing-API-Key": "wrong-key"},
    )
    assert response.status_code == 401


def test_pathfinder_webhook_valid() -> None:
    response = client.post(
        "/api/webhooks/pathfinder",
        json={
            "schema_version": "1.0",
            "pathfinder_instance_id": "pf-test-01",
            "servicenow_instance_url": "https://test.service-now.com",
            "observation_window_hours": 24,
            "generated_at": "2026-03-31T12:00:00Z",
            "ci_confidence_records": [],
            "coverage_summary": {
                "total_monitored_hosts": 100,
                "active_cis": 80,
                "idle_cis": 15,
                "deprecated_cis": 3,
                "unknown_cis": 2,
            },
        },
        headers={"X-Bearing-API-Key": "test-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "accepted"


def test_contour_webhook_invalid_key() -> None:
    response = client.post(
        "/api/webhooks/contour",
        json={"event_type": "service_model.updated"},
        headers={"X-Bearing-API-Key": "wrong-key"},
    )
    assert response.status_code == 401
