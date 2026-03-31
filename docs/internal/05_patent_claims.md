# Bearing -- Patent-Protected Features

> **Internal Avennorth Document** -- CONFIDENTIAL. Not for customer distribution.
> Last updated: 2026-03-29

---

## Overview

Bearing implements six provisional patent claims. Each claim maps to a specific data flow chain in the codebase. These chains must be preserved during any refactoring. Do not shortcut the documented processing steps.

---

## Claim 1: Assessment-to-SOW Pipeline

**Title:** Automated generation of Statements of Work from technical debt assessment findings with effort-based pricing.

**What it protects:** The end-to-end pipeline from scanning a ServiceNow instance for technical debt through to generating a ready-to-send Statement of Work document with scope, effort estimates, pricing, deliverables, and signature blocks.

### Implementation Chain

```
scan engine
  -> findings (each with severity, effort, risk, remediation_pattern_key)
    -> remediation patterns (SOW scope templates, assumptions, deliverables, exclusions)
      -> revenue calculator (rate card * effort * affected count)
        -> SOW generator (DOCX with scope, pricing, milestones, signatures)
```

### Key Files

| File | Role in Chain |
|------|--------------|
| `src/server/scanner/engine.ts` | Runs rules, produces findings |
| `supabase/seed.sql` | Remediation patterns with SOW template language |
| `src/server/reporting/revenue-calculator.ts` | Applies rate card to findings |
| `src/server/reporting/sow-generator.ts` | Generates DOCX from findings + patterns + rate card |
| `src/app/api/reports/sow/route.ts` | API endpoint that fetches patterns and calls generator |

### Critical Path Requirements

- Every finding MUST map to a `remediation_pattern_key`
- Every remediation pattern MUST include `sow_scope_template`, `sow_assumptions`, `sow_deliverables`, `sow_exclusions`
- The SOW generator MUST pull template language from the remediation patterns -- not from hardcoded strings
- Revenue calculation MUST use the org's rate card, not fixed values
- The generated document MUST include: scope of work, assumptions, deliverables, exclusions, timeline, pricing table, and signature blocks

---

## Claim 2: Calibration Feedback Loop

**Title:** Tracking actual engagement hours against estimates to auto-calibrate future projections.

**What it protects:** The closed-loop system where actual hours from completed engagements are compared to Bearing's estimates, producing a calibration factor that is applied to all future estimates for that remediation pattern.

### Implementation Chain

```
engagement completes (actual hours recorded)
  -> CalibrationTracker.recordActualHours()
    -> compute accuracy ratio: actual / estimated midpoint
      -> running average update: newFactor = (oldFactor * oldN + sampleRatio) / (oldN + 1)
        -> update remediation_patterns.calibration_factor
          -> future estimates: baseHours * calibration_factor (after 3+ samples)
```

### Key Files

| File | Role in Chain |
|------|--------------|
| `src/server/jobs/calibration-tracker.ts` | CalibrationTracker class: records hours, computes factors, applies adjustments |
| `src/server/trpc/routers/benchmarks.ts` | `recordActualHours` mutation, `getCalibrationFactors` query |
| `supabase/migrations/00001_initial_schema.sql` | `calibration_factor` and `calibration_sample_size` columns on `remediation_patterns` |

### Critical Path Requirements

- Actual hours MUST be compared against the estimated midpoint `(low + high) / 2`
- The running average formula MUST be: `(currentFactor * currentN + sampleRatio) / (currentN + 1)`
- Calibration MUST NOT be applied until at least 3 samples exist (MIN_SAMPLE_SIZE = 3)
- The calibration factor MUST be stored on the `remediation_patterns` table, not computed on the fly
- Both `calibration_factor` and `calibration_sample_size` MUST be updated atomically

---

## Claim 3: Dual-Report Generation

**Title:** Single scan producing both internal (with pricing) and customer-facing (without pricing) reports.

**What it protects:** The ability to run a single assessment scan and generate two distinct report documents from the same findings: one for the consulting firm (with revenue, margins, and rate card data) and one for the customer (white-labeled, risk-focused, no pricing).

### Implementation Chain

```
single scan (ScanEngine.runExportScan)
  -> one set of findings
    -> consultant report generator (findings + rate card -> DOCX with pricing/margins)
    -> customer report generator (findings + branding -> DOCX without pricing)
```

### Key Files

| File | Role in Chain |
|------|--------------|
| `src/server/scanner/engine.ts` | Single scan producing one findings set |
| `src/server/reporting/consultant-report.ts` | Internal report with pricing and margin analysis |
| `src/server/reporting/customer-report.ts` | White-labeled report without pricing |
| `src/app/api/reports/consultant/route.ts` | API endpoint for consultant report |
| `src/app/api/reports/customer/route.ts` | API endpoint for customer report |

### Critical Path Requirements

- There MUST be only one scan engine execution per assessment
- Both reports MUST reference the same findings from the same assessment
- The consultant report MUST include revenue projections, blended rate, and margin analysis
- The customer report MUST NOT include any pricing, rate card, or margin information
- The customer report MUST support white-labeling (org name, colors, logo, legal text)
- NEVER build separate scan logic for the two report types

---

## Claim 4: Sanitized Export Assessment

**Title:** Technical debt assessment via sanitized JSON export without requiring direct API access.

**What it protects:** The ability to perform a complete technical debt assessment using a sanitized JSON export payload from a ServiceNow instance, without requiring API credentials or direct instance connectivity.

### Implementation Chain

```
customer provides sanitized JSON export
  -> POST /api/export/upload (multipart form)
    -> export-parser.ts validates payload against Zod schema
      -> ScanEngine.runExportScan(payload)
        -> same rule evaluation as live scan
          -> same scoring, same findings, same reports
```

### Key Files

| File | Role in Chain |
|------|--------------|
| `src/server/scanner/export-parser.ts` | Zod schema validation and parsing of JSON exports |
| `src/server/scanner/engine.ts` | `runExportScan()` processes the validated payload |
| `src/app/api/export/upload/route.ts` | API endpoint: multipart form upload, parse, scan, persist |

### Critical Path Requirements

- The export parser MUST validate the payload against a strict Zod schema
- The scan engine MUST apply the same rules to export data as it does to live API data
- The export path MUST work independently of any ServiceNow API connection
- Export-based assessments MUST produce the same findings format as API-based scans
- The export payload MUST NOT contain customer credentials or PII beyond configuration metadata

---

## Claim 5: Assessment-Triggered Discovery Deployment

**Title:** Assessment findings triggering Pathfinder deployment recommendations.

**What it protects:** The system whereby CMDB/ITOM assessment findings indicating discovery gaps automatically trigger targeted Pathfinder agent deployment recommendations, including specific subnets, priority ordering, and estimated coverage impact.

### Implementation Chain

```
assessment findings identify CMDB gaps
  -> coverage-analyzer.ts classifies CIs into four zones
    -> dark-zone and discovery-only CIs identified
      -> deployment-recommender.ts groups by /24 subnet
        -> filters out subnets already covered by Pathfinder agents
          -> generates prioritized deployment manifests
```

### Key Files

| File | Role in Chain |
|------|--------------|
| `src/server/integrations/pathfinder/coverage-analyzer.ts` | Four-zone coverage mapping |
| `src/server/integrations/pathfinder/deployment-recommender.ts` | Subnet grouping, priority ordering, manifest generation |
| `src/server/scoring/pathfinder-fusion.ts` | Fusion rules that detect gaps requiring Pathfinder |

### Critical Path Requirements

- Coverage analysis MUST classify every CI into one of exactly four zones: fully_covered, pathfinder_only, discovery_only, dark
- Deployment recommendations MUST be grouped by /24 subnet (extracted from IP address)
- Subnets already covered by existing Pathfinder agents MUST be filtered out
- Priority MUST be based on CI count: 20+ = high, 5-19 = medium, <5 = low
- Each recommendation MUST include: target network, target subnets, CI count, rationale, priority, estimated coverage percentage
- The chain MUST flow from assessment findings through coverage analysis to deployment manifests -- not skip steps

---

## Claim 6: Composite Health Scoring with Behavioral Confidence Fusion

**Title:** Blending static CMDB assessment with dynamic Pathfinder behavioral data.

**What it protects:** The scoring system that combines static CMDB configuration quality assessment with dynamic Pathfinder behavioral confidence data to produce "fusion-only" findings that are detectable only when both data sources are present, along with an adjusted health score that incorporates both signals.

### Implementation Chain

```
static CMDB findings (from scan engine)
  + Pathfinder confidence data (from webhook)
    -> computeFusionScore() indexes both data sets
      -> 5 fusion rules evaluate cross-signal patterns
        -> fusion-only findings generated (not detectable by either source alone)
          -> adjusted health score computed (original findings + fusion findings)
            -> coverage summary calculated (CIs with/without Pathfinder data)
```

### Key Files

| File | Role in Chain |
|------|--------------|
| `src/server/scoring/pathfinder-fusion.ts` | `computeFusionScore()`: all 5 fusion rules, enhanced findings, adjusted health score |
| `src/server/scoring/composite-scorer.ts` | Composite scoring used by fusion findings |
| `src/server/scoring/health-index.ts` | Health score computation applied to combined findings |
| `src/server/trpc/routers/pathfinder.ts` | `getFusionFindings` query for retrieving stored fusion findings |

### The 5 Fusion Rules

| Rule | Static Signal | Dynamic Signal | Severity |
|------|--------------|----------------|----------|
| cmdb_traffic_mismatch_active_idle | CMDB status = Operational | Pathfinder state = idle | Critical |
| cmdb_traffic_mismatch_retired_active | CMDB status = Retired | Pathfinder state = active | High |
| cmdb_class_mismatch | CMDB class | Pathfinder behavioral classification (>75% confidence) | High |
| shadow_it_detection | No CMDB record exists | Pathfinder state = active | Critical |
| relationship_unconfirmed | CMDB relationship exists | No traffic observed between CIs | Medium |

### Critical Path Requirements

- Fusion findings MUST only be generated when BOTH Bearing assessment data AND Pathfinder behavioral data exist
- Each fusion rule MUST compare a static signal (CMDB) against a dynamic signal (Pathfinder)
- The adjusted health score MUST include both original findings and fusion findings
- Coverage summary MUST report total CIs, CIs with Pathfinder data, and coverage percentage
- The class mismatch rule MUST only fire when Pathfinder classification confidence exceeds 75%
- Shadow IT detection MUST only fire for CIs with active traffic state
- The system MUST function normally without Pathfinder data (Pathfinder is additive, not required)

---

## Implementation Requirements for All Claims

1. **Do NOT shortcut the chains.** Each claim describes a specific data flow. If you refactor, the chain of custody must be preserved.

2. **Every link in the chain must be implemented.** Skipping a step (e.g., generating SOW scope language from hardcoded text instead of from remediation patterns) breaks the claim.

3. **Document any changes to these chains.** If a refactoring changes the implementation of a patent claim, update this document and notify the team.

4. **Test the full chain, not just individual components.** Integration tests should verify the end-to-end flow for each claim.

5. **The code IS the evidence.** If a claim is ever challenged, the codebase must demonstrate the described chain. Keep the implementation clear and traceable.
