---
outline: deep
---

# Changelog

All notable changes to the Bearing platform are documented here.

## v0.1.0 (Current)

Initial release of the Bearing CMDB Health Assessment platform.

### Features

- **8-Dimension Scoring Engine** -- Completeness, Accuracy, Currency, Classification, Relationships, CSDM Compliance, Duplicate Detection, and Orphan Analysis. Each dimension is independently weighted and produces a 0-100 score.

- **Pathfinder Fusion Engine** -- When Pathfinder behavioral data is available, generates fusion-only findings: Shadow IT detection, Ghost CI detection, behavioral class mismatch, unconfirmed relationship detection, and confidence gap analysis.

- **PDF and DOCX Report Generation** -- Avennorth-branded health scorecards with dimension score tables, top findings, maturity level, and technical debt estimates. Both PDF (fpdf2) and DOCX (python-docx) output formats supported.

- **React Prototype** -- Demo-only frontend with health gauge, dimension cards, findings table, maturity model, fusion view, and AI chatbot assistant. Uses static demo data for sales demonstrations.

- **AI Chatbot Assistant** -- Integrated AI assistant for explaining assessment results, answering questions about findings, and providing remediation guidance.

- **FastAPI Backend** -- RESTful API with assessment CRUD, dimension scores, findings, trend data, and report generation endpoints. Pydantic schema validation throughout.

- **Pathfinder Webhook Integration** -- Receives confidence feeds from Pathfinder via authenticated webhook endpoint. Stores CI confidence records for fusion scoring.

- **Contour Webhook Integration** -- Receives service model events from Contour for CSDM compliance scoring.

- **Docker Deployment** -- Multi-stage Dockerfile and docker-compose.yml for containerized deployment.

- **VitePress Documentation** -- Internal engineering docs and customer-facing product documentation sites.

### Architecture Note

::: info Architectural Migration
Bearing was originally designed as a Next.js/Supabase/TypeScript application (as documented in CLAUDE.md). During implementation, the architecture was migrated to Python/FastAPI to leverage the Python ecosystem for data analysis, matplotlib charting, and ServiceNow API integration. The CLAUDE.md file retains the original TypeScript-based design as a reference for the target architecture, while the current implementation is Python-based.
:::

### Known Limitations

- In-memory storage only (no persistence layer beyond ServiceNow write-through)
- Pathfinder confidence store does not persist or expire records
- React prototype uses static demo data, not connected to live backend
- PDF em-dash rendering requires ASCII dashes only
- pytest-asyncio pinned for Python 3.9 compatibility

See [Known Issues](./known-issues) for the full list.
