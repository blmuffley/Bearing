# Bearing Architecture Deep Dive

**Internal Engineering Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## 1. System Overview

Bearing is a CMDB health assessment platform for ServiceNow instances. It connects to a customer's ServiceNow instance via REST API, evaluates CMDB data quality across eight dimensions, produces a composite health score, estimates technical debt in dollar terms, and generates branded reports.

The system is built as a Python FastAPI application with the following high-level architecture:

```
                          +-------------------+
                          |   FastAPI Server   |
                          |  (bearing.main)    |
                          +--------+----------+
                                   |
              +--------------------+--------------------+
              |                    |                     |
     /api/v1/ routes      /api/webhooks/         Background Jobs
     (bearing.api)        (Pathfinder,           (APScheduler)
              |            Contour)
              |                    |
     +--------v--------+  +-------v--------+
     | Assessment       |  | Fusion         |
     | Engine           |  | (Pathfinder +  |
     | (orchestrator)   |  |  Contour)      |
     +--------+---------+  +-------+--------+
              |                     |
     +--------v---------+          |
     | 8 Dimension       |         |
     | Scorers           |<--------+
     +--------+----------+
              |
     +--------v----------+     +------------------+
     | ServiceNow Client  |     | Report Generators|
     | (read CMDB,        |     | (PDF + DOCX)     |
     |  write x_avnth_*)  |     +------------------+
     +--------------------+
```

### Key Architectural Decisions

1. **Python + FastAPI over Next.js**: The CLAUDE.md spec describes a Next.js/TypeScript stack. The actual implementation uses Python/FastAPI. This was chosen because the assessment engine is computation-heavy (data analysis, scoring, chart generation) and Python's data science ecosystem (matplotlib, numpy) is better suited.

2. **In-memory storage**: Assessment results are stored in-memory within the `AssessmentEngine` instance. Results are also written to ServiceNow tables (`x_avnth_bearing_*`) when the connection is available. There is no local database in the current implementation.

3. **Read-only CMDB access with write guard**: The ServiceNow client enforces a hard write guard -- writes are only permitted to tables prefixed with `x_avnth_bearing_`. This is enforced at the client level with a `ValueError` if any other table is targeted.

4. **Additive fusion model**: Pathfinder integration is strictly additive. Every assessment completes without Pathfinder data. When Pathfinder confidence feeds are available, fusion findings are appended to the assessment.

---

## 2. Package-by-Package Breakdown

### `bearing/` (Root Package)

- `__init__.py` -- Version string (`0.1.0`).
- `config.py` -- `Settings` class using `pydantic-settings`. Loads from environment variables prefixed with `BEARING_`. Determines auth method (OAuth vs. basic) from available credentials.
- `main.py` -- FastAPI application factory (`create_app()`). Mounts API and webhook routers. Provides `cli()` entry point for `uvicorn`.

### `bearing/api/`

- `schemas.py` -- All Pydantic request/response models and enums. This is the single source of truth for data shapes throughout the application. Key enums: `Dimension` (8 values), `Severity`, `FindingType`, `FusionSource`, `TrafficState`.
- `routes.py` -- REST API endpoints under `/api/v1/`. Assessment CRUD, dimension scores, findings, trends, and report generation (PDF/DOCX).
- `webhooks.py` -- Webhook endpoints under `/api/webhooks/`. Pathfinder confidence feed receiver and Contour event receiver. Both validate API key via `X-Bearing-API-Key` header.

### `bearing/assessment/`

The core assessment logic.

- `engine.py` -- `AssessmentEngine` is the orchestrator. Creates assessments, runs all 8 dimension scorers, computes weighted composite, determines maturity level, calculates debt, generates recommendations, writes results to ServiceNow. Uses `BackgroundTasks` for async execution.
- `dimensions/base.py` -- `BaseDimensionScorer` ABC. All scorers inherit from this. Provides `_add_finding()`, `_build_score_response()`, and manages `checks_passed`/`checks_total` counters.
- `dimensions/` -- Eight scorer implementations (completeness, accuracy, currency, relationships, csdm_compliance, classification, orphan_analysis, duplicate_detection).
- `debt.py` -- `TechnicalDebtCalculator`. Translates findings into dollar estimates using per-dimension cost formulas with configurable `DebtParameters`.
- `maturity.py` -- `MaturityScorer`. Five-level model (Ad-hoc through Optimized) determined from overall score, dimension scores, and finding patterns.
- `recommendations.py` -- `RecommendationEngine`. Generates prioritized remediation actions sorted by impact score. Maps dimensions to Avennorth products (Pathfinder, Contour).

### `bearing/servicenow/`

- `auth.py` -- `ServiceNowAuth` dataclass. Manages OAuth2 token lifecycle (acquire, refresh, expiry with 60-second buffer) and basic auth header generation.
- `client.py` -- `ServiceNowClient`. Typed wrapper around ServiceNow Table API. Methods: `get_records()`, `get_all_records()` (auto-paginating), `get_record_count()`, `write_record()`, `update_record()`. Enforces write guard.
- `queries.py` -- Query builders and field lists for CMDB tables. Constants for table names (`CMDB_TABLES`) and required fields per dimension.
- `writer.py` -- `AssessmentWriter`. Maps assessment response objects to ServiceNow table records and writes them using the client. Targets: `x_avnth_bearing_assessment`, `_finding`, `_score`, `_trend`, `_recommendation`.

### `bearing/fusion/`

- `pathfinder.py` -- `PathfinderProcessor` and `ConfidenceStore`. Module-level singleton store holds CI confidence records. Processor ingests webhook payloads and updates the store.
- `findings.py` -- `FusionFindingGenerator`. Generates five types of fusion-only findings by comparing CMDB data against Pathfinder observations.
- `contour.py` -- `ContourProcessor` and `ContourStore`. Processes service model events from Contour. Currently a thin receiver.

### `bearing/reports/`

- `pdf.py` -- `BearingPDF` (extends fpdf2 FPDF) with Avennorth branding. `PDFReportGenerator` generates health scorecard PDFs.
- `docx_report.py` -- `DOCXReportGenerator` using python-docx. Generates health scorecard DOCX with dimension score tables and findings.
- `charts.py` -- Matplotlib chart generators. `generate_dimension_bar_chart()` and `generate_score_donut()` produce PNG images for embedding in reports.
- `templates/` -- Report template definitions. Each template declares sections. Currently: `health_scorecard`, `before_after`, `maturity_report`, `recommendations`, `technical_debt`.

### `bearing/ai/`

- `client.py` -- `AIClient`. Wrapper around Anthropic Claude API (claude-sonnet-4-6). Gracefully degrades when `ANTHROPIC_API_KEY` is not set.
- `analysis.py` -- `AIAnalyzer`. Generates executive summaries and remediation recommendations from assessment data.
- `prompts.py` -- Prompt templates. `build_executive_summary_prompt()` and `build_recommendation_prompt()` format assessment data into structured prompts.

### `bearing/scheduler/`

- `jobs.py` -- APScheduler integration. `create_scheduler()` parses a 5-field cron expression from `BEARING_SCHEDULE_CRON` and schedules recurring assessments. Returns `None` if no cron is configured.

---

## 3. Data Flow: Assessment Pipeline

```
Request (POST /api/v1/assessments)
    |
    v
AssessmentEngine.create_assessment()
    |  Creates assessment record (PENDING status)
    v
BackgroundTasks -> engine.run_assessment()
    |
    |  1. Set status = RUNNING
    |
    |  2. For each of 8 dimension scorers:
    |     a. scorer.score()
    |        - Calls sn_client.get_all_records() for relevant tables
    |        - Evaluates quality checks
    |        - Returns DimensionScoreResponse (0-100)
    |     b. scorer.get_findings()
    |        - Returns list of FindingResponse objects
    |
    |  3. If Pathfinder data available:
    |     - Fetch active CMDB CIs
    |     - FusionFindingGenerator.generate(cmdb_cis)
    |     - Append fusion findings to all_findings
    |
    |  4. Compute weighted composite score:
    |     overall = sum(score.score * score.weight for score in dimension_scores)
    |
    |  5. MaturityScorer.assess() -> (level, label)
    |
    |  6. TechnicalDebtCalculator.calculate(findings) -> dollar estimate
    |
    |  7. RecommendationEngine.generate() -> prioritized recommendations
    |
    |  8. Write results to ServiceNow tables:
    |     - x_avnth_bearing_assessment
    |     - x_avnth_bearing_score
    |     - x_avnth_bearing_finding
    |     - x_avnth_bearing_recommendation
    |     (Continues on failure -- results always stored in memory)
    |
    v
Assessment status = COMPLETED
```

---

## 4. ServiceNow Client Architecture

### Authentication

The client supports two authentication methods, determined at startup from environment variables:

- **OAuth2 (Password Grant)**: Requires `BEARING_SN_CLIENT_ID`, `BEARING_SN_CLIENT_SECRET`, `BEARING_SN_USERNAME`, `BEARING_SN_PASSWORD`. Acquires token via `POST /oauth_token.do`. Refreshes automatically when token expires (with 60-second buffer).
- **Basic Auth**: Requires `BEARING_SN_USERNAME`, `BEARING_SN_PASSWORD`. Sends Base64-encoded credentials in `Authorization` header on every request.

OAuth2 is preferred when client credentials are available.

### Pagination

`get_all_records()` handles automatic pagination:

1. Fetches records in batches of `batch_size` (default 100, configurable up to 10,000).
2. Increments `sysparm_offset` by the number of records received.
3. Stops when a batch returns fewer records than `batch_size` or returns empty.
4. Sleeps `RATE_LIMIT_DELAY` (100ms) between batches to avoid ServiceNow rate limiting.

### Rate Limiting

Currently a simple delay-based approach: 100ms between paginated requests. The client does not inspect `X-Rate-Limit-*` headers. For large instances, the 100ms delay is sufficient to stay within ServiceNow's default rate limits.

### Write Guard

All write operations (`write_record()`, `update_record()`) check that the target table starts with `x_avnth_bearing_`. This is a hard guard -- a `ValueError` is raised immediately if violated. This prevents accidental writes to customer CMDB tables.

```
ALLOWED: x_avnth_bearing_assessment, x_avnth_bearing_finding, etc.
BLOCKED: cmdb_ci, cmdb_rel_ci, incident, etc.
```

### Error Handling

- HTTP errors from ServiceNow propagate as `requests.HTTPError`.
- Timeout set to 60 seconds for reads, 30 seconds for writes and counts.
- The assessment engine catches write failures and logs warnings -- assessment results are always kept in memory even if ServiceNow write fails.

---

## 5. Scheduler Architecture

The scheduler uses APScheduler `BackgroundScheduler`. It is configured from a single environment variable:

```
BEARING_SCHEDULE_CRON="0 2 * * *"  # Run at 2:00 AM daily
```

The cron expression is parsed into 5 fields: minute, hour, day_of_month, month, day_of_week. If the expression is empty or missing, no scheduler is created.

When triggered, the scheduler creates an `AssessmentEngine`, builds an `AssessmentCreateRequest` with `triggered_by=SCHEDULED`, and runs a full assessment synchronously within the job thread.

Current limitations:
- Single-instance only. No distributed locking.
- No job persistence across restarts.
- No retry on failure.

---

## 6. Error Handling Strategy

Bearing uses a layered error handling approach:

**API Layer** (`routes.py`):
- Returns 404 for missing assessments.
- FastAPI handles validation errors (422) for malformed requests.
- Webhooks return 401 for invalid API keys.

**Assessment Engine** (`engine.py`):
- Catches all exceptions during assessment execution.
- Sets `status=FAILED` on any unrecoverable error.
- ServiceNow write failures are caught and logged as warnings -- they never fail the assessment.
- Fusion finding generation failures are caught and logged -- assessment continues without fusion data.

**ServiceNow Client** (`client.py`):
- `requests.raise_for_status()` on every API call.
- Exceptions propagate to the caller.
- OAuth token refresh falls back to full re-acquisition on failure.

**Fusion Layer** (`pathfinder.py`, `findings.py`):
- Wrapped in try/except at the engine level.
- Never blocks assessment completion.

---

## 7. Configuration Management

All configuration flows through `bearing/config.py` using `pydantic-settings`:

| Variable | Required | Description |
|---|---|---|
| `BEARING_SN_INSTANCE` | Yes | ServiceNow instance URL |
| `BEARING_SN_CLIENT_ID` | No | OAuth2 client ID |
| `BEARING_SN_CLIENT_SECRET` | No | OAuth2 client secret |
| `BEARING_SN_USERNAME` | No | ServiceNow username |
| `BEARING_SN_PASSWORD` | No | ServiceNow password |
| `ANTHROPIC_API_KEY` | No | Claude API key for AI summaries |
| `BEARING_API_KEY` | No | API key for webhook auth |
| `BEARING_DB_URL` | No | PostgreSQL URL (future use) |
| `BEARING_PORT` | No | Server port (default 8080) |
| `BEARING_LOG_LEVEL` | No | Logging level (default INFO) |
| `BEARING_SCHEDULE_CRON` | No | Cron expression for scheduled assessments |

Authentication method is auto-detected:
- If `SN_CLIENT_ID` + `SN_CLIENT_SECRET` are set: OAuth2
- If `SN_USERNAME` + `SN_PASSWORD` are set: Basic auth
- Otherwise: No auth (will fail on first API call)

---

## 8. Class Relationships

```
AssessmentEngine
  |-- Settings
  |-- ServiceNowClient
  |     |-- ServiceNowAuth
  |           |-- TokenInfo
  |-- TechnicalDebtCalculator
  |     |-- DebtParameters
  |-- MaturityScorer
  |-- RecommendationEngine
  |-- AssessmentWriter
  |     |-- ServiceNowClient (shared)
  |-- FusionFindingGenerator
  |     |-- ConfidenceStore (singleton)
  |
  |-- CompletenessScorer (BaseDimensionScorer)
  |-- AccuracyScorer (BaseDimensionScorer)
  |-- CurrencyScorer (BaseDimensionScorer)
  |-- RelationshipsScorer (BaseDimensionScorer)
  |-- CSDMComplianceScorer (BaseDimensionScorer)
  |-- ClassificationScorer (BaseDimensionScorer)
  |-- OrphanAnalysisScorer (BaseDimensionScorer)
  |-- DuplicateDetectionScorer (BaseDimensionScorer)

PDFReportGenerator
  |-- BearingPDF (extends FPDF)

DOCXReportGenerator
  |-- python-docx Document

AIAnalyzer
  |-- AIClient
        |-- anthropic.Anthropic

PathfinderProcessor
  |-- ConfidenceStore (singleton)

ContourProcessor
  |-- ContourStore (singleton)
```

---

## 9. ServiceNow Table Access Pattern

Bearing accesses two categories of ServiceNow tables:

**Read-only (CMDB tables)**:
- `cmdb_ci` -- Base CI table. Used by most scorers.
- `cmdb_ci_server`, `cmdb_ci_app_server` -- Server subclasses.
- `cmdb_ci_service` -- Business services (CSDM layer).
- `cmdb_ci_service_auto` -- Application/technical services.
- `cmdb_ci_business_app` -- Business applications.
- `cmdb_rel_ci` -- CI relationships. Used by Relationships and Orphan scorers.
- `cmdb_rel_type` -- Relationship type definitions.
- `cmn_location` -- Location records.
- `discovery_status` -- Discovery scan results.
- `svc_ci_assoc` -- Service-CI associations (CSDM mapping).

**Write-only (Bearing-owned tables)**:
- `x_avnth_bearing_assessment` -- Assessment metadata and scores.
- `x_avnth_bearing_finding` -- Individual findings.
- `x_avnth_bearing_score` -- Dimension scores.
- `x_avnth_bearing_trend` -- Trend data points.
- `x_avnth_bearing_recommendation` -- Remediation recommendations.

The ServiceNow application (`servicenow/tables/`) defines XML table schemas for the five Bearing-owned tables.

---

## 10. Prototype Frontend

A separate React/Vite prototype exists at `/prototype/`. It runs on port 4201 and provides a visual dashboard with:

- Health score donut chart
- Dimension bar charts
- Findings table
- Fusion findings toggle (before/after Pathfinder)
- Health map visualization
- Maturity model display
- Executive report preview

The prototype uses static demo data (`data/demo-pre-pathfinder.ts`, `data/demo-post-pathfinder.ts`) and does not connect to the Bearing API. It serves as a design reference and sales demo tool.

Stack: React 18, React Router, Recharts, Tailwind CSS, Vite, TypeScript.
