# Testing Guide

**Internal Engineering Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## Overview

Bearing uses pytest with a mocking strategy that eliminates the need for a real ServiceNow instance during testing. The test suite covers API routes, assessment engine logic, dimension scoring, fusion findings, and report generation.

**Coverage target**: 80% (enforced by `pytest-cov` in `pyproject.toml`).

---

## Test Structure

```
src/tests/
    __init__.py
    conftest.py                    # Shared fixtures (settings, mocks, sample data)
    test_api/
        __init__.py
        test_routes.py             # FastAPI route tests (TestClient)
        test_webhooks.py           # Webhook endpoint tests
    test_assessment/
        __init__.py
        test_engine.py             # AssessmentEngine lifecycle tests
        test_debt.py               # TechnicalDebtCalculator tests
        test_maturity.py           # MaturityScorer level determination tests
    test_fusion/
        __init__.py
        test_findings.py           # FusionFindingGenerator (5 finding types)
        test_pathfinder.py         # PathfinderProcessor feed ingestion
    test_reports/
        __init__.py
        test_pdf.py                # PDF generation smoke test
        test_docx.py               # DOCX generation smoke test
```

---

## Running Tests

### Full Test Suite

```bash
make test
# OR: pytest --cov=bearing --cov-report=term-missing
```

This runs all tests and produces a coverage report showing which lines are not covered.

### Specific Test File

```bash
pytest src/tests/test_assessment/test_engine.py
```

### Specific Test Function

```bash
pytest src/tests/test_assessment/test_engine.py::test_create_assessment
```

### Specific Test Module

```bash
pytest src/tests/test_fusion/
```

### Verbose Output

```bash
pytest -v src/tests/
```

### Coverage Report (HTML)

```bash
pytest --cov=bearing --cov-report=html
open htmlcov/index.html
```

---

## Fixtures (conftest.py)

All shared fixtures are defined in `src/tests/conftest.py`. These are automatically available to all test files via pytest's fixture discovery.

### `mock_settings`

Creates a `Settings` instance with test environment variables injected via `monkeypatch`. Uses test ServiceNow credentials that will never hit a real instance.

```python
@pytest.fixture
def mock_settings(monkeypatch):
    monkeypatch.setenv("BEARING_SN_INSTANCE", "https://test.service-now.com")
    monkeypatch.setenv("BEARING_SN_USERNAME", "admin")
    monkeypatch.setenv("BEARING_SN_PASSWORD", "password")
    monkeypatch.setenv("BEARING_API_KEY", "test-api-key")
    return Settings()
```

### `mock_sn_client`

A `MagicMock` with the spec of `ServiceNowClient`. All methods return `MagicMock` by default. Configure return values in your test:

```python
def test_something(mock_sn_client):
    mock_sn_client.get_all_records.return_value = [
        {"sys_id": "ci001", "name": "server-01", ...}
    ]
```

### `sample_cis`

Three sample CI records covering common test scenarios:
- `ci001` -- Fully populated Linux server (all fields, discovery source, recent update)
- `ci002` -- Partially populated (missing owner and support group, stale, no discovery)
- `ci003` -- Minimal record (missing name, generic class, no fields populated)

### `sample_assessment`

A completed assessment response with:
- Score: 42 (Grade D)
- Maturity: Level 2 (Managed)
- 15 findings (3 critical)
- $250,000 technical debt estimate
- 1000 CIs assessed

### `sample_dimension_scores`

All 8 dimension scores with realistic values ranging from 15 (CSDM) to 70 (Duplicates).

### `sample_findings`

Two sample findings:
- Critical completeness finding (500 CIs missing owner)
- High currency finding (200 stale CIs)

---

## Mocking Strategy

Bearing tests never call a real ServiceNow instance. The mocking strategy has two layers:

### Layer 1: Mock the ServiceNow Client

For unit tests of dimension scorers, fusion generators, and the assessment engine, mock `ServiceNowClient` at the object level:

```python
from unittest.mock import MagicMock
from bearing.servicenow.client import ServiceNowClient

mock_client = MagicMock(spec=ServiceNowClient)
mock_client.get_all_records.return_value = [
    {"sys_id": "ci001", "name": "web-server-01", "sys_class_name": "cmdb_ci_linux_server", ...},
    {"sys_id": "ci002", "name": "db-server-01", "sys_class_name": "cmdb_ci_linux_server", ...},
]
mock_client.get_record_count.return_value = 42
```

### Layer 2: Environment Variables for API Tests

For integration tests using FastAPI's `TestClient`, environment variables are set before importing the app:

```python
import os
os.environ.setdefault("BEARING_SN_INSTANCE", "https://test.service-now.com")
os.environ.setdefault("BEARING_SN_USERNAME", "admin")
os.environ.setdefault("BEARING_SN_PASSWORD", "password")
os.environ.setdefault("BEARING_API_KEY", "test-key")

from bearing.main import app
client = TestClient(app)
```

The `TestClient` exercises the full FastAPI stack (routing, validation, serialization) without making external HTTP calls.

---

## Test Patterns by Module

### API Route Tests (`test_api/test_routes.py`)

Test the HTTP interface:

```python
def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_assessment_not_found():
    response = client.get("/api/v1/assessments/nonexistent-id")
    assert response.status_code == 404
```

These tests verify:
- Route registration and path matching
- Response status codes
- JSON response structure
- Error handling (404s, validation errors)

### Webhook Tests (`test_api/test_webhooks.py`)

Test authentication and payload validation:

```python
def test_pathfinder_webhook_invalid_key():
    response = client.post("/api/webhooks/pathfinder",
        json={...valid payload...},
        headers={"X-Bearing-API-Key": "wrong-key"},
    )
    assert response.status_code == 401

def test_pathfinder_webhook_valid():
    response = client.post("/api/webhooks/pathfinder",
        json={...valid payload...},
        headers={"X-Bearing-API-Key": "test-key"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
```

### Assessment Engine Tests (`test_assessment/test_engine.py`)

Test the orchestrator without running actual scorers:

```python
def test_create_assessment(mock_settings):
    engine = AssessmentEngine(mock_settings)
    request = AssessmentCreateRequest(name="Test", scope=AssessmentScope.FULL)
    assessment = engine.create_assessment(request)
    assert assessment.status == AssessmentStatus.PENDING
    assert assessment.overall_score == 0
```

### Technical Debt Tests (`test_assessment/test_debt.py`)

Test cost formulas with known inputs:

```python
def test_completeness_cost():
    calc = TechnicalDebtCalculator()
    finding = FindingResponse(
        ..., dimension=Dimension.COMPLETENESS, affected_count=100, ...
    )
    cost = calc.calculate([finding])
    assert cost == 30_000.0  # 100 * 2.0h * $150

def test_custom_parameters():
    params = DebtParameters(hourly_rate=200.0, avg_hours_to_map_manually=3.0)
    calc = TechnicalDebtCalculator(params)
    ...
```

### Maturity Tests (`test_assessment/test_maturity.py`)

Test level boundaries:

```python
def test_level_1_adhoc():
    scorer = MaturityScorer()
    level, label = scorer.assess(15, [...low scores...], [])
    assert level == 1
    assert label == "Ad-hoc"

def test_level_5_optimized():
    level, label = scorer.assess(95, [...high scores...], [])
    assert level == 5
```

### Fusion Tests (`test_fusion/test_findings.py`)

Test each fusion finding type by populating the ConfidenceStore:

```python
def test_detect_shadow_it():
    store = ConfidenceStore()
    store.records["unknown_ci"] = CIConfidenceRecord(
        ci_sys_id="unknown_ci",
        traffic_state=TrafficState.ACTIVE,
        ...
    )
    generator = FusionFindingGenerator(store)
    findings = generator.generate([{"sys_id": "ci001"}])  # unknown_ci not in CMDB
    shadow = [f for f in findings if f.category == "shadow_it"]
    assert len(shadow) == 1
    assert shadow[0].severity.value == "critical"
```

### Report Tests (`test_reports/`)

Smoke tests that verify report generation produces valid output:

```python
def test_generate_health_scorecard(sample_assessment, sample_dimension_scores, sample_findings):
    generator = PDFReportGenerator()
    pdf_bytes = generator.generate_health_scorecard(
        sample_assessment, sample_dimension_scores, sample_findings
    )
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:5] == b"%PDF-"  # Valid PDF header

def test_generate_docx():
    ...
    assert docx_bytes[:2] == b"PK"  # Valid ZIP/DOCX header
```

---

## Adding New Tests

### For a New Dimension Scorer

1. Create `src/tests/test_assessment/test_your_dimension.py`
2. Import the scorer and mock `ServiceNowClient`
3. Configure `mock_sn_client.get_all_records.return_value` with test CI data
4. Instantiate the scorer with the mock client
5. Call `scorer.score()` and assert the score
6. Call `scorer.get_findings()` and assert finding count, severity, categories

```python
from unittest.mock import MagicMock
from bearing.assessment.dimensions.your_dimension import YourScorer
from bearing.servicenow.client import ServiceNowClient

def test_your_scorer_perfect_data():
    mock_client = MagicMock(spec=ServiceNowClient)
    mock_client.get_all_records.return_value = [
        # All CIs with perfect data
    ]
    scorer = YourScorer(mock_client)
    result = scorer.score()
    assert result.score == 100
    assert len(scorer.get_findings()) == 0

def test_your_scorer_poor_data():
    mock_client = MagicMock(spec=ServiceNowClient)
    mock_client.get_all_records.return_value = [
        # CIs with issues
    ]
    scorer = YourScorer(mock_client)
    result = scorer.score()
    assert result.score < 50
    findings = scorer.get_findings()
    assert any(f.severity.value == "critical" for f in findings)
```

### For a New API Endpoint

1. Add to `src/tests/test_api/test_routes.py`
2. Use the existing `client = TestClient(app)` instance
3. Test success case, not-found case, and validation error case

### For a New Fusion Finding Type

1. Add to `src/tests/test_fusion/test_findings.py`
2. Create a `ConfidenceStore` with specific records
3. Create `FusionFindingGenerator(store)`
4. Call `generator.generate(cmdb_cis)` with crafted CMDB data
5. Filter findings by category and assert

---

## Coverage Requirements

The coverage threshold is **80%** (set in `pyproject.toml`):

```toml
[tool.coverage.report]
fail_under = 80
```

Coverage source is `bearing` (the main package). Test files are excluded.

To check current coverage:

```bash
pytest --cov=bearing --cov-report=term-missing
```

The `term-missing` report shows which specific lines are not covered. Target these for additional tests.

### Areas to Prioritize for Coverage

1. **Dimension scorer edge cases** -- Empty CI lists, CIs with missing fields, date parsing errors
2. **Error paths in engine.py** -- Assessment failure, ServiceNow write failure, fusion generation failure
3. **Auth module** -- Token refresh failure fallback, expired token detection
4. **ServiceNow client** -- Write guard enforcement, pagination termination
