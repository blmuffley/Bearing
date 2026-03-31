# Bearing -- Architecture Overview

> **Internal Avennorth Document** -- Not for customer distribution.
> Last updated: 2026-03-29

---

## System Summary

**Avennorth Bearing** is a technical debt assessment platform for ServiceNow instances. It connects to (or ingests data from) a customer's ServiceNow instance, scans configuration metadata across major platform domains, scores technical debt by severity/effort/risk, and produces remediation backlogs with effort estimates that feed into Compass (Avennorth's CRM/estimating platform) for SOW generation.

### Where Bearing Fits in the Avennorth Suite

| Product | Role | Narrative Step |
|---------|------|----------------|
| **Bearing** | Measures where you are (tech debt assessment) | Assess |
| **Pathfinder** | Discovers your terrain (CMDB-first service discovery via eBPF/ETW agents) | Discover |
| **Contour** | Plots your waypoints (service mapping intelligence suite) | Map |
| **Vantage** | Spots wrong turns and reroutes (major incident investigation) | Respond |
| **Compass** | The guide (collective CRM/sales platform) | Guide |

Narrative flow: **Assess -> Discover -> Map -> Respond -> Guide**

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router) + React 18 + TypeScript | SSR for dashboards, React for interactive components |
| Styling | Tailwind CSS 3 | Consistent with Avennorth design system |
| Backend API | Next.js API Routes + tRPC 11 | Type-safe API layer, co-located with frontend |
| Database | Supabase (PostgreSQL) | Shared infrastructure with Compass; RLS with `org_id` on all tables |
| Auth | Supabase Auth | Multi-tenant; org-based access control |
| File Generation | docx (npm) | SOW and report DOCX generation |
| Schema Validation | Zod 4 | Runtime validation of API inputs and export payloads |
| Data Fetching | TanStack React Query 5 | Server state management for tRPC queries |
| ServiceNow Integration | REST API (fetch) | OAuth 2.0 + basic auth support |
| Deployment | Vercel | Consistent with Avennorth infrastructure |

---

## Architecture Diagram Reference

See `docs/diagrams/00_master_architecture_overview.svg` for the visual system architecture.

---

## Core Components

### 1. Scan Engine

**Purpose:** Orchestrates the evaluation of scan rules against ServiceNow data to produce findings.

**Key files:**
- `src/server/scanner/engine.ts` -- ScanEngine class, rule registration, export scan orchestration
- `src/server/scanner/export-parser.ts` -- Zod-validated parser for sanitized JSON exports
- `src/server/scanner/live-scanner.ts` -- Live API scan runner (Phase 3, in progress)
- `src/server/scanner/instance-scan-importer.ts` -- Ingests ServiceNow Instance Scan results

**How it works:**
1. The `ScanEngine` constructor registers all built-in rules across 4 modules (core, cmdb, itsm, itam).
2. `runExportScan(payload)` iterates through enabled rules, runs each against the export payload, attaches composite scores, sorts findings by priority, then computes health scores and domain scores.
3. Results are returned as a `ScanResult` containing findings, healthScore, domainScores, and scanMetadata.

**Rule modules:**
- `modules/core/scripting-debt.ts` -- Hard-coded sys_ids, duplicate BRs, client/server antipattern, sync AJAX
- `modules/core/update-set-debt.ts` -- Stale update sets, collisions, direct production changes
- `modules/core/security-acl-debt.ts` -- Permissive ACLs, redundant ACLs, elevated roles
- `modules/cmdb/data-quality.ts` -- Stale CIs, orphaned CIs, missing discovery source, duplicate CIs
- `modules/itsm/incident-health.ts` -- Unassigned, miscategorized, aged, reopened incidents
- `modules/itsm/change-health.ts` -- Emergency change ratio, unauthorized changes, missing backout plans
- `modules/itam/ham-reconciliation.ts` -- Unreconciled assets, expired warranty

**Dependencies:** composite-scorer, health-index, export-parser, all module evaluators

### 2. Scoring Engine

**Purpose:** Computes composite priority scores and health indices from findings.

**Key files:**
- `src/server/scoring/composite-scorer.ts` -- `computeCompositeScore(severity, effortTshirt, riskScore)`
- `src/server/scoring/health-index.ts` -- `computeHealthScore(findings)`, `computeDomainScores(findings)`
- `src/server/scoring/pathfinder-fusion.ts` -- `computeFusionScore(input)` blending CMDB + Pathfinder data

**How it works:**

Composite score formula:
```
composite = (severity * 0.4) + (effortInverse * 0.3) + (risk * 0.3)
```

Severity mapping: critical=4, high=3, medium=2, low=1
Effort inverse mapping (quick fixes score higher): XS=5, S=4, M=3, L=2, XL=1
Risk score: 1-5 (from scan rule definition)

Health score formula:
```
health = max(0, round(100 - min(totalPenalty, 100)))
totalPenalty = sum(penaltyPerSeverity[finding.severity] * finding.affectedCount)
```

Penalty weights: critical=5, high=3, medium=1.5, low=0.5

**Dependencies:** finding types

### 3. Report Generators

**Purpose:** Produce DOCX documents from assessment data.

**Key files:**
- `src/server/reporting/consultant-report.ts` -- Internal report with pricing and margin analysis
- `src/server/reporting/customer-report.ts` -- White-labeled report without pricing
- `src/server/reporting/sow-generator.ts` -- Statement of Work with scope, deliverables, pricing, signatures
- `src/server/reporting/revenue-calculator.ts` -- Applies rate cards to findings for revenue projections

**How it works:**
- **Consultant report:** Full findings with severity/effort/revenue breakdown, margin analysis using the org's rate card. Internal use only.
- **Customer report:** Same findings, white-labeled with org branding (logo, colors, legal text). No pricing, no margin data. Risk-focused language.
- **SOW generator:** Takes selected findings, fetches their remediation patterns for pre-written scope language, generates a complete DOCX with scope of work, assumptions, deliverables, exclusions, timeline, pricing table, milestones, and signature blocks.
- **Revenue calculator:** Multiplies finding effort hours by blended rate, groups by module, identifies quick wins (high severity + low effort).

**Dependencies:** docx (npm), finding types, sow types, composite-scorer

### 4. Pathfinder Integration

**Purpose:** Enriches Bearing assessments with Pathfinder behavioral data when available.

**Key files:**
- `src/server/integrations/pathfinder/confidence-ingester.ts` -- Processes incoming confidence feeds, upserts to `pathfinder_confidence` table in batches of 100
- `src/server/integrations/pathfinder/coverage-analyzer.ts` -- Four-zone coverage mapping (fully_covered, pathfinder_only, discovery_only, dark)
- `src/server/integrations/pathfinder/deployment-recommender.ts` -- Generates deployment manifests from coverage gaps, groups by subnet
- `src/server/scoring/pathfinder-fusion.ts` -- 5 fusion rules that produce findings detectable only through both signals
- `src/app/api/webhooks/pathfinder/route.ts` -- Webhook receiver

**5 Fusion Rules:**
1. `cmdb_traffic_mismatch_active_idle` -- CMDB says Operational, Pathfinder says idle (Critical)
2. `cmdb_traffic_mismatch_retired_active` -- CMDB says Retired, Pathfinder says active (High)
3. `cmdb_class_mismatch` -- CSDM class does not match observed behavior (High)
4. `shadow_it_detection` -- Active traffic with no CMDB record (Critical)
5. `relationship_unconfirmed` -- CMDB relationship not confirmed by traffic (Medium)

**Dependencies:** Supabase client, composite-scorer, health-index

### 5. Network Effects

**Purpose:** Benchmarking, calibration, time-decay, and continuous monitoring.

**Key files:**
- `src/server/jobs/benchmark-aggregator.ts` -- Anonymizes and aggregates data after each assessment, enforces minimum cohort size of 10
- `src/server/jobs/calibration-tracker.ts` -- Tracks actual engagement hours vs. estimates, updates `calibration_factor` on `remediation_patterns`
- `src/server/jobs/assessment-decay.ts` -- Manages visibility: full detail 30 days, reduced at 60, summary-only at 90+
- `src/server/jobs/continuous-monitor.ts` -- Scheduled recurring scans, threshold alerts, trend analysis

**How the calibration loop works:**
1. Engagement completes with actual hours recorded
2. CalibrationTracker computes accuracy ratio: `actual / estimatedMidpoint`
3. Running average update: `newFactor = (oldFactor * oldN + sampleRatio) / (oldN + 1)`
4. Factor applied to future estimates only after minimum 3 samples
5. Factor > 1.0 means estimates were too low; < 1.0 means too high

**Dependencies:** Supabase client

---

## Data Flow

End-to-end processing pipeline:

```
1. DATA INGESTION
   Export Upload (POST /api/export/upload)
     -> parse multipart form, extract JSON file
     -> validate via parseExportPayload (Zod schema)
   OR Live API Scan (POST /api/connections/[id]/scan)
     -> decrypt credentials, query ServiceNow Table API

2. RULE EVALUATION
   ScanEngine.runExportScan(payload)
     -> iterate through 23 enabled rules across 4 modules
     -> each rule extracts relevant data slice from payload
     -> each rule evaluator returns findings (without composite score)

3. FINDING GENERATION
   Each rule violation = one or more Finding objects
     -> title, description, severity, evidence, affected count
     -> mapped to a remediation_pattern_key for SOW templates

4. SCORING
   For each finding:
     -> computeCompositeScore(severity, effortTshirt, riskScore)
   Aggregate:
     -> computeHealthScore(findings) -> 0-100 instance health
     -> computeDomainScores(findings) -> per-module health scores

5. REVENUE CALCULATION
   calculateRevenue(findings, rateCard)
     -> blendedRate * effort_hours * affected_count
     -> group by module, identify quick wins

6. PERSISTENCE
   -> Create/reuse instance_connection record
   -> Create assessment record with health_score, domain_scores
   -> Insert finding rows with composite scores

7. REPORT GENERATION
   Consultant report (POST /api/reports/consultant)
     -> all findings + pricing + margin analysis -> DOCX
   Customer report (POST /api/reports/customer)
     -> white-labeled, no pricing -> DOCX

8. SOW GENERATION
   POST /api/reports/sow
     -> select findings -> fetch remediation patterns -> DOCX
     -> scope, assumptions, deliverables, pricing, signatures

9. PATHFINDER ENRICHMENT (when available)
   POST /api/webhooks/pathfinder
     -> ingest confidence feed -> pathfinder_confidence table
   computeFusionScore(input)
     -> 5 fusion rules produce findings only detectable with both signals
     -> adjusted health score includes fusion findings

10. BENCHMARKING AND CALIBRATION (after completion)
    -> anonymize and aggregate assessment data
    -> record actual hours -> update calibration_factor
    -> apply calibration to future estimates (after 3+ samples)
```

---

## Multi-Tenancy

Every tenant-scoped table includes an `org_id` column. This is non-negotiable.

- **`org_id` on every table:** organizations, users, instance_connections, assessments, findings, pathfinder_confidence, generated_sows
- **Global reference tables (no org_id):** scan_rules, remediation_patterns, benchmark_data
- **Supabase RLS policies:** Every tenant-scoped table has `ENABLE ROW LEVEL SECURITY` and a policy `USING (org_id = current_setting('app.current_org_id')::uuid)`
- **No admin bypass:** There is no superuser escape hatch. All queries go through RLS.
- **Session context:** `app.current_org_id` is set from the authenticated user's JWT.

---

## API Routes

### REST API Routes (Next.js API Routes)

| # | Method | Path | Description | Auth |
|---|--------|------|-------------|------|
| 1 | POST | `/api/export/upload` | Upload sanitized JSON export, run scan, persist results | Org session |
| 2 | POST | `/api/connections` | Create a new ServiceNow instance connection | Org session |
| 3 | POST | `/api/connections/test` | Test ServiceNow connection (basic or OAuth) | Org session |
| 4 | POST | `/api/connections/[id]/scan` | Trigger live API scan for a connection | Org session |
| 5 | POST | `/api/reports/consultant` | Generate consultant report DOCX (with pricing) | Org session |
| 6 | POST | `/api/reports/customer` | Generate customer report DOCX (no pricing) | Org session |
| 7 | POST | `/api/reports/sow` | Generate Statement of Work DOCX | Org session |
| 8 | POST | `/api/webhooks/pathfinder` | Receive Pathfinder confidence feed | API key |
| 9 | ALL | `/api/trpc/[trpc]` | tRPC handler (routes below) | Varies |

### tRPC Procedures (via `/api/trpc/[trpc]`)

| # | Router | Procedure | Type | Description | Auth |
|---|--------|-----------|------|-------------|------|
| 10 | assessments | list | query | List all assessments for org | Protected |
| 11 | assessments | getById | query | Get assessment by ID with finding count | Protected |
| 12 | assessments | create | mutation | Create a new assessment | Protected |
| 13 | findings | listByAssessment | query | List findings sorted by composite_score desc | Protected |
| 14 | findings | getStats | query | Get severity and module counts for an assessment | Protected |
| 15 | pathfinder | getConfidenceData | query | Get Pathfinder confidence records for a connection | Protected |
| 16 | pathfinder | getCoverageSummary | query | Get aggregated coverage stats by traffic state | Protected |
| 17 | pathfinder | getFusionFindings | query | Get fusion-only findings for an assessment | Protected |
| 18 | sow | list | query | List all SOWs for org | Protected |
| 19 | sow | getById | query | Get SOW by ID with included findings | Protected |
| 20 | sow | updateStatus | mutation | Update SOW status (draft/sent/under_review/accepted/declined) | Protected |
| 21 | sow | create | mutation | Create a new SOW record | Protected |
| 22 | benchmarks | getCohortBenchmark | query | Get cohort benchmark data for a module | Protected |
| 23 | benchmarks | getAssessmentTrend | query | Get health score trend for a connection | Protected |
| 24 | benchmarks | getCalibrationFactors | query | Get all calibration factors | Protected |
| 25 | benchmarks | recordActualHours | mutation | Record actual hours for calibration | Protected |

### Dashboard Pages (App Router)

| # | Path | Description |
|---|------|-------------|
| 26 | `/assessments` | Assessment list |
| 27 | `/assessments/new` | New assessment (upload or connect) |
| 28 | `/assessments/[id]` | Assessment detail (revenue dashboard) |
| 29 | `/assessments/[id]/findings` | Findings table |
| 30 | `/assessments/[id]/report` | Report preview and generation |
| 31 | `/assessments/[id]/sow` | SOW builder |
| 32 | `/assessments/[id]/sow/tracking` | SOW status tracking |
| 33 | `/assessments/[id]/pathfinder` | Pathfinder coverage and fusion findings |
| 34 | `/assessments/[id]/trends` | Assessment comparison and trends |
| 35 | `/connections` | Instance connections list |
| 36 | `/connections/new` | New connection setup |
| 37 | `/connections/[id]` | Connection detail with scan button |
| 38 | `/monitoring` | Continuous monitoring dashboard |
| 39 | `/settings` | Organization settings |
| 40 | `/settings/rate-card` | Rate card configuration |
| 41 | `/settings/branding` | Branding configuration (logo, colors, legal) |
| 42 | `/settings/team` | Team member management |
| 43 | `/sow-pipeline` | SOW pipeline overview |
