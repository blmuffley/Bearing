# Bearing — Technical Architecture

## System Overview

Bearing is a Python/FastAPI backend that connects to a customer's ServiceNow instance via REST API, assesses CMDB health across eight dimensions, and writes results back to Bearing-owned ServiceNow tables (`x_avnth_bearing_*`).

```
┌──────────────────────────────────────────────────────────────────┐
│                  Bearing Backend (Python/FastAPI)                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Assessment    │  │ Scoring      │  │ Report Generator      │  │
│  │ Engine        │  │ Engine       │  │ (PDF, DOCX)           │  │
│  │              │  │              │  │                       │  │
│  │ • Orchestrator│  │ • 8 dims     │  │ • fpdf2 (PDF)         │  │
│  │ • Scheduler   │  │ • Weights    │  │ • python-docx (DOCX)  │  │
│  │ • Data fetch  │  │ • Maturity   │  │ • matplotlib charts   │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                  │                       │              │
│  ┌──────┴──────────────────┴───────────────────────┴──────────┐  │
│  │                    Core Services                            │  │
│  │  • ServiceNow REST Client (reads CMDB, writes Bearing)      │  │
│  │  • Claude API Client (AI analysis — optional)               │  │
│  │  • Pathfinder Webhook Receiver (confidence feed consumer)   │  │
│  │  • Contour Webhook Receiver (service model events)          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    API Layer (FastAPI)                      │  │
│  │  POST /api/v1/assessments          — trigger assessment    │  │
│  │  GET  /api/v1/assessments/{id}     — get assessment        │  │
│  │  GET  /api/v1/assessments          — list assessments      │  │
│  │  GET  /api/v1/scores/{id}          — dimension scores      │  │
│  │  GET  /api/v1/findings/{id}        — findings for run      │  │
│  │  GET  /api/v1/trends               — historical trends     │  │
│  │  POST /api/v1/reports/{id}/pdf     — generate PDF          │  │
│  │  POST /api/v1/reports/{id}/docx    — generate DOCX         │  │
│  │  POST /api/webhooks/pathfinder     — confidence feed       │  │
│  │  POST /api/webhooks/contour        — service model events  │  │
│  │  GET  /api/v1/health               — service health check  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│ ServiceNow CMDB │ │ Claude API      │ │ Pathfinder Gateway  │
│ (REST API)      │ │ (Anthropic SDK) │ │ (webhook publisher) │
└─────────────────┘ └─────────────────┘ └─────────────────────┘
```

## Data Flow

1. **Assessment triggered** — via API, schedule, or CoreX engagement
2. **CMDB data fetched** — ServiceNow REST client reads CI tables with pagination
3. **Eight dimensions scored** — each scorer queries specific tables, evaluates quality checks, produces 0-100 score and findings
4. **Fusion findings generated** — if Pathfinder confidence data exists, compare CMDB records with behavioral observation
5. **Composite score computed** — weighted sum of dimension scores
6. **Maturity level determined** — 5-level model based on score, CSDM adoption, discovery coverage
7. **Technical debt calculated** — dollar-value estimates per finding using configurable cost parameters
8. **Recommendations generated** — prioritized remediation actions with Avennorth product suggestions
9. **Results written** — to ServiceNow `x_avnth_bearing_*` tables and in-memory cache
10. **Reports available** — PDF/DOCX generation via API endpoints

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Python | 3.11+ |
| Framework | FastAPI | 0.115+ |
| Models | Pydantic v2 | 2.9+ |
| SN Client | requests + OAuth2 | 2.32+ |
| AI | anthropic SDK | 0.40+ |
| PDF | fpdf2 | 2.8+ |
| DOCX | python-docx | 1.1+ |
| Charts | matplotlib | 3.9+ |
| Scheduler | APScheduler | 3.10+ |
| Testing | pytest + pytest-asyncio | 8.3+ |
| Linting | ruff | 0.7+ |
| Types | mypy (strict) | 1.12+ |

## Deployment

- **Docker**: Multi-stage build, non-root user, single container
- **Port**: 8080 (backend API)
- **Prototype**: React/Vite on port 4201 (development only)
- **Configuration**: 12-factor via environment variables

## Security

- ServiceNow credentials: OAuth2 (preferred) or basic auth
- Webhook authentication: `X-Bearing-API-Key` header validation
- Write guard: ServiceNow client enforces `x_avnth_bearing_*` table prefix for all writes
- AI key: optional — all scoring is deterministic without Claude
- No secrets in code — all via environment variables
