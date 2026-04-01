"""Tests for API routes."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

# Set required env vars before importing app
os.environ.setdefault("BEARING_SN_INSTANCE", "https://test.service-now.com")
os.environ.setdefault("BEARING_SN_USERNAME", "admin")
os.environ.setdefault("BEARING_SN_PASSWORD", "password")
os.environ.setdefault("BEARING_API_KEY", "test-key")

from bearing.main import app  # noqa: E402

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_list_assessments_empty() -> None:
    response = client.get("/api/v1/assessments")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 0


def test_get_assessment_not_found() -> None:
    response = client.get("/api/v1/assessments/nonexistent-id")
    assert response.status_code == 404
