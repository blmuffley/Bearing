# API Reference

**Internal Engineering Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## Base URL

```
http://localhost:8080
```

All API routes are prefixed with `/api/v1/` (application routes) or `/api/webhooks/` (integration webhooks).

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

---

## Authentication

### Application API (`/api/v1/`)

Currently, the application API routes do not enforce authentication. In production, implement authentication middleware using `BEARING_API_KEY` or integrate with an identity provider.

### Webhook API (`/api/webhooks/`)

All webhook endpoints require the `X-Bearing-API-Key` header. The value must match the `BEARING_API_KEY` environment variable.

---

## Health Check

### `GET /api/v1/health`

Returns server health status.

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

**Example**:
```bash
curl http://localhost:8080/api/v1/health
```

---

## Assessments

### `POST /api/v1/assessments`

Trigger a new CMDB health assessment. The assessment runs asynchronously in the background.

**Request Body**:
```json
{
  "name": "Q1 2026 Assessment",
  "scope": "full",
  "target_scope": "",
  "triggered_by": "manual"
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | Yes | -- | Human-readable assessment name |
| `scope` | enum | No | `full` | `full`, `targeted`, or `incremental` |
| `target_scope` | string | No | `""` | CI query filter for targeted scope |
| `triggered_by` | enum | No | `manual` | `manual`, `scheduled`, `api`, `corex` |

**Response**: `200 OK` -- Returns the assessment in `pending` status.
```json
{
  "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q1 2026 Assessment",
  "scope": "full",
  "overall_score": 0,
  "grade": "F",
  "maturity_level": 1,
  "maturity_label": "Ad-hoc",
  "findings_count": 0,
  "critical_findings": 0,
  "technical_debt_estimate": 0.0,
  "ci_count_assessed": 0,
  "has_pathfinder_data": false,
  "has_contour_data": false,
  "status": "pending",
  "run_date": "2026-04-01T12:00:00Z",
  "completed_date": null,
  "ai_summary": "",
  "triggered_by": "manual",
  "dimension_scores": []
}
```

**Example**:
```bash
curl -X POST http://localhost:8080/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{"name": "Q1 2026 Assessment", "scope": "full"}'
```

**Notes**:
- The assessment runs in a background task. Poll `GET /api/v1/assessments/{id}` to check status.
- Status transitions: `pending` -> `running` -> `completed` (or `failed`).

---

### `GET /api/v1/assessments`

List all assessments.

**Response**: `200 OK`
```json
{
  "assessments": [
    {
      "assessment_id": "...",
      "name": "Q1 2026 Assessment",
      "scope": "full",
      "overall_score": 42,
      "grade": "D",
      "status": "completed",
      ...
    }
  ],
  "total": 1
}
```

**Example**:
```bash
curl http://localhost:8080/api/v1/assessments
```

---

### `GET /api/v1/assessments/{assessment_id}`

Get a specific assessment by ID.

**Path Parameters**:
| Parameter | Type | Description |
|---|---|---|
| `assessment_id` | string (UUID) | Assessment identifier |

**Response**: `200 OK` -- Full `AssessmentResponse` object (see POST response above).

**Error Responses**:
- `404 Not Found`: `{"detail": "Assessment not found"}`

**Example**:
```bash
curl http://localhost:8080/api/v1/assessments/550e8400-e29b-41d4-a716-446655440000
```

---

## Dimension Scores

### `GET /api/v1/scores/{assessment_id}`

Get dimension scores for a completed assessment.

**Response**: `200 OK`
```json
[
  {
    "dimension": "completeness",
    "score": 55,
    "weight": 0.2,
    "checks_passed": 3300,
    "checks_total": 6000,
    "details": "Assessed 1000 CIs. 450 (45%) have all required fields."
  },
  {
    "dimension": "accuracy",
    "score": 25,
    "weight": 0.15,
    "checks_passed": 750,
    "checks_total": 3000,
    "details": "Assessed 1000 CIs. 300 have discovery validation."
  }
]
```

**Error Responses**:
- `404 Not Found`: `{"detail": "Assessment not found"}`

**Example**:
```bash
curl http://localhost:8080/api/v1/scores/550e8400-e29b-41d4-a716-446655440000
```

---

## Findings

### `GET /api/v1/findings/{assessment_id}`

Get all findings for an assessment.

**Response**: `200 OK`
```json
[
  {
    "finding_id": "f001-uuid",
    "finding_type": "gap",
    "severity": "critical",
    "dimension": "completeness",
    "category": "missing_owned_by",
    "title": "500 CIs missing 'owned_by' field (50%)",
    "description": "500 of 1000 active CIs do not have an owner assigned.",
    "affected_ci_class": "",
    "affected_count": 500,
    "remediation": "Assign owners to all CIs.",
    "estimated_effort_hours": 125.0,
    "estimated_cost": 0.0,
    "avennorth_product": "none",
    "automation_potential": "manual",
    "fusion_source": "cmdb_only"
  }
]
```

**Finding Type Enum Values**:
- `gap` -- Missing data or configuration
- `risk` -- Potential operational risk
- `recommendation` -- Suggested improvement
- `positive` -- Positive observation
- `fusion` -- Only detectable with Pathfinder data

**Fusion Source Enum Values**:
- `cmdb_only` -- Standard dimension finding
- `pathfinder_only` -- Pathfinder-only observation
- `fusion` -- Requires both CMDB + Pathfinder data

**Example**:
```bash
curl http://localhost:8080/api/v1/findings/550e8400-e29b-41d4-a716-446655440000
```

---

## Trends

### `GET /api/v1/trends`

Get historical trend data across all completed assessments.

**Response**: `200 OK`
```json
{
  "points": [
    {
      "dimension": "completeness",
      "score": 55,
      "run_date": "2026-03-01T12:00:00Z",
      "delta_from_previous": 0
    },
    {
      "dimension": "completeness",
      "score": 62,
      "run_date": "2026-04-01T12:00:00Z",
      "delta_from_previous": 7
    }
  ]
}
```

**Note**: Trend data accumulates in-memory across the application lifecycle. It is reset when the application restarts.

**Example**:
```bash
curl http://localhost:8080/api/v1/trends
```

---

## Reports

### `POST /api/v1/reports/{assessment_id}/pdf`

Generate a PDF report for an assessment.

**Path Parameters**:
| Parameter | Type | Description |
|---|---|---|
| `assessment_id` | string (UUID) | Assessment identifier |

**Request Body**:
```json
{
  "report_type": "health_scorecard",
  "format": "pdf"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `report_type` | string | Yes | `health_scorecard`, `technical_debt`, `maturity`, `recommendations`, `before_after` |
| `format` | string | No | Always `pdf` for this endpoint (default: `pdf`) |

**Response**: `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="bearing_{report_type}_{id_prefix}.pdf"`
- Body: raw PDF bytes

**Error Responses**:
- `404 Not Found`: Assessment does not exist

**Example**:
```bash
curl -X POST http://localhost:8080/api/v1/reports/550e8400-e29b-41d4-a716-446655440000/pdf \
  -H "Content-Type: application/json" \
  -d '{"report_type": "health_scorecard"}' \
  --output report.pdf
```

---

### `POST /api/v1/reports/{assessment_id}/docx`

Generate a DOCX report for an assessment.

**Path Parameters**: Same as PDF endpoint.

**Request Body**: Same as PDF endpoint.

**Response**: `200 OK`
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="bearing_{report_type}_{id_prefix}.docx"`
- Body: raw DOCX bytes

**Example**:
```bash
curl -X POST http://localhost:8080/api/v1/reports/550e8400-e29b-41d4-a716-446655440000/docx \
  -H "Content-Type: application/json" \
  -d '{"report_type": "health_scorecard"}' \
  --output report.docx
```

---

## Webhooks

### `POST /api/webhooks/pathfinder`

Receive a Pathfinder confidence feed.

**Required Headers**:
| Header | Description |
|---|---|
| `X-Bearing-API-Key` | Must match `BEARING_API_KEY` environment variable |
| `Content-Type` | `application/json` |

**Request Body**: See the full `PathfinderConfidenceFeed` schema in the Fusion Engine Reference (doc 03). Abbreviated:

```json
{
  "schema_version": "1.0",
  "pathfinder_instance_id": "pf-prod-01",
  "servicenow_instance_url": "https://customer.service-now.com",
  "observation_window_hours": 24,
  "generated_at": "2026-03-31T12:00:00Z",
  "ci_confidence_records": [...],
  "coverage_summary": {
    "total_monitored_hosts": 500,
    "active_cis": 400,
    "idle_cis": 80,
    "deprecated_cis": 15,
    "unknown_cis": 5,
    "monitored_subnets": [],
    "unmonitored_subnets_detected": []
  }
}
```

**Response**: `200 OK`
```json
{
  "status": "accepted",
  "records_processed": 42,
  "pathfinder_instance_id": "pf-prod-01"
}
```

**Error Responses**:
- `401 Unauthorized`: `{"detail": "Invalid API key"}`
- `422 Unprocessable Entity`: Payload validation failed

**Example**:
```bash
curl -X POST http://localhost:8080/api/webhooks/pathfinder \
  -H "Content-Type: application/json" \
  -H "X-Bearing-API-Key: your-api-key-here" \
  -d @pathfinder_feed.json
```

---

### `POST /api/webhooks/contour`

Receive a Contour service model event.

**Required Headers**:
| Header | Description |
|---|---|
| `X-Bearing-API-Key` | Must match `BEARING_API_KEY` environment variable |
| `Content-Type` | `application/json` |

**Request Body**: Freeform JSON object. Expected fields:

```json
{
  "event_type": "service_model.updated",
  "model_version": "2.1.0",
  "changed_services": ["svc001", "svc002"]
}
```

**Response**: `200 OK`
```json
{
  "status": "accepted"
}
```

**Error Responses**:
- `401 Unauthorized`: `{"detail": "Invalid API key"}`

**Example**:
```bash
curl -X POST http://localhost:8080/api/webhooks/contour \
  -H "Content-Type: application/json" \
  -H "X-Bearing-API-Key: your-api-key-here" \
  -d '{"event_type": "service_model.updated", "model_version": "2.1"}'
```

---

## Common Error Responses

| Status | Meaning | Body |
|---|---|---|
| 200 | Success | Response body as documented |
| 401 | Unauthorized (webhooks only) | `{"detail": "Invalid API key"}` |
| 404 | Resource not found | `{"detail": "Assessment not found"}` |
| 422 | Validation error | `{"detail": [...]}` with field-level errors |
| 500 | Internal server error | `{"detail": "Internal Server Error"}` |

---

## Enum Reference

### AssessmentScope
`full`, `targeted`, `incremental`

### AssessmentStatus
`pending`, `running`, `completed`, `failed`

### Severity
`critical`, `high`, `medium`, `low`, `info`

### FindingType
`gap`, `risk`, `recommendation`, `positive`, `fusion`

### FusionSource
`cmdb_only`, `pathfinder_only`, `fusion`

### Dimension
`completeness`, `accuracy`, `currency`, `relationships`, `csdm`, `classification`, `orphans`, `duplicates`

### AvennorthProduct
`none`, `pathfinder`, `contour`, `pathfinder+contour`

### AutomationPotential
`full`, `partial`, `manual`

### Effort
`low`, `medium`, `high`

### TriggeredBy
`manual`, `scheduled`, `api`, `corex`

### TrafficState
`active`, `idle`, `deprecated`, `unknown`
