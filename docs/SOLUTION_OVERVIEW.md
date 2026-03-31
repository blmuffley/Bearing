# Avennorth Bearing -- Solution Overview

> **Master index document for the Bearing codebase.**
> Last updated: 2026-03-29 | Version 1.0.0 | 105 source files

---

## Table of Contents

1. [Solution Summary](#1-solution-summary)
2. [Architecture](#2-architecture)
3. [Complete File Index](#3-complete-file-index)
4. [Data Flow](#4-data-flow)
5. [Key Formulas](#5-key-formulas)
6. [Route Map](#6-route-map)
7. [Database Tables](#7-database-tables)
8. [Scan Rules Summary](#8-scan-rules-summary)
9. [Technology Stack](#9-technology-stack)
10. [Build & Development](#10-build--development)
11. [Related Documentation](#11-related-documentation)

---

## 1. Solution Summary

**Bearing** is a technical debt assessment platform for ServiceNow instances. It connects to (or ingests data from) a customer's ServiceNow environment, scans configuration metadata across all major platform domains, scores technical debt by severity/effort/risk, and produces remediation backlogs with effort estimates that feed into SOW generation.

### Who Uses It

Bearing is built for **ServiceNow consulting firms**. The primary users are:

- **Consultants** who run assessments against customer instances and generate proposals
- **Practice leaders** who track pipeline revenue from assessment-driven engagements
- **Customers** who receive white-labeled assessment reports (read-only, no pricing)

### Where It Fits

Bearing is part of the **Avennorth product suite** -- five products that form a complete ServiceNow services intelligence platform:

| Product | Purpose | Narrative |
|---------|---------|-----------|
| **Bearing** | Measures where you are (tech debt assessment) | Assess |
| **Pathfinder** | Discovers your terrain (CMDB-first service discovery via eBPF/ETW agents) | Discover |
| **Contour** | Plots your waypoints (service mapping intelligence suite) | Map |
| **Vantage** | Spots wrong turns and reroutes (major incident investigation) | Respond |
| **Compass** | The guide (collective CRM/sales platform) | Guide |

### Key Metrics

| Metric | Count |
|--------|-------|
| Source files (TypeScript/TSX) | 105 |
| Routes (pages + API) | 30 |
| Scan rules (debt detection) | 23 |
| Database tables | 10 |
| Scanner modules | 4 (core, cmdb, itsm, itam) |
| Document generators | 3 (consultant report, customer report, SOW) |
| Remediation patterns | 12 |
| ServiceNow modules supported | 11 |

### Core Design Principles

1. **Revenue-first, not findings-first** -- every screen leads with dollar amounts
2. **org_id on everything** -- multi-tenancy via Supabase RLS is non-negotiable
3. **Export-first, API-second** -- export scanner works before live API connection
4. **Dual reports from single scan** -- one scan, one findings set, two report views
5. **Patterns, not one-offs** -- every finding maps to a remediation pattern with SOW templates
6. **Pathfinder is additive** -- everything works without Pathfinder; richer when present

---

## 2. Architecture

Bearing is a **Next.js App Router** application with a tRPC backend, Supabase (PostgreSQL) database, and a modular scanning/scoring engine.

### High-Level Architecture

```
Browser (React + Tailwind)
    |
    v
Next.js App Router (SSR + Client)
    |
    +-- Pages (Dashboard, Assessments, Connections, Settings, SOW Pipeline, Monitoring)
    |
    +-- tRPC Layer (type-safe RPC)
    |       |
    |       +-- assessments / findings / sow / pathfinder / benchmarks routers
    |
    +-- API Routes (REST endpoints for webhooks, file upload, report download)
    |
    v
Server Layer
    |
    +-- Scanner Engine (export parser, live scanner, instance scan importer)
    |       |
    |       +-- Module Rules (core, cmdb, itsm, itam)
    |
    +-- Scoring Engine (composite scorer, health index, pathfinder fusion)
    |
    +-- Report Generators (consultant DOCX, customer DOCX, SOW DOCX)
    |
    +-- Integrations (Pathfinder confidence, Compass CRM sync)
    |
    +-- Background Jobs (benchmarks, calibration, decay, monitoring)
    |
    v
Supabase (PostgreSQL + RLS)
```

### Architecture Diagrams

The following SVG diagrams are available in `docs/diagrams/`:

| Diagram | File | Description |
|---------|------|-------------|
| Master Architecture | `00_master_architecture_overview.svg` | Full system architecture with all layers |
| Core Domain ERD | `01_erd_core_domain.svg` | Organizations, users, connections entity relationships |
| Scanning & Scoring ERD | `02_erd_scanning_scoring.svg` | Assessments, findings, scan rules, remediation patterns |
| Pathfinder & Benchmarks ERD | `03_erd_pathfinder_benchmarks.svg` | Pathfinder confidence, benchmark data, SOWs |
| Assessment Lifecycle | `04_process_assessment_lifecycle.svg` | End-to-end assessment workflow from upload to report |
| SOW Pipeline | `05_process_sow_pipeline.svg` | Finding selection through SOW generation and tracking |
| Pathfinder Integration | `06_process_pathfinder_integration.svg` | Confidence feed ingestion and fusion scoring |
| Product Suite Overview | `07_product_suite_overview.svg` | Avennorth suite relationships and data flows |

---

## 3. Complete File Index

### Configuration

| File | Location | Description |
|------|----------|-------------|
| `package.json` | `/` | Project manifest with dependencies (Next.js 16, tRPC 11, Supabase, docx, Zod 4) |
| `tsconfig.json` | `/` | TypeScript configuration with path aliases (`@/` maps to `src/`) |
| `next.config.ts` | `/` | Next.js App Router configuration |
| `tailwind.config.ts` | `/` | Tailwind CSS configuration with Avennorth brand tokens |
| `postcss.config.js` | `/` | PostCSS configuration for Tailwind processing |
| `.env.example` | `/` | Environment variable template (Supabase, ServiceNow OAuth, encryption keys) |
| `.gitignore` | `/` | Git ignore rules for node_modules, .env, .next, etc. |
| `CLAUDE.md` | `/` | AI assistant context file with full project specification and rules |

### TypeScript Types

| File | Location | Description |
|------|----------|-------------|
| `assessment.ts` | `src/types/` | Core domain types: Assessment, InstanceConnection, Organization, User, ScanRule, BenchmarkData, Module enum (11 modules), Severity, ScanType |
| `finding.ts` | `src/types/` | Finding and RemediationPattern types with evidence structure, severity/effort maps, and penalty configuration |
| `pathfinder.ts` | `src/types/` | Pathfinder webhook payload types: ConfidenceFeed, ConfidenceRecord, CoverageSummary, CoverageZone (4-zone map), TrafficState, BehavioralClassification |
| `servicenow.ts` | `src/types/` | ServiceNow API types: TableApiParams, PaginatedResponse, OAuth/Basic auth configs, typed table unions for all 11 modules (80+ table types) |
| `sow.ts` | `src/types/` | SOW generation types: RateCard, RevenueProjection, SowConfig, SowDocument, SowMilestone, EngagementType (T&M, fixed-fee, blended) |

### App Pages -- Root

| File | Location | Description |
|------|----------|-------------|
| `layout.tsx` | `src/app/` | Root layout with HTML structure, font loading (Syne, DM Sans, Space Mono), and global providers |
| `page.tsx` | `src/app/` | Landing page / marketing entry point |
| `globals.css` | `src/app/` | Global CSS with Tailwind directives and Avennorth design tokens |

### App Pages -- Dashboard

| File | Location | Description |
|------|----------|-------------|
| `layout.tsx` | `src/app/(dashboard)/` | Dashboard shell with sidebar navigation, org context, and auth guard |
| `page.tsx` | `src/app/(dashboard)/assessments/` | Assessment list view with status badges, health scores, and new assessment CTA |
| `page.tsx` | `src/app/(dashboard)/assessments/new/` | Upload/connect wizard -- JSON export upload or ServiceNow API connection |
| `page.tsx` | `src/app/(dashboard)/assessments/[id]/` | Assessment detail dashboard with health gauge, revenue summary, domain scores, findings table |
| `loading.tsx` | `src/app/(dashboard)/assessments/[id]/` | Loading skeleton displayed while assessment data is fetched |
| `page.tsx` | `src/app/(dashboard)/assessments/[id]/findings/` | Full findings view with sort/filter by module, severity, effort, and composite score |
| `page.tsx` | `src/app/(dashboard)/assessments/[id]/pathfinder/` | Pathfinder detail view with confidence data, fusion findings, and coverage zone map |
| `page.tsx` | `src/app/(dashboard)/assessments/[id]/report/` | Report download page for consultant and customer DOCX reports |
| `page.tsx` | `src/app/(dashboard)/assessments/[id]/sow/` | SOW builder -- select findings, configure engagement, generate DOCX |
| `page.tsx` | `src/app/(dashboard)/assessments/[id]/sow/tracking/` | SOW tracking view showing status pipeline (draft through accepted/declined) |
| `SowTrackingList.tsx` | `src/app/(dashboard)/assessments/[id]/sow/tracking/` | Client component rendering the list of tracked SOWs with status indicators |
| `page.tsx` | `src/app/(dashboard)/assessments/[id]/trends/` | Trends and benchmarks view with multi-assessment comparison and peer cohort data |
| `AssessmentComparisonTable.tsx` | `src/app/(dashboard)/assessments/[id]/trends/` | Client component displaying side-by-side assessment comparison across time |
| `page.tsx` | `src/app/(dashboard)/connections/` | Instance connection list with status indicators and scan controls |
| `page.tsx` | `src/app/(dashboard)/connections/new/` | Add connection wizard for OAuth, basic auth, or export-only connections |
| `page.tsx` | `src/app/(dashboard)/connections/[id]/` | Connection detail with instance metadata, scan history, and test controls |
| `ScanButtonClient.tsx` | `src/app/(dashboard)/connections/[id]/` | Client component for triggering live scans with progress feedback |
| `page.tsx` | `src/app/(dashboard)/settings/` | Settings landing page with navigation to rate card, branding, and team management |
| `page.tsx` | `src/app/(dashboard)/settings/rate-card/` | Rate card configuration -- roles, hourly rates, engagement type defaults, margin targets |
| `page.tsx` | `src/app/(dashboard)/settings/branding/` | White-label branding configuration -- logo upload, colors, legal boilerplate |
| `page.tsx` | `src/app/(dashboard)/settings/team/` | Team management -- invite members, assign roles (admin, member, viewer) |
| `page.tsx` | `src/app/(dashboard)/sow-pipeline/` | Kanban-style SOW pipeline across all assessments (draft, sent, review, accepted, declined) |
| `page.tsx` | `src/app/(dashboard)/monitoring/` | Fleet monitoring dashboard with health trends across all connected instances |
| `MonitoringSparkline.tsx` | `src/app/(dashboard)/monitoring/` | Client component rendering inline sparkline charts for health score trends |

### API Routes

| File | Location | Description |
|------|----------|-------------|
| `route.ts` | `src/app/api/trpc/[trpc]/` | tRPC HTTP handler -- catch-all route that delegates to the appRouter |
| `route.ts` | `src/app/api/export/upload/` | POST endpoint for JSON export file upload, validates and triggers scan |
| `_shared.ts` | `src/app/api/reports/` | Shared utilities for report routes (auth checks, Supabase client init, response helpers) |
| `route.ts` | `src/app/api/reports/consultant/` | GET endpoint generating and returning the consultant DOCX report (with pricing) |
| `route.ts` | `src/app/api/reports/customer/` | GET endpoint generating and returning the customer DOCX report (white-labeled, no pricing) |
| `route.ts` | `src/app/api/reports/sow/` | GET/POST endpoint for SOW document generation and download |
| `route.ts` | `src/app/api/connections/` | GET/POST for listing and creating instance connections |
| `route.ts` | `src/app/api/connections/test/` | POST endpoint to test a ServiceNow connection (verify credentials and reachability) |
| `route.ts` | `src/app/api/connections/[id]/scan/` | POST endpoint to trigger a live scan on a connected instance |
| `route.ts` | `src/app/api/webhooks/pathfinder/` | POST webhook receiver for Pathfinder confidence feed payloads (API key auth) |

### UI Components

| File | Location | Description |
|------|----------|-------------|
| `Badge.tsx` | `src/components/ui/` | Reusable badge component with severity-colored variants |
| `Card.tsx` | `src/components/ui/` | Card container component with Avennorth styling |
| `HealthGauge.tsx` | `src/components/dashboard/` | Visual 0-100 health score gauge with color gradient (red to green) |
| `RevenueSummary.tsx` | `src/components/dashboard/` | Total addressable remediation revenue display with hour ranges |
| `DomainScoreCards.tsx` | `src/components/dashboard/` | Per-module health score cards with module icons and score bars |
| `FindingsTable.tsx` | `src/components/dashboard/` | Sortable, filterable findings table with severity badges and effort indicators |
| `CoverageZoneMap.tsx` | `src/components/dashboard/` | Four-zone Pathfinder coverage visualization (Fully Covered, Pathfinder-Only, Discovery-Only, Dark) |
| `PathfinderInsights.tsx` | `src/components/dashboard/` | Pathfinder integration summary with fusion finding highlights |
| `ConfidenceTable.tsx` | `src/components/dashboard/` | Table of CI confidence scores from Pathfinder with traffic state indicators |
| `TrendChart.tsx` | `src/components/dashboard/` | Multi-assessment trend line chart showing health score over time |
| `BenchmarkComparison.tsx` | `src/components/dashboard/` | Peer benchmark comparison showing position against anonymized cohort |
| `AlertsPanel.tsx` | `src/components/dashboard/` | Alert notifications panel for health score drops and new critical findings |
| `CalibrationInsights.tsx` | `src/components/dashboard/` | Display of calibration accuracy data showing estimate vs. actual hours |
| `ReportActions.tsx` | `src/components/reports/` | Report download buttons for consultant and customer report variants |
| `ConnectionTestResult.tsx` | `src/components/connections/` | Connection test result display with success/error details |
| `SowBuilder.tsx` | `src/components/sow/` | Finding selection interface with engagement configuration for SOW generation |
| `SowPreview.tsx` | `src/components/sow/` | Live preview of the SOW document as findings and settings are configured |
| `SowStatusPipeline.tsx` | `src/components/sow/` | Visual pipeline showing SOW status progression from draft to accepted |

### Libraries & Utilities

| File | Location | Description |
|------|----------|-------------|
| `constants.ts` | `src/lib/` | Brand colors (Obsidian, Electric Lime), fonts, severity scores, module definitions, MODULE_TABLES mapping (80+ ServiceNow tables), score weights |
| `encryption.ts` | `src/lib/` | AES encryption/decryption for stored ServiceNow credentials |
| `client.ts` | `src/lib/supabase/` | Browser-side Supabase client initialization |
| `server.ts` | `src/lib/supabase/` | Server-side Supabase client with service role key and RLS context |
| `api.ts` | `src/lib/servicenow/` | ServiceNow REST Table API client with pagination, rate limiting, and error handling |
| `auth.ts` | `src/lib/servicenow/` | OAuth 2.0 (Authorization Code + Client Credentials) and Basic Auth handlers |
| `tables.ts` | `src/lib/servicenow/` | ServiceNow table name constants organized by module |
| `client.ts` | `src/lib/trpc/` | tRPC client configuration with SuperJSON transformer |
| `provider.tsx` | `src/lib/trpc/` | React Query + tRPC provider wrapper for client components |

### Server: tRPC

| File | Location | Description |
|------|----------|-------------|
| `init.ts` | `src/server/trpc/` | tRPC initialization with SuperJSON, public and protected procedures |
| `context.ts` | `src/server/trpc/` | Request context factory -- extracts auth session and org_id from request |
| `router.ts` | `src/server/trpc/` | Root appRouter merging all sub-routers (assessments, findings, sow, pathfinder, benchmarks) |
| `assessments.ts` | `src/server/trpc/routers/` | Assessment CRUD operations: list, getById, create, triggerScan, getStatus |
| `findings.ts` | `src/server/trpc/routers/` | Finding queries: list by assessment, filter by module/severity, get detail |
| `sow.ts` | `src/server/trpc/routers/` | SOW operations: generate, list, updateStatus, getDocument |
| `pathfinder.ts` | `src/server/trpc/routers/` | Pathfinder data queries: getConfidence, getCoverage, getFusionFindings |
| `benchmarks.ts` | `src/server/trpc/routers/` | Benchmark queries: getCohortData, getAssessmentPosition, getTrends |

### Server: Scanner Engine

| File | Location | Description |
|------|----------|-------------|
| `engine.ts` | `src/server/scanner/` | Scan orchestrator -- iterates rules, evaluates export data, computes scores, returns ScanResult with findings, health score, and domain scores |
| `export-parser.ts` | `src/server/scanner/` | Zod-validated JSON export payload parser with schemas for all ServiceNow record types |
| `live-scanner.ts` | `src/server/scanner/` | Live scan engine that connects to ServiceNow REST API, queries tables, converts to ExportPayload format, and reuses ScanEngine rules |
| `instance-scan-importer.ts` | `src/server/scanner/` | Imports findings from ServiceNow's built-in Instance Scan (scan_finding/scan_finding_entry tables) and maps to Bearing format |
| `scripting-debt.ts` | `src/server/scanner/modules/core/` | 4 rules: hard-coded sys_ids, duplicate business rules, client-server anti-pattern, synchronous AJAX calls |
| `update-set-debt.ts` | `src/server/scanner/modules/core/` | 3 rules: stale update sets (90+ days), update set collisions, direct production changes |
| `security-acl-debt.ts` | `src/server/scanner/modules/core/` | 3 rules: overly permissive ACLs, redundant ACLs, elevated role assignments |
| `data-quality.ts` | `src/server/scanner/modules/cmdb/` | 4 rules: stale CIs, orphaned CIs, missing discovery source, duplicate CIs |
| `incident-health.ts` | `src/server/scanner/modules/itsm/` | 4 rules: unassigned incidents, miscategorized incidents, aged open incidents, incident reopens |
| `change-health.ts` | `src/server/scanner/modules/itsm/` | 3 rules: emergency change ratio, unauthorized changes, missing backout plans |
| `ham-reconciliation.ts` | `src/server/scanner/modules/itam/` | 2 rules: unreconciled hardware assets, expired warranty assets |

### Server: Scoring

| File | Location | Description |
|------|----------|-------------|
| `composite-scorer.ts` | `src/server/scoring/` | Composite score formula: `(severity * 0.4) + (effortInverse * 0.3) + (risk * 0.3)` -- quick fixes with high severity score highest |
| `health-index.ts` | `src/server/scoring/` | Health score (0-100) via weighted penalty model and per-domain score aggregation |
| `pathfinder-fusion.ts` | `src/server/scoring/` | Fusion scoring engine: 5 fusion-only rules (Active/Idle mismatch, Retired/Active mismatch, class mismatch, shadow IT, unconfirmed relationships) plus enhanced findings with Pathfinder confidence overlay |

### Server: Reporting

| File | Location | Description |
|------|----------|-------------|
| `revenue-calculator.ts` | `src/server/reporting/` | Applies rate card to findings to produce revenue projections with per-module breakdown and quick-win identification |
| `consultant-report.ts` | `src/server/reporting/` | DOCX generator for internal consultant report with full pricing, margin analysis, and revenue projections (CONFIDENTIAL) |
| `customer-report.ts` | `src/server/reporting/` | DOCX generator for customer-facing report -- white-labeled with org branding, risk-focused, NO pricing or hours |
| `sow-generator.ts` | `src/server/reporting/` | DOCX generator for Statement of Work with scope, assumptions, deliverables, timeline, milestones, and pricing from remediation pattern templates |

### Server: Integrations

| File | Location | Description |
|------|----------|-------------|
| `confidence-ingester.ts` | `src/server/integrations/pathfinder/` | Processes incoming Pathfinder confidence feed webhooks, validates schema, upserts into pathfinder_confidence table |
| `coverage-analyzer.ts` | `src/server/integrations/pathfinder/` | Four-zone coverage analysis comparing CMDB CIs against Pathfinder data (Fully Covered, Pathfinder-Only, Discovery-Only, Dark) |
| `deployment-recommender.ts` | `src/server/integrations/pathfinder/` | Generates Pathfinder deployment recommendations for uncovered subnets based on CMDB/ITOM discovery gaps |
| `pipeline-sync.ts` | `src/server/integrations/compass/` | Syncs SOW status and assessment data to Compass CRM via webhook (placeholder endpoint, contract pending) |

### Server: Background Jobs

| File | Location | Description |
|------|----------|-------------|
| `benchmark-aggregator.ts` | `src/server/jobs/` | Anonymizes and aggregates assessment data into cohort benchmarks by industry, size tier, and platform version (min cohort size: 10) |
| `calibration-tracker.ts` | `src/server/jobs/` | Tracks actual engagement hours vs. Bearing estimates, computes calibration factors per remediation pattern (min 3 samples) |
| `assessment-decay.ts` | `src/server/jobs/` | Time-decay visibility manager: full (0-30 days), reduced (31-60), summary (61-90), expired (90+) |
| `continuous-monitor.ts` | `src/server/jobs/` | Scheduled recurring scans with threshold-based alerts for health score drops and new critical findings |

### Database

| File | Location | Description |
|------|----------|-------------|
| `00001_initial_schema.sql` | `supabase/migrations/` | Complete schema: 10 tables, RLS policies, indexes, pgcrypto extension |
| `seed.sql` | `supabase/` | 12 remediation patterns + 12 core scan rules with query configs and thresholds |

### Documentation

| File | Location | Description |
|------|----------|-------------|
| `01_architecture_overview.md` | `docs/internal/` | Internal architecture documentation |
| `02_database_schema.md` | `docs/internal/` | Database schema reference |
| `03_scan_rules_catalog.md` | `docs/internal/` | Complete scan rules catalog with evaluation logic |
| `04_integrations.md` | `docs/internal/` | Integration specifications (Pathfinder, Compass) |
| `05_patent_claims.md` | `docs/internal/` | Provisional patent claim language and implementation mapping |
| `06_deployment_guide.md` | `docs/internal/` | Deployment and infrastructure guide |
| `01_getting_started.md` | `docs/customer/` | Customer onboarding guide |
| `02_assessment_guide.md` | `docs/customer/` | How to run and interpret assessments |
| `03_reports_and_sow.md` | `docs/customer/` | Report and SOW feature guide |
| `04_connections_guide.md` | `docs/customer/` | ServiceNow instance connection setup guide |
| `05_faq.md` | `docs/customer/` | Frequently asked questions |

### Diagrams

| File | Location | Description |
|------|----------|-------------|
| `00_master_architecture_overview.svg` | `docs/diagrams/` | Full system architecture diagram |
| `01_erd_core_domain.svg` | `docs/diagrams/` | Entity relationship diagram: organizations, users, connections |
| `02_erd_scanning_scoring.svg` | `docs/diagrams/` | Entity relationship diagram: assessments, findings, scan rules, patterns |
| `03_erd_pathfinder_benchmarks.svg` | `docs/diagrams/` | Entity relationship diagram: Pathfinder confidence, benchmarks, SOWs |
| `04_process_assessment_lifecycle.svg` | `docs/diagrams/` | Process flow: assessment lifecycle from upload to report |
| `05_process_sow_pipeline.svg` | `docs/diagrams/` | Process flow: SOW generation and tracking pipeline |
| `06_process_pathfinder_integration.svg` | `docs/diagrams/` | Process flow: Pathfinder confidence ingestion and fusion |
| `07_product_suite_overview.svg` | `docs/diagrams/` | Avennorth product suite relationships |

---

## 4. Data Flow

### End-to-End Assessment Flow

```
1. DATA INGESTION
   User uploads JSON export  -or-  Triggers live API scan  -or-  Imports Instance Scan data
        |                              |                              |
        v                              v                              v
   export-parser.ts              live-scanner.ts           instance-scan-importer.ts
        |                              |                              |
        +------------ All produce ExportPayload format ---------------+
                                       |
2. SCANNING                            v
                               engine.ts (ScanEngine)
                                       |
              +------------------------+------------------------+
              |                        |                        |
        Core Rules (10)          CMDB Rules (4)          ITSM Rules (7)    ITAM Rules (2)
   scripting-debt.ts           data-quality.ts      incident-health.ts    ham-reconciliation.ts
   update-set-debt.ts                               change-health.ts
   security-acl-debt.ts
              |                        |                        |
              +------------------------+------------------------+
                                       |
3. SCORING                             v
                            composite-scorer.ts
                          (score each finding)
                                       |
                                       v
                            health-index.ts
                      (domain + instance health 0-100)
                                       |
                      (if Pathfinder data exists)
                                       v
                          pathfinder-fusion.ts
                    (5 fusion rules + confidence overlay)
                                       |
4. STORAGE                             v
                              Supabase (PostgreSQL)
                         assessments + findings tables
                                       |
5. REVENUE                             v
                          revenue-calculator.ts
                    (rate card x effort hours = revenue)
                                       |
6. OUTPUT                              v
              +------------------------+------------------------+
              |                        |                        |
   consultant-report.ts       customer-report.ts        sow-generator.ts
   (DOCX, with pricing)      (DOCX, no pricing)       (DOCX, engagement proposal)
              |                        |                        |
              v                        v                        v
     Internal Report          Customer Report          Statement of Work
```

### Pathfinder Integration Flow

```
Pathfinder Agent (eBPF/ETW)
        |
        v
POST /api/webhooks/pathfinder (API key auth)
        |
        v
confidence-ingester.ts --> pathfinder_confidence table
        |
        +---> coverage-analyzer.ts (four-zone map)
        |
        +---> pathfinder-fusion.ts (fusion scoring with assessment data)
        |
        +---> deployment-recommender.ts (deploy recommendations for dark zones)
```

### SOW Pipeline Flow

```
Assessment Complete
        |
        v
SowBuilder.tsx (select findings + configure engagement)
        |
        v
sow-generator.ts (generate DOCX from remediation pattern templates)
        |
        v
generated_sows table (status: draft)
        |
        v
SowStatusPipeline.tsx (draft -> sent -> under_review -> accepted/declined)
        |
        v
pipeline-sync.ts (sync to Compass CRM)
```

---

## 5. Key Formulas

### Composite Score (Finding Priority)

```
composite = (severity * 0.4) + (effortInverse * 0.3) + (risk * 0.3)
```

| Severity | Value | | Effort | Inverse Value |
|----------|-------|-|--------|---------------|
| Critical | 4     | | XS     | 5             |
| High     | 3     | | S      | 4             |
| Medium   | 2     | | M      | 3             |
| Low      | 1     | | L      | 2             |
|          |       | | XL     | 1             |

**Why effort is inverted**: Quick fixes (XS/S) score higher because they are the easiest wins for consultants to sell and deliver. A critical-severity, XS-effort finding scores `(4*0.4) + (5*0.3) + (risk*0.3)` -- the highest possible priority.

### Health Score (0-100)

```
health = max(0, round(100 - min(totalPenalty, 100)))

totalPenalty = sum(penaltyPerSeverity[severity] * affectedCount)
```

| Severity | Penalty per Finding |
|----------|-------------------|
| Critical | 5.0 |
| High     | 3.0 |
| Medium   | 1.5 |
| Low      | 0.5 |

A health score of 100 means zero findings. A single critical finding with `affectedCount: 20` would contribute a penalty of 100, driving the score to 0.

### Revenue Projection

```
blendedRate = rateCard.blendedRate || average(rateCard.roles[].hourlyRate)

totalRevenueLow  = sum(finding.effortHoursLow * finding.affectedCount) * blendedRate
totalRevenueHigh = sum(finding.effortHoursHigh * finding.affectedCount) * blendedRate
```

Quick wins are findings where `severity >= high AND effortTshirt in [XS, S]`, sorted by composite score descending.

### Calibration Factor

```
calibrationFactor = average(actualHours / estimatedMidpointHours)
adjustedEstimate = baseEstimate * calibrationFactor
```

Applied only when `sampleSize >= 3` for a given remediation pattern.

---

## 6. Route Map

### Page Routes (20)

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/assessments` | Assessment list |
| `/assessments/new` | New assessment wizard (upload or connect) |
| `/assessments/[id]` | Assessment detail dashboard |
| `/assessments/[id]/findings` | Full findings view |
| `/assessments/[id]/pathfinder` | Pathfinder detail and fusion findings |
| `/assessments/[id]/report` | Report download page |
| `/assessments/[id]/sow` | SOW builder |
| `/assessments/[id]/sow/tracking` | SOW tracking pipeline |
| `/assessments/[id]/trends` | Trends and benchmarks |
| `/connections` | Instance connection list |
| `/connections/new` | Add new connection |
| `/connections/[id]` | Connection detail |
| `/settings` | Settings landing |
| `/settings/rate-card` | Rate card configuration |
| `/settings/branding` | White-label branding |
| `/settings/team` | Team management |
| `/sow-pipeline` | Cross-assessment SOW kanban pipeline |
| `/monitoring` | Fleet monitoring dashboard |
| `(dashboard)/layout` | Dashboard layout shell with sidebar |

### API Routes (10)

| Method | Path | Description |
|--------|------|-------------|
| ALL | `/api/trpc/[trpc]` | tRPC catch-all handler |
| POST | `/api/export/upload` | JSON export file upload |
| GET | `/api/reports/consultant` | Generate consultant DOCX report |
| GET | `/api/reports/customer` | Generate customer DOCX report |
| GET/POST | `/api/reports/sow` | Generate SOW DOCX document |
| GET/POST | `/api/connections` | List/create instance connections |
| POST | `/api/connections/test` | Test connection credentials |
| POST | `/api/connections/[id]/scan` | Trigger live scan on connection |
| POST | `/api/webhooks/pathfinder` | Receive Pathfinder confidence feed |
| -- | `/api/reports/_shared` | Shared report utilities (not a route) |

### tRPC Procedures (via `/api/trpc/[trpc]`)

| Router | Key Procedures |
|--------|---------------|
| `assessments` | list, getById, create, triggerScan, getStatus |
| `findings` | list, getByAssessment, filterByModule, getDetail |
| `sow` | generate, list, updateStatus, getDocument |
| `pathfinder` | getConfidence, getCoverage, getFusionFindings |
| `benchmarks` | getCohortData, getAssessmentPosition, getTrends |

---

## 7. Database Tables

All tables use UUID primary keys and `TIMESTAMPTZ` timestamps. Tables with `org_id` enforce Row-Level Security.

| Table | Purpose | RLS | Key Columns |
|-------|---------|-----|-------------|
| `organizations` | Multi-tenant org registry | No (root) | name, slug, brand_config (JSONB), rate_card (JSONB) |
| `users` | Org members with roles | Yes | org_id, email, role (admin/member/viewer) |
| `instance_connections` | ServiceNow instance credentials | Yes | org_id, instance_url, connection_type (oauth/basic/export), credentials_encrypted |
| `assessments` | Assessment run records | Yes | org_id, instance_connection_id, scan_type, status, health_score (0-100), domain_scores (JSONB) |
| `findings` | Individual debt findings | Yes | org_id, assessment_id, module, severity, composite_score, effort_tshirt, affected_count |
| `remediation_patterns` | Effort estimation library | No (global) | pattern_key, effort_hours_low/high, effort_tshirt, sow_scope_template, calibration_factor |
| `scan_rules` | Debt detection rule library | No (global) | rule_key, module, severity, risk_score, query_config (JSONB), evaluation_logic, threshold_config |
| `benchmark_data` | Anonymized cohort benchmarks | No | assessment_id, industry_vertical, company_size_tier, module, health_score, finding_counts |
| `pathfinder_confidence` | CI behavioral confidence data | Yes | org_id, ci_sys_id, confidence_score, traffic_state, behavioral_classification (JSONB) |
| `generated_sows` | SOW document tracking | Yes | org_id, assessment_id, status (draft/sent/review/accepted/declined), total_revenue_low/high |

### RLS Policy Pattern

Every RLS-protected table uses the same policy:

```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON {table}
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

The `app.current_org_id` session variable is set from the authenticated user's JWT on every request.

---

## 8. Scan Rules Summary

### Core Platform -- Scripting Debt (4 rules)

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `core_hardcoded_sysid` | Hard-coded sys_ids in scripts | Critical | 32-char hex strings in business rules and script includes that break during cloning/migration |
| `core_duplicate_business_rule` | Duplicate business rules | High | Multiple business rules on the same table with overlapping conditions and similar logic |
| `core_client_server_antipattern` | Client scripts doing server work | High | Client scripts executing GlideRecord queries or server-side operations |
| `core_sync_ajax` | Synchronous AJAX calls | High | getXMLWait and synchronous XMLHttpRequest calls that freeze the browser UI |

### Core Platform -- Update Set Debt (3 rules)

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `core_stale_update_set` | Stale update sets | Medium | Update sets in "in progress" state with no modification in 90+ days |
| `core_update_set_collision` | Update set collisions | High | Unresolved collision and preview problem records blocking promotion |
| `core_direct_production_change` | Direct production changes | Critical | Configuration changes made in the Default update set in production |

### Core Platform -- Security & ACL Debt (3 rules)

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `core_permissive_acl` | Overly permissive ACLs | Critical | ACL rules with no conditions, no script, and no role requirements |
| `core_redundant_acl` | Redundant ACLs | High | Multiple ACL rules on the same table and operation with overlapping scope |
| `core_elevated_role` | Elevated role assignments | High | Users with admin, security_admin, or impersonator roles who may not need them |

### CMDB -- Data Quality (4 rules)

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `cmdb_stale_ci` | Stale CIs | Medium | CIs not updated in 90+ days indicating abandoned or unmanaged records |
| `cmdb_orphaned_ci` | Orphaned CIs | Medium | CIs with no relationships to any other CI in the CMDB |
| `cmdb_missing_discovery_source` | Missing discovery source | High | CIs with no discovery_source value, indicating manual or unverified data |
| `cmdb_duplicate_ci` | Duplicate CIs | High | CIs with matching names and classes suggesting duplicate records |

### ITSM -- Incident Health (4 rules)

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `itsm_unassigned_incidents` | Unassigned incidents | High | Open incidents with no assigned_to or assignment_group |
| `itsm_miscategorized_incidents` | Miscategorized incidents | Medium | Incidents reassigned to a different category after creation |
| `itsm_aged_open_incidents` | Aged open incidents | Medium | Incidents open for more than 30 days without resolution |
| `itsm_incident_reopens` | Incident reopens | High | Incidents reopened after closure, indicating incomplete resolution |

### ITSM -- Change Health (3 rules)

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `itsm_emergency_change_ratio` | Emergency change ratio | High | Emergency changes exceeding threshold percentage of total changes |
| `itsm_unauthorized_changes` | Unauthorized changes | Critical | Changes moved to implement without proper approval |
| `itsm_change_backout_missing` | Missing backout plans | Medium | Change requests with no backout plan documented |

### ITAM -- Hardware Asset Management (2 rules)

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `itam_unreconciled_assets` | Unreconciled assets | High | Hardware assets not linked to a CI in the CMDB |
| `itam_expired_warranty_assets` | Expired warranty assets | Medium | Hardware assets with expired warranty dates still in active use |

### Pathfinder Fusion Rules (5 rules)

These rules require both Bearing assessment data AND Pathfinder behavioral data:

| Rule Key | Display Name | Severity | What It Detects |
|----------|-------------|----------|----------------|
| `cmdb_traffic_mismatch_active_idle` | CMDB Active, Pathfinder Idle | Critical | CI marked Operational but Pathfinder observes minimal traffic |
| `cmdb_traffic_mismatch_retired_active` | CMDB Retired, Pathfinder Active | High | CI marked Retired but Pathfinder observes active traffic |
| `cmdb_class_mismatch` | Class does not match behavior | High | Pathfinder suggests different CI classification with >75% confidence |
| `shadow_it_detection` | Shadow IT detected | Critical | Active traffic from hosts with no CMDB record |
| `relationship_unconfirmed` | Unconfirmed relationships | Medium | CMDB relationships with no observed traffic between CIs |

---

## 9. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20+ | Server runtime |
| **Framework** | Next.js (App Router) | 16.2+ | SSR + React frontend |
| **Language** | TypeScript | 5.9+ | Type safety across the stack |
| **UI Library** | React | 18.3+ | Component rendering |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS with Avennorth design tokens |
| **API Layer** | tRPC | 11.16+ | Type-safe RPC between frontend and backend |
| **Data Fetching** | TanStack React Query | 5.95+ | Server state management and caching |
| **Validation** | Zod | 4.3+ | Schema validation for payloads and forms |
| **Database** | Supabase (PostgreSQL) | Latest | Multi-tenant data storage with RLS |
| **DB Client** | @supabase/supabase-js | 2.100+ | Database queries with SSR support |
| **SSR Client** | @supabase/ssr | 0.9+ | Server-side Supabase client for Next.js |
| **Serialization** | SuperJSON | 2.2+ | Date/BigInt serialization for tRPC |
| **Doc Generation** | docx | 9.6+ | DOCX report and SOW generation |
| **File Download** | file-saver | 2.0+ | Client-side file download trigger |
| **Linting** | ESLint | 9.39+ | Code quality enforcement |
| **CSS Processing** | PostCSS + Autoprefixer | 8.5+ / 10.4+ | CSS transformation pipeline |
| **Deployment** | Vercel | -- | Production hosting |

### Brand System

| Element | Value |
|---------|-------|
| Primary Color (Obsidian) | `#1A1A2E` |
| Accent Color (Electric Lime) | `#CCFF00` |
| Dark Gray | `#2D2D3D` |
| Medium Gray | `#6B6B7B` |
| Heading Font | Syne |
| Body Font | DM Sans |
| Code/Data Font | Space Mono |

---

## 10. Build & Development

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (or local Supabase via Docker)

### Quick Start

```bash
# Clone and install
git clone https://github.com/blmuffley/Bearing.git
cd Bearing
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npx supabase db push

# Seed scan rules and remediation patterns
npx supabase db seed

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `NEXTAUTH_SECRET` | Yes | Auth session encryption secret |
| `NEXTAUTH_URL` | Yes | Application base URL |
| `SERVICENOW_CLIENT_ID` | No | ServiceNow OAuth client ID |
| `SERVICENOW_CLIENT_SECRET` | No | ServiceNow OAuth client secret |
| `SERVICENOW_REDIRECT_URI` | No | ServiceNow OAuth redirect URI |
| `PATHFINDER_WEBHOOK_SECRET` | No | API key for Pathfinder webhook auth |
| `ENCRYPTION_KEY` | Yes | AES key for credential encryption |
| `REPORTS_STORAGE_BUCKET` | No | Storage bucket for generated reports |
| `ENABLE_PATHFINDER_INTEGRATION` | No | Feature flag (default: false) |
| `ENABLE_BENCHMARKING` | No | Feature flag (default: false) |
| `ENABLE_CONTINUOUS_MONITORING` | No | Feature flag (default: false) |

---

## 11. Related Documentation

### Internal Documentation (`docs/internal/`)

| Document | Description |
|----------|-------------|
| [Architecture Overview](internal/01_architecture_overview.md) | Detailed architecture documentation with component interactions |
| [Database Schema](internal/02_database_schema.md) | Complete database schema reference with all columns and constraints |
| [Scan Rules Catalog](internal/03_scan_rules_catalog.md) | Full scan rules catalog with evaluation logic and threshold configurations |
| [Integrations](internal/04_integrations.md) | Integration specifications for Pathfinder and Compass |
| [Patent Claims](internal/05_patent_claims.md) | Provisional patent claim language mapped to implementation |
| [Deployment Guide](internal/06_deployment_guide.md) | Deployment, infrastructure, and operations guide |

### Customer Documentation (`docs/customer/`)

| Document | Description |
|----------|-------------|
| [Getting Started](customer/01_getting_started.md) | Customer onboarding and first assessment walkthrough |
| [Assessment Guide](customer/02_assessment_guide.md) | How to run, interpret, and act on assessment results |
| [Reports & SOW](customer/03_reports_and_sow.md) | Guide to report types and SOW generation features |
| [Connections Guide](customer/04_connections_guide.md) | ServiceNow instance connection setup (OAuth, basic auth, export) |
| [FAQ](customer/05_faq.md) | Frequently asked questions |

### Architecture Diagrams (`docs/diagrams/`)

| Diagram | Description |
|---------|-------------|
| [Master Architecture](diagrams/00_master_architecture_overview.svg) | Full system architecture |
| [Core Domain ERD](diagrams/01_erd_core_domain.svg) | Organizations, users, connections |
| [Scanning & Scoring ERD](diagrams/02_erd_scanning_scoring.svg) | Assessments, findings, rules, patterns |
| [Pathfinder & Benchmarks ERD](diagrams/03_erd_pathfinder_benchmarks.svg) | Pathfinder confidence, benchmarks, SOWs |
| [Assessment Lifecycle](diagrams/04_process_assessment_lifecycle.svg) | Upload to report process flow |
| [SOW Pipeline](diagrams/05_process_sow_pipeline.svg) | Finding selection to engagement proposal |
| [Pathfinder Integration](diagrams/06_process_pathfinder_integration.svg) | Confidence feed and fusion scoring |
| [Product Suite](diagrams/07_product_suite_overview.svg) | Avennorth suite relationships |

### Other Reference

| Document | Description |
|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | AI assistant context with full project specification, rules, and implementation patterns |
| [This Document](SOLUTION_OVERVIEW.md) | Master solution overview and file index |
