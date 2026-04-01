# CLAUDE.md — Avennorth Bearing

## What This Is

You are working on **Avennorth Bearing**, a CMDB health assessment platform for ServiceNow instances. Bearing connects to a customer's ServiceNow instance via REST API, scores CMDB quality across eight dimensions, quantifies technical debt in dollar terms, assigns a maturity level, and generates executive-ready reports. When Pathfinder is deployed, Bearing consumes its confidence feed to produce fusion findings — insights only visible by comparing CMDB records with live behavioral observation.

Bearing is part of the Avennorth product suite:
- **Bearing** — measures where you are (tech debt assessment)
- **Pathfinder** — discovers your terrain (CMDB-first service discovery via eBPF/ETW agents)
- **Contour** — plots your waypoints (service mapping intelligence suite)
- **Vantage** — spots wrong turns and reroutes (major incident investigation)
- **Compass** — the guide (collective CRM/sales platform where everything comes together)
- **UPM** — unified patch management

Narrative: **Assess → Discover → Map → Respond → Guide**

## Brand System

- **Colors**: Obsidian `#1C1917`, Electric Lime `#39FF14`
- **Typography**: Syne (headings), DM Sans (body), Space Mono (code/data)
- **Logo**: Open-path "AN" mark
- **Scope prefix**: `x_avnth_` (shared across all products)

---

## Bearing's Position

Bearing is the **wedge product**:

1. Get in the door — free or low-cost assessment that any organization can run
2. Reveal the problem — quantify CMDB gaps in terms the C-suite understands (dollars, risk, maturity level)
3. Sell the fix — Pathfinder + Contour are the obvious remediation once Bearing shows the damage
4. Measure progress — re-run Bearing after deployment to prove ROI

Bearing is **never the primary revenue driver**. It is the diagnostic that makes Pathfinder an obvious purchase.

### Product Relationships

```
Bearing ←── reads all CMDB tables (read-only analysis)
Bearing ←── consumes Pathfinder confidence feed (webhook)
Bearing ←── consumes Contour service model events (webhook)
Bearing ───→ writes assessment results to Bearing-owned tables
Bearing ───→ publishes assessment.completed events for other products
```

---

## Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Backend framework | FastAPI (Python 3.11+) | Async, OpenAPI docs auto-generated |
| Data models | Pydantic v2 | All request/response models, config validation |
| ServiceNow client | `requests` + OAuth2 | Token refresh, rate limiting, pagination |
| AI analysis | `anthropic` SDK | Claude for summaries, recommendations, narrative |
| PDF generation | `fpdf2` | Branded PDF reports with charts |
| DOCX generation | `python-docx` | Branded Word documents |
| Charts | `matplotlib` | Dimension score charts, trend lines, heatmaps |
| Scheduling | `APScheduler` | Cron-based assessment scheduling |
| Database | PostgreSQL (optional) | Local trend storage; can also use SN tables only |
| Testing | `pytest` + `pytest-asyncio` | 80%+ coverage target |
| Linting | `ruff` | Fast Python linter |
| Type checking | `mypy` | Strict mode |
| Prototype | React 18 + Vite + Tailwind | Port 4201, Recharts for visualization |

---

## CMDB Health Assessment — Eight Dimensions

Score the quality of existing CMDB data across eight dimensions. Each dimension produces a 0-100 score. The overall health score is a weighted composite.

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Completeness** | 20% | Percentage of CIs with required fields populated (name, class, IP, owner, support group, environment) |
| **Accuracy** | 15% | Do CIs match what discovery tools observe? Requires Pathfinder confidence feed or SN Discovery data for full scoring. Without discovery data, scores based on internal consistency checks only. |
| **Currency** | 15% | How stale is the data — last_update, last_discovered dates. CIs not updated in 90+ days flagged as stale. |
| **Relationships** | 15% | Are service dependencies mapped? Percentage of CIs with at least one relationship? Bidirectional? |
| **CSDM Compliance** | 10% | Which CSDM layers are populated (Business Service, Business App, Technical Service, Infrastructure)? What percentage of infrastructure CIs map up to a business service? |
| **Classification Quality** | 10% | Are CIs in correct classes? Servers classified as generic `cmdb_ci` instead of `cmdb_ci_linux_server`? |
| **Orphan Analysis** | 10% | CIs with zero relationships — no parents, no children, no dependencies. Invisible to service impact analysis. |
| **Duplicate Detection** | 5% | Potential duplicate CIs based on name similarity, IP address overlap, serial number matches. |

### Scoring Algorithm

```python
# Per-dimension scoring
dimension_score = (passing_checks / total_checks) * 100

# Overall health score
overall_score = sum(dimension.score * dimension.weight for dimension in dimensions)

# Letter grade mapping
# A: 90-100, B: 75-89, C: 60-74, D: 40-59, F: 0-39
```

---

## Maturity Model

Five-level CMDB maturity model:

| Level | Name | Criteria |
|-------|------|----------|
| **1** | Ad-hoc | Manual CI entry, no discovery tools, no CSDM, health score < 30 |
| **2** | Managed | Some discovery running, basic CI population, some relationships, health score 30-54 |
| **3** | Defined | CSDM partially adopted (2+ layers), automated discovery covering 60%+, health score 55-74 |
| **4** | Measured | Confidence scores on CIs, health monitoring active, automated governance, 80%+ coverage, health score 75-89 |
| **5** | Optimized | Full CSDM adoption (all 4 layers), autonomous CMDB operations, continuous assessment, health score 90+ |

---

## Technical Debt Quantification

| Finding | Cost Formula |
|---------|-------------|
| Servers with no application mapping | `count * avg_hours_to_map_manually * hourly_rate` |
| Undocumented integrations | `count * avg_additional_mttr_hours * hourly_rate * incidents_per_year` |
| Orphaned CIs | `count * risk_exposure_per_ci_per_year` |
| Stale CIs | `count * avg_hours_to_validate * hourly_rate` |
| Missing CSDM mapping | `unmapped_count * avg_mapping_hours * hourly_rate` |
| Duplicate CIs | `duplicate_count * avg_resolution_hours * hourly_rate` |

Default `hourly_rate`: $150/hr. All parameters customer-configurable.

---

## Data Model (ServiceNow Tables)

All tables use the `x_avnth_` scope prefix. Bearing only WRITES to its own tables. It READS from all CMDB tables but never modifies them.

### x_avnth_bearing_assessment
Assessment run metadata. One record per assessment execution. Fields: assessment_id, name, scope, target_scope, overall_score (0-100), maturity_level (1-5), findings_count, critical_findings, technical_debt_estimate, ci_count_assessed, has_pathfinder_data, has_contour_data, run_date, completed_date, status, ai_summary, triggered_by.

### x_avnth_bearing_finding
Individual findings. Fields: finding_id, assessment (ref), finding_type (gap/risk/recommendation/positive/fusion), severity, dimension, category, title, description, affected_ci (ref), affected_ci_class, affected_count, remediation, estimated_effort_hours, estimated_cost, avennorth_product, automation_potential, fusion_source.

### x_avnth_bearing_score
Per-dimension scores. Eight records per assessment run. Fields: score_id, assessment (ref), dimension, score (0-100), weight, checks_passed, checks_total, details.

### x_avnth_bearing_trend
Historical score tracking for trend charts. Fields: trend_id, assessment (ref), dimension or `overall`, score (0-100), run_date, delta_from_previous.

### x_avnth_bearing_recommendation
Prioritized remediation recommendations. Fields: recommendation_id, assessment (ref), priority, title, description, dimension, impact_score, effort, estimated_hours, estimated_cost_savings, avennorth_product, automation_potential.

---

## Pathfinder Confidence Feed

When Pathfinder is deployed, it publishes a confidence feed to Bearing via webhook: `POST /api/webhooks/pathfinder` with `X-Bearing-API-Key` header.

### Fusion Finding Types (requires Pathfinder data)

| Finding Type | Description |
|-------------|-------------|
| **Shadow IT** | CIs Pathfinder observes on the network with no CMDB record |
| **Ghost CIs** | CIs in the CMDB that Pathfinder never observes |
| **Misclassified CIs** | Pathfinder behavioral classification disagrees with CMDB class |
| **Unconfirmed Relationships** | CMDB relationships with no observed traffic |
| **Missing Relationships** | Pathfinder observes communication not in any CMDB relationship |
| **Confidence Gaps** | CIs with low confidence despite being marked "operational" |

---

## Project Structure

```
bearing/
├── CLAUDE.md
├── README.md
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── bearing/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI application entry point
│   │   ├── config.py                  # Pydantic settings
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py              # API route definitions
│   │   │   ├── webhooks.py            # Webhook endpoints (Pathfinder, Contour)
│   │   │   └── schemas.py             # Pydantic request/response models
│   │   ├── assessment/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py              # Assessment orchestrator
│   │   │   ├── dimensions/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py            # Base dimension scorer interface
│   │   │   │   ├── completeness.py
│   │   │   │   ├── accuracy.py
│   │   │   │   ├── currency.py
│   │   │   │   ├── relationships.py
│   │   │   │   ├── csdm_compliance.py
│   │   │   │   ├── classification.py
│   │   │   │   ├── orphan_analysis.py
│   │   │   │   └── duplicate_detection.py
│   │   │   ├── maturity.py            # Maturity model scorer
│   │   │   ├── debt.py                # Technical debt calculator
│   │   │   └── recommendations.py     # Recommendation engine
│   │   ├── fusion/
│   │   │   ├── __init__.py
│   │   │   ├── pathfinder.py          # Pathfinder confidence feed processor
│   │   │   ├── contour.py             # Contour service model processor
│   │   │   └── findings.py            # Fusion finding generator
│   │   ├── servicenow/
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # ServiceNow REST API client
│   │   │   ├── auth.py                # OAuth2 token management
│   │   │   ├── queries.py             # CMDB query builders
│   │   │   └── writer.py              # Write assessment results to SN
│   │   ├── reports/
│   │   │   ├── __init__.py
│   │   │   ├── pdf.py                 # PDF report generator (fpdf2)
│   │   │   ├── docx_report.py         # DOCX report generator (python-docx)
│   │   │   ├── charts.py              # matplotlib chart generation
│   │   │   └── templates/
│   │   │       ├── __init__.py
│   │   │       ├── health_scorecard.py
│   │   │       ├── technical_debt.py
│   │   │       ├── maturity_report.py
│   │   │       ├── recommendations.py
│   │   │       └── before_after.py
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # Claude API client (anthropic SDK)
│   │   │   ├── prompts.py             # Prompt templates for analysis
│   │   │   └── analysis.py            # AI-powered analysis generation
│   │   └── scheduler/
│   │       ├── __init__.py
│   │       └── jobs.py                # APScheduler job definitions
│   └── tests/
│       ├── conftest.py
│       ├── test_assessment/
│       │   ├── test_engine.py
│       │   ├── test_completeness.py
│       │   ├── test_accuracy.py
│       │   ├── test_currency.py
│       │   ├── test_relationships.py
│       │   ├── test_csdm.py
│       │   ├── test_classification.py
│       │   ├── test_orphans.py
│       │   ├── test_duplicates.py
│       │   ├── test_maturity.py
│       │   └── test_debt.py
│       ├── test_fusion/
│       │   ├── test_pathfinder.py
│       │   └── test_findings.py
│       ├── test_reports/
│       │   ├── test_pdf.py
│       │   └── test_docx.py
│       └── test_api/
│           ├── test_routes.py
│           └── test_webhooks.py
├── prototype/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   └── avennorth-logo.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── theme.ts
│       ├── data/
│       │   ├── demo-pre-pathfinder.ts
│       │   └── demo-post-pathfinder.ts
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Sidebar.tsx
│       │   ├── ThemeToggle.tsx
│       │   ├── ScoreDonut.tsx
│       │   ├── DimensionBar.tsx
│       │   ├── MaturityScale.tsx
│       │   ├── TrendChart.tsx
│       │   ├── FindingsTable.tsx
│       │   ├── HealthMap.tsx
│       │   ├── DebtCard.tsx
│       │   └── FusionToggle.tsx
│       └── pages/
│           ├── Dashboard.tsx
│           ├── Findings.tsx
│           ├── HealthMap.tsx
│           ├── MaturityModel.tsx
│           ├── ExecutiveReport.tsx
│           ├── FusionFindings.tsx
│           └── BeforeAfter.tsx
├── servicenow/
│   ├── tables/
│   │   ├── x_avnth_bearing_assessment.xml
│   │   ├── x_avnth_bearing_finding.xml
│   │   ├── x_avnth_bearing_score.xml
│   │   ├── x_avnth_bearing_trend.xml
│   │   └── x_avnth_bearing_recommendation.xml
│   ├── workspace/
│   │   ├── bearing_dashboard.json
│   │   ├── findings_explorer.json
│   │   ├── health_map.json
│   │   ├── maturity_model.json
│   │   ├── executive_report.json
│   │   └── pathfinder_fusion.json
│   └── rest_api/
│       └── bearing_api_v1.js
└── docs/
    ├── architecture.md
    ├── assessment-engine.md
    ├── maturity-model.md
    ├── pathfinder-integration.md
    ├── product-spec.md
    └── business-case.md
```

---

## Coding Conventions

### Python
- Python 3.11+ required
- Type hints on all functions and variables
- Pydantic v2 for all data models
- FastAPI with async endpoints
- `anthropic` SDK for Claude API calls
- Docstrings on all public functions (Google style)
- `ruff` for linting, `mypy --strict` for type checking
- `pytest` for testing, `pytest-asyncio` for async tests
- Target 80%+ test coverage

### ServiceNow
- Scope prefix: `x_avnth_`
- All tables use `sys_id` as primary key
- Scripted REST API versioned under `/api/x_avnth/bearing/v1/`
- Polaris workspace for all UI
- Flow Designer for automated workflows
- No display business rules that use GlideRecord

### React Prototype
- TypeScript strict mode
- Functional components with hooks
- Tailwind CSS with design tokens from theme system
- Recharts for data visualization
- React Router v6 for navigation
- No external UI component libraries — build from Avennorth design system

### General
- Git: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- CI/CD: GitHub Actions
- Docker: multi-stage builds, non-root user
- Environment variables for all configuration (12-factor)
- No hardcoded ServiceNow instance URLs, API keys, or credentials

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BEARING_SN_INSTANCE` | Yes | ServiceNow instance URL |
| `BEARING_SN_CLIENT_ID` | Yes | ServiceNow OAuth2 client ID |
| `BEARING_SN_CLIENT_SECRET` | Yes | ServiceNow OAuth2 client secret |
| `BEARING_SN_USERNAME` | Yes | ServiceNow service account username |
| `BEARING_SN_PASSWORD` | Yes | ServiceNow service account password |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI analysis |
| `BEARING_API_KEY` | Yes | API key for Bearing's own endpoints (Pathfinder webhook) |
| `BEARING_DB_URL` | No | PostgreSQL URL for local trend storage |
| `BEARING_PORT` | No | Server port (default: 8080) |
| `BEARING_LOG_LEVEL` | No | Logging level (default: INFO) |
| `BEARING_SCHEDULE_CRON` | No | Cron expression for scheduled assessments |

---

## Constraints

1. **Standalone operation:** Bearing MUST work without Pathfinder, Contour, or any other Avennorth product.
2. **Read-only CMDB access:** Bearing NEVER modifies CMDB data. Writes only to `x_avnth_bearing_*` tables.
3. **Discovery-agnostic:** Works with ServiceNow Discovery, Armis, Pathfinder, BMC, or manual data.
4. **Shared namespace:** All ServiceNow tables use `x_avnth_` scope prefix.
5. **ServiceNow Utah+ compatibility.**
6. **No kernel-level components:** Pure application-layer software.
7. **Pathfinder feed is additive:** Enriches but never required.
8. **AI analysis is optional:** All scoring is deterministic. Claude enhances output but is not a dependency.
9. **Report branding:** All reports use Avennorth brand assets.
10. **Port 4201:** Prototype runs on port 4201 per Avennorth port registry.

---

## Demo Data: Mercy Health System

Fictional customer for all demo scenarios.

- **Total CIs:** ~18,000 | **Servers:** ~4,200 | **Applications:** ~340
- **Pre-Pathfinder:** Overall 34/100, Maturity Level 1, $2.4M debt, 214 findings (47 critical)
- **Post-Pathfinder (30 days):** Overall 82/100, Maturity Level 3, $620K debt, 62 findings (8 critical)

---

## File Output Rules

**These rules are critical. Follow them exactly.**

1. **Code stays in this Git repo.** Python, TypeScript, JavaScript, ServiceNow XML — all here in `~/Code/Bearing/`.
2. **Generated documents go to iCloud:**
   `~/Library/Mobile Documents/com~apple~CloudDocs/Projects/Avennorth/Solutions/Bearing/`
3. **Never duplicate files** between this repo and iCloud. Code here, outputs there.
4. **Brand assets** are sourced from `iCloud/Projects/Avennorth/Brand/` — never copy into this repo.
5. **Corporate-level docs** (company business case, combined financials, patents) go to `iCloud/Projects/Avennorth/Corporate/`, NOT into Bearing's solution folder.

### iCloud Output Paths

| Category | Destination |
|----------|------------|
| Bearing docs | `Avennorth/Solutions/Bearing/Docs/` |
| Bearing diagrams | `Avennorth/Solutions/Bearing/Diagrams/` |
| Bearing financials | `Avennorth/Solutions/Bearing/Financial/` |
| Presentations | `Avennorth/Solutions/Bearing/Presentations/` |
| Company business cases | `Avennorth/Corporate/Business-Cases/` |
| Company financials | `Avennorth/Corporate/Financial/` |
| Company sales materials | `Avennorth/Corporate/Sales/` |

### Markdown Rule

Every `.md` file that will be shared externally must have a `.docx` or `.pptx` companion. MDs go in a `markdown/` subfolder; the shareable version goes in the parent folder.
