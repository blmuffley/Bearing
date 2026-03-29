# CLAUDE.md — Avennorth Bearing

## What This Is

You are building **Avennorth Bearing**, a technical debt assessment platform for ServiceNow instances. Bearing connects to (or ingests data from) a customer's ServiceNow instance, scans configuration metadata across all major platform domains, scores technical debt by severity/effort/risk, and produces remediation backlogs with effort estimates that feed into Compass (Avennorth's CRM/estimating platform) for SOW generation.

Bearing is part of the Avennorth product suite:
- **Bearing** — measures where you are (tech debt assessment)
- **Pathfinder** — discovers your terrain (CMDB-first service discovery via eBPF/ETW agents)
- **Contour** — plots your waypoints (service mapping intelligence suite)
- **Vantage** — spots wrong turns and reroutes (major incident investigation)
- **Compass** — the guide (collective CRM/sales platform where everything comes together)

Narrative: **Assess → Discover → Map → Respond → Guide**

## Brand System

- **Colors**: Obsidian `#1A1A2E`, Electric Lime `#CCFF00`, Dark Gray `#2D2D3D`, Medium Gray `#6B6B7B`
- **Typography**: Syne (headings), DM Sans (body), Space Mono (code/data)
- **Logo**: Open-path "AN" mark

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14+ (App Router) + React + TypeScript | SSR for dashboards, React for interactive components |
| **Styling** | Tailwind CSS | Consistent with Avennorth design system |
| **Backend API** | Next.js API Routes + tRPC | Type-safe API layer, co-located with frontend |
| **Database** | Supabase (PostgreSQL) | Shared infrastructure with Compass; RLS with `org_id` on all tables |
| **Auth** | Supabase Auth (or Clerk) | Multi-tenant; org-based access control |
| **Job Queue** | Inngest or BullMQ | Long-running scan jobs, scheduled pushes |
| **File Generation** | docx (npm), PDFKit | SOW and report document generation |
| **ServiceNow Integration** | REST API (axios/fetch) | OAuth 2.0 + basic auth support |
| **Deployment** | Vercel | Consistent with Avennorth infrastructure |
| **Monorepo** | Turborepo (if sharing with Compass) | Shared types, UI components, Supabase client |

---

## Database Architecture

All tables include `org_id` for multi-tenancy with Supabase RLS. This is non-negotiable — every table, every query.

### Core Schema

```sql
-- Organizations (tenants = consulting firms)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_config JSONB DEFAULT '{}',  -- logo_url, primary_color, secondary_color, legal_text
  rate_card JSONB DEFAULT '{}',     -- { roles: [{ name, hourly_rate }], default_engagement_type }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users within organizations
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member', -- admin, member, viewer
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ServiceNow instance connections
CREATE TABLE instance_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  customer_name TEXT NOT NULL,
  instance_url TEXT NOT NULL,            -- https://customer.service-now.com
  connection_type TEXT NOT NULL,         -- 'oauth' | 'basic' | 'export'
  credentials_encrypted JSONB,          -- encrypted OAuth tokens or basic auth (NULL for export)
  servicenow_version TEXT,
  licensed_plugins JSONB DEFAULT '[]',
  last_connected_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',        -- pending, active, error, disconnected
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assessment runs
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  instance_connection_id UUID REFERENCES instance_connections(id) NOT NULL,
  scan_type TEXT NOT NULL,              -- 'full_api' | 'export_ingest' | 'instance_scan_import'
  status TEXT DEFAULT 'queued',         -- queued, scanning, analyzing, scoring, complete, error
  modules_enabled JSONB DEFAULT '[]',   -- ['core', 'cmdb', 'itsm', 'itam', ...]
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  health_score INTEGER,                 -- 0-100 composite
  domain_scores JSONB DEFAULT '{}',     -- { cmdb: 43, itsm: 67, ... }
  scan_metadata JSONB DEFAULT '{}',     -- instance version, CI counts, etc.
  expires_at TIMESTAMPTZ,              -- 30-day full visibility, then decay
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual findings
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  module TEXT NOT NULL,                 -- 'core' | 'cmdb' | 'itsm' | 'itam' | ...
  category TEXT NOT NULL,              -- 'hardcoded_sysid' | 'stale_ci' | 'duplicate_br' | ...
  severity TEXT NOT NULL,              -- 'critical' | 'high' | 'medium' | 'low' | 'info'
  severity_score INTEGER NOT NULL,     -- 1-4
  effort_tshirt TEXT NOT NULL,         -- 'XS' | 'S' | 'M' | 'L' | 'XL'
  effort_hours_low INTEGER NOT NULL,
  effort_hours_high INTEGER NOT NULL,
  risk_score INTEGER NOT NULL,         -- 1-5
  composite_score DECIMAL NOT NULL,    -- (severity * 0.4) + (effort_inverse * 0.3) + (risk * 0.3)
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',         -- { table, sys_id, field, value, instance_url }
  remediation_pattern TEXT NOT NULL,   -- maps to SOW template
  remediation_description TEXT NOT NULL,
  affected_count INTEGER DEFAULT 1,
  pathfinder_relevant BOOLEAN DEFAULT false,  -- can Pathfinder help remediate this?
  pathfinder_recommendation JSONB,            -- deployment manifest fragment if relevant
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Remediation patterns (effort estimation library)
CREATE TABLE remediation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key TEXT UNIQUE NOT NULL,     -- 'script_refactor_simple', 'scope_migration', etc.
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  effort_hours_low INTEGER NOT NULL,
  effort_hours_high INTEGER NOT NULL,
  effort_tshirt TEXT NOT NULL,
  required_roles JSONB DEFAULT '[]',    -- ['architect', 'developer', 'admin']
  sow_scope_template TEXT,             -- pre-written scope language
  sow_assumptions TEXT,
  sow_deliverables JSONB DEFAULT '[]',
  sow_exclusions TEXT,
  calibration_factor DECIMAL DEFAULT 1.0,  -- adjusted by feedback loop
  calibration_sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scan rules (debt detection rule library)
CREATE TABLE scan_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  category TEXT NOT NULL,
  rule_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  remediation_pattern_key TEXT REFERENCES remediation_patterns(pattern_key),
  query_config JSONB NOT NULL,          -- { table, conditions, fields, aggregation }
  evaluation_logic TEXT NOT NULL,       -- 'count_threshold' | 'pattern_match' | 'age_check' | ...
  threshold_config JSONB DEFAULT '{}',  -- { warn: 10, critical: 50 } or { days: 90 }
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Benchmarking data (anonymized, aggregated)
CREATE TABLE benchmark_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  industry_vertical TEXT,
  company_size_tier TEXT,              -- 'smb' | 'midmarket' | 'enterprise'
  servicenow_version TEXT,
  module TEXT NOT NULL,
  health_score INTEGER NOT NULL,
  finding_counts JSONB DEFAULT '{}',   -- { critical: 5, high: 12, ... }
  anonymized BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pathfinder confidence data (received from Pathfinder)
CREATE TABLE pathfinder_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  instance_connection_id UUID REFERENCES instance_connections(id) NOT NULL,
  ci_sys_id TEXT NOT NULL,
  ci_class TEXT,
  confidence_score INTEGER NOT NULL,    -- 0-100
  traffic_state TEXT NOT NULL,          -- 'active' | 'idle' | 'deprecated' | 'unknown'
  last_observation TIMESTAMPTZ,
  observation_count INTEGER,
  behavioral_classification JSONB,     -- { suggested_class, confidence, reasoning }
  relationship_confirmations JSONB DEFAULT '[]',
  received_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, instance_connection_id, ci_sys_id)
);

-- SOW generation tracking
CREATE TABLE generated_sows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  status TEXT DEFAULT 'draft',         -- draft, sent, under_review, accepted, declined
  engagement_type TEXT NOT NULL,       -- 'time_and_materials' | 'fixed_fee' | 'blended'
  total_hours_low INTEGER,
  total_hours_high INTEGER,
  total_revenue_low DECIMAL,
  total_revenue_high DECIMAL,
  included_finding_ids JSONB DEFAULT '[]',
  document_url TEXT,                   -- stored generated DOCX/PDF
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies (apply to ALL tables)
-- ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY [table]_org_isolation ON [table]
--   USING (org_id = current_setting('app.current_org_id')::uuid);
```

### RLS Rule

**Every single query** must be scoped to the authenticated user's `org_id`. No exceptions. No admin bypass. Use Supabase RLS policies on every table. Set `app.current_org_id` in the session context from the authenticated user's JWT.

---

## Project Structure

```
bearing/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/                    # Login, signup
│   │   ├── (dashboard)/               # Authenticated routes
│   │   │   ├── assessments/
│   │   │   │   ├── page.tsx           # Assessment list
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx       # Assessment detail (revenue dashboard)
│   │   │   │   │   ├── findings/
│   │   │   │   │   ├── report/
│   │   │   │   │   └── sow/
│   │   │   │   └── new/
│   │   │   │       └── page.tsx       # New assessment (connect or upload)
│   │   │   ├── connections/
│   │   │   │   └── page.tsx           # Instance connections management
│   │   │   ├── settings/
│   │   │   │   ├── rate-card/
│   │   │   │   ├── branding/
│   │   │   │   └── team/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/route.ts
│   │   │   ├── webhooks/
│   │   │   │   └── pathfinder/        # Confidence feed receiver
│   │   │   └── export/
│   │   │       └── upload/route.ts    # Export scanner JSON upload
│   │   └── layout.tsx
│   │
│   ├── server/                        # Backend logic
│   │   ├── trpc/
│   │   │   ├── router.ts
│   │   │   ├── routers/
│   │   │   │   ├── assessments.ts
│   │   │   │   ├── connections.ts
│   │   │   │   ├── findings.ts
│   │   │   │   ├── sow.ts
│   │   │   │   ├── benchmarks.ts
│   │   │   │   └── pathfinder.ts
│   │   │   └── context.ts
│   │   │
│   │   ├── scanner/                   # Core scanning engine
│   │   │   ├── engine.ts              # Scan orchestrator
│   │   │   ├── servicenow-client.ts   # ServiceNow REST API client
│   │   │   ├── export-parser.ts       # JSON export payload parser
│   │   │   ├── instance-scan-importer.ts
│   │   │   └── modules/              # Module-specific scan logic
│   │   │       ├── core/
│   │   │       │   ├── scripting-debt.ts
│   │   │       │   ├── update-set-debt.ts
│   │   │       │   └── security-acl-debt.ts
│   │   │       ├── cmdb/
│   │   │       │   ├── data-quality.ts
│   │   │       │   ├── csdm-alignment.ts
│   │   │       │   ├── relationship-integrity.ts
│   │   │       │   └── service-mapping-gaps.ts
│   │   │       ├── itsm/
│   │   │       │   ├── incident-health.ts
│   │   │       │   ├── change-health.ts
│   │   │       │   └── problem-health.ts
│   │   │       ├── itam/
│   │   │       │   ├── ham-reconciliation.ts
│   │   │       │   └── sam-compliance.ts
│   │   │       ├── hrsd/
│   │   │       ├── spm/
│   │   │       ├── secops/
│   │   │       ├── grc/
│   │   │       ├── csm/
│   │   │       ├── itom/
│   │   │       └── ea/
│   │   │
│   │   ├── scoring/                   # Scoring engine
│   │   │   ├── composite-scorer.ts    # Severity * 0.4 + Effort_Inverse * 0.3 + Risk * 0.3
│   │   │   ├── health-index.ts        # Domain and instance-level health computation
│   │   │   ├── pathfinder-fusion.ts   # Composite scoring with Pathfinder confidence data
│   │   │   └── benchmarker.ts         # Peer benchmark computation
│   │   │
│   │   ├── reporting/                 # Report generation
│   │   │   ├── revenue-calculator.ts  # Apply rate cards to findings
│   │   │   ├── consultant-report.ts   # Internal report with pricing
│   │   │   ├── customer-report.ts     # White-labeled, no pricing
│   │   │   └── sow-generator.ts       # Statement of Work document builder
│   │   │
│   │   ├── integrations/
│   │   │   ├── pathfinder/
│   │   │   │   ├── confidence-ingester.ts   # Process incoming confidence feeds
│   │   │   │   ├── deployment-recommender.ts # Generate deployment manifests
│   │   │   │   └── coverage-analyzer.ts      # Four-zone coverage mapping
│   │   │   └── compass/
│   │   │       └── pipeline-sync.ts          # Sync SOW status to Compass CRM
│   │   │
│   │   └── jobs/                      # Background jobs
│   │       ├── scan-runner.ts         # Long-running scan execution
│   │       ├── confidence-push.ts     # Scheduled Pathfinder data pull
│   │       ├── assessment-decay.ts    # Time-decay visibility management
│   │       └── benchmark-aggregator.ts
│   │
│   ├── lib/                           # Shared utilities
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── types.ts              # Generated from schema
│   │   ├── servicenow/
│   │   │   ├── auth.ts               # OAuth 2.0 + basic auth
│   │   │   ├── api.ts                # Table API wrapper
│   │   │   └── tables.ts             # Table name constants per module
│   │   ├── encryption.ts             # Credential encryption
│   │   └── constants.ts
│   │
│   ├── components/                    # React components
│   │   ├── ui/                        # Design system primitives
│   │   ├── dashboard/
│   │   │   ├── HealthGauge.tsx        # 0-100 visual gauge
│   │   │   ├── RevenueSummary.tsx     # Total addressable remediation revenue
│   │   │   ├── DomainScoreCards.tsx   # Per-module health cards
│   │   │   ├── FindingsTable.tsx      # Sortable/filterable findings
│   │   │   ├── TrendChart.tsx         # Multi-assessment trend line
│   │   │   └── CoverageZoneMap.tsx    # Four-zone Pathfinder coverage
│   │   ├── reports/
│   │   │   ├── ReportPreview.tsx
│   │   │   └── BrandingConfig.tsx
│   │   └── sow/
│   │       ├── SowBuilder.tsx         # Finding selection + engagement config
│   │       └── SowPreview.tsx
│   │
│   └── types/                         # TypeScript types
│       ├── assessment.ts
│       ├── finding.ts
│       ├── servicenow.ts
│       ├── pathfinder.ts
│       └── sow.ts
│
├── supabase/
│   ├── migrations/                    # SQL migrations
│   └── seed.sql                       # Default scan rules + remediation patterns
│
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── CLAUDE.md                          # This file
```

---

## Build Phases

### Phase 1: Foundation (Build First)

**Goal: A consultant can upload an export JSON and see a health score with findings.**

Build in this order:

1. **Project scaffold** — Next.js + Supabase + Tailwind + tRPC. Get the auth flow and org-based multi-tenancy working first. Every table has `org_id` + RLS from day one.

2. **Export parser** (`server/scanner/export-parser.ts`) — Parse the sanitized JSON export payload. Define the export schema as a TypeScript type. Validate incoming payloads against the schema. This is the first data ingestion path.

3. **Scan rules seed data** (`supabase/seed.sql`) — Seed the `scan_rules` table with the core platform rules:
   - Hard-coded sys_ids in scripts (Critical)
   - Duplicate business rules (High)
   - Client scripts doing server work (High)
   - Synchronous AJAX calls (High)
   - Non-scoped customizations (Medium)
   - Deprecated API usage (Medium)
   - Stale update sets (Medium)
   - Update set collisions (High)
   - Direct production changes (Critical)
   - Overly permissive ACLs (Critical)
   - Redundant ACLs (High)
   - Elevated role assignments (High)

4. **Remediation patterns seed data** — Seed `remediation_patterns` with effort ranges and SOW template fragments for each pattern.

5. **Scoring engine** (`server/scoring/composite-scorer.ts`) — Implement: `composite = (severity * 0.4) + (effort_inverse * 0.3) + (risk * 0.3)` where effort_inverse maps XS=5, S=4, M=3, L=2, XL=1 (quick fixes score higher).

6. **Health index** (`server/scoring/health-index.ts`) — Aggregate finding scores into domain-level (0-100) and instance-level (0-100) health scores. Higher = healthier. Weight by finding count and severity distribution.

7. **Revenue calculator** (`server/reporting/revenue-calculator.ts`) — Multiply finding effort hours by the org's rate card to produce dollar values. Support T&M and fixed-fee models.

8. **Dashboard UI** — Build the revenue-first assessment detail page:
   - Health gauge (0-100) at the top
   - Total addressable remediation revenue ($XXX,XXX)
   - Revenue by module (horizontal bars)
   - Quick wins section (high severity + low effort)
   - Findings table (sortable by composite score, filterable by module/severity)

9. **Upload flow** — Build the `/assessments/new` page with JSON file upload. Parse → scan → score → redirect to dashboard.

### Phase 2: Reports & SOW

**Goal: A consultant can generate a dual report and a SOW from findings.**

1. **Consultant report generator** — DOCX output with all findings, pricing, margin analysis. Uses the org's rate card.

2. **Customer report generator** — White-labeled DOCX/PDF. Org's branding (logo, colors). Risk-focused language. No pricing. Peer benchmark placeholder.

3. **Branding config UI** — Settings page where orgs upload logo, set colors, configure legal boilerplate.

4. **SOW generator** — The money feature. Select findings → configure engagement (type, roles, timeline) → generate DOCX with scope, assumptions, deliverables, timeline, pricing, milestones. Use remediation pattern templates.

5. **SOW tracking** — Track status (draft → sent → under review → accepted → declined) in the CRM pipeline.

### Phase 3: ServiceNow API Connection

**Goal: A consultant can connect directly to an instance and run a live scan.**

1. **ServiceNow REST client** (`lib/servicenow/api.ts`) — Build a typed wrapper around the ServiceNow Table API. Support OAuth 2.0 (Authorization Code + Client Credentials) and basic auth. Handle pagination, rate limiting, and error recovery.

2. **OAuth flow** — Redirect-based OAuth for instance connection setup. Store encrypted tokens. Handle refresh.

3. **Live scan engine** — Instead of parsing an export, query ServiceNow tables directly. Run the same rule evaluation logic against live API responses. Must handle large instances gracefully (paginated queries, chunked processing).

4. **Instance Scan importer** — Ingest `scan_finding` and `scan_finding_entry` table data. Map Instance Scan finding types to Bearing categories.

5. **Module-specific scanners** — Build CMDB, ITSM, and ITAM modules first (highest demand). Each module queries its specific tables and evaluates its rule set.

### Phase 4: Pathfinder Integration

**Goal: Pathfinder confidence data enriches assessments.**

1. **Confidence feed receiver** (`api/webhooks/pathfinder/route.ts`) — Accept POST payloads from Pathfinder. Validate schema. Store in `pathfinder_confidence` table. Authenticate via API key.

2. **Pathfinder fusion scorer** (`server/scoring/pathfinder-fusion.ts`) — When Pathfinder data exists for an instance, compute composite health scores that blend static assessment quality with dynamic behavioral confidence. Generate "fusion-only findings" — things detectable only through both signals (e.g., CMDB says active + Pathfinder says idle = Critical finding).

3. **Coverage zone analyzer** — Overlay Pathfinder coverage against ServiceNow discovery schedules. Produce the four-zone map (Fully Covered, Pathfinder-Only, Discovery-Only, Dark).

4. **Deployment recommender** — When CMDB/ITOM findings indicate discovery gaps, generate Pathfinder deployment manifests. Push recommendations to Pathfinder via API.

5. **Coverage zone UI component** — Visual map of the four zones on the assessment dashboard.

### Phase 5: Network Effects

**Goal: Benchmarking, calibration, and continuous monitoring.**

1. **Benchmark aggregator** — After each assessment, anonymize and store aggregate data. Compute cohort statistics by industry, size, and platform version. Enforce minimum cohort size (10) before surfacing.

2. **Calibration feedback loop** — Track actual engagement hours (from Compass) against Bearing estimates. Compute calibration factors per remediation pattern. Apply to future estimates.

3. **Assessment time-decay** — Background job that manages visibility: full detail for 30 days, reduced at 60, summary-only at 90+.

4. **Continuous monitoring** — Scheduled recurring scans via API connection. Threshold alerts when health scores drop. Trend analysis across multiple assessments.

---

## ServiceNow API Reference

### Authentication

```typescript
// OAuth 2.0 - Authorization Code Grant
// 1. Redirect user to: https://{instance}.service-now.com/oauth_auth.do
//    ?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}
// 2. Exchange code for token: POST /oauth_token.do
//    grant_type=authorization_code&code={code}&client_id={id}&client_secret={secret}
// 3. Refresh: POST /oauth_token.do
//    grant_type=refresh_token&refresh_token={token}&client_id={id}&client_secret={secret}

// Basic Auth
// Authorization: Basic base64(username:password)
```

### Table API Pattern

```typescript
// GET /api/now/table/{table_name}
//   ?sysparm_query={encoded_query}
//   &sysparm_fields={comma_separated_fields}
//   &sysparm_limit={limit}
//   &sysparm_offset={offset}
//   &sysparm_display_value=false

// Always paginate. Default limit 100, max 10000.
// Use sysparm_offset for pagination.
// Check X-Total-Count header for total records.
```

### Tables by Module

```typescript
const MODULE_TABLES = {
  core: [
    'sys_script',           // Business rules
    'sys_script_include',   // Script includes
    'sys_ui_policy',        // UI policies
    'sys_ui_action',        // UI actions
    'sys_dictionary',       // Table/field definitions
    'sys_db_object',        // Table definitions
    'sys_scope',            // Application scopes
    'sys_update_set',       // Update sets
    'sys_update_xml',       // Update set entries
    'sys_security_acl',     // ACLs
    'sys_user_has_role',    // Role assignments
    'sys_properties',       // System properties
  ],
  cmdb: [
    'cmdb_ci',              // Base CI table
    'cmdb_rel_ci',          // CI relationships
    'cmdb_rel_type',        // Relationship types
    'cmn_location',         // Locations
    'discovery_status',     // Discovery results
    'svc_ci_assoc',         // Service-CI associations
    'cmdb_ci_service',      // Business services
    'cmdb_ci_service_auto', // Application services
  ],
  itsm: [
    'incident',
    'problem',
    'change_request',
    'sc_request',
    'sc_task',
    'task_sla',
    'sla_definition',
    'sys_trigger',
    'sys_user_group',       // Assignment groups
  ],
  itam: [
    'alm_hardware',
    'alm_consumable',
    'alm_license',
    'cmdb_sam_sw_install',
    'cmdb_software_product_model',
    'ast_contract',
    'alm_stockroom',
  ],
  hrsd: ['sn_hr_core_case', 'sn_hr_core_task', 'kb_knowledge', 'topic'],
  spm: ['pm_project', 'pm_program', 'pm_portfolio', 'dmn_demand', 'resource_plan', 'planned_task', 'time_card', 'cost_plan'],
  secops: ['sn_vul_vulnerability', 'sn_vul_entry', 'sn_si_incident', 'sn_si_task'],
  grc: ['sn_compliance_policy', 'sn_risk_risk', 'sn_grc_control', 'sn_grc_test_plan', 'sn_audit_engagement'],
  csm: ['sn_customerservice_case', 'csm_consumer', 'customer_account', 'customer_contact', 'sn_entitlement'],
  itom: ['discovery_status', 'discovery_credentials', 'sa_pattern', 'em_alert', 'em_event', 'evt_mgmt_rule'],
  ea: ['cmdb_ci_business_app', 'business_capability', 'pa_indicators', 'asmt_assessment_instance'],
} as const;
```

---

## Scan Rule Implementation Pattern

Every scan rule follows this pattern:

```typescript
interface ScanRule {
  key: string;
  module: string;
  category: string;
  displayName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number; // 1-5
  remediationPatternKey: string;

  // How to get the data
  query: {
    table: string;
    conditions: string;    // ServiceNow encoded query
    fields: string[];
    aggregation?: 'count' | 'list';
  };

  // How to evaluate the data
  evaluate: (data: any[], context: ScanContext) => Finding[];
}

interface ScanContext {
  instanceVersion: string;
  licensedPlugins: string[];
  pathfinderData?: PathfinderConfidence[];  // If available
}

interface Finding {
  ruleKey: string;
  title: string;
  description: string;
  severity: string;
  evidence: {
    table: string;
    sysId?: string;
    field?: string;
    value?: string;
    instanceUrl?: string;
  };
  affectedCount: number;
}
```

### Example Rule: Hard-Coded Sys IDs

```typescript
const hardCodedSysIdRule: ScanRule = {
  key: 'core_hardcoded_sysid',
  module: 'core',
  category: 'hardcoded_sysid',
  displayName: 'Hard-coded sys_ids in scripts',
  severity: 'critical',
  riskScore: 4,
  remediationPatternKey: 'script_refactor_simple',

  query: {
    table: 'sys_script',
    conditions: 'active=true',
    fields: ['sys_id', 'name', 'script', 'collection', 'when'],
  },

  evaluate: (scripts, context) => {
    const sysIdPattern = /[a-f0-9]{32}/g;
    const findings: Finding[] = [];

    for (const script of scripts) {
      const matches = script.script?.match(sysIdPattern) || [];
      // Filter out the script's own sys_id and common false positives
      const hardcoded = matches.filter(m =>
        m !== script.sys_id &&
        !KNOWN_SYSTEM_SYSIDS.includes(m)
      );

      if (hardcoded.length > 0) {
        findings.push({
          ruleKey: 'core_hardcoded_sysid',
          title: `Hard-coded sys_id in business rule: ${script.name}`,
          description: `Business rule "${script.name}" on table ${script.collection} contains ${hardcoded.length} hard-coded sys_id reference(s). These will break during cloning, migration, or instance refresh.`,
          severity: 'critical',
          evidence: {
            table: 'sys_script',
            sysId: script.sys_id,
            field: 'script',
            value: `${hardcoded.length} hard-coded sys_ids detected`,
          },
          affectedCount: hardcoded.length,
        });
      }
    }

    return findings;
  },
};
```

---

## Scoring Formula

```typescript
function computeCompositeScore(finding: Finding): number {
  const severityMap = { critical: 4, high: 3, medium: 2, low: 1 };
  const effortInverseMap = { XS: 5, S: 4, M: 3, L: 2, XL: 1 };

  const severityScore = severityMap[finding.severity];
  const effortInverse = effortInverseMap[finding.effortTshirt];
  const riskScore = finding.riskScore;

  // Higher = prioritize first
  // Weights: severity 40%, effort-inverse 30% (quick wins rank higher), risk 30%
  return (severityScore * 0.4) + (effortInverse * 0.3) + (riskScore * 0.3);
}

function computeHealthScore(findings: Finding[]): number {
  if (findings.length === 0) return 100;

  // Weighted penalty model
  const maxPenalty = 100;
  const penaltyPerFinding = {
    critical: 5,
    high: 3,
    medium: 1.5,
    low: 0.5,
  };

  const totalPenalty = findings.reduce((sum, f) =>
    sum + (penaltyPerFinding[f.severity] * f.affectedCount), 0
  );

  return Math.max(0, Math.round(maxPenalty - Math.min(totalPenalty, maxPenalty)));
}
```

---

## Revenue Calculation

```typescript
interface RateCard {
  roles: Array<{ name: string; hourlyRate: number }>;
  defaultEngagementType: 'time_and_materials' | 'fixed_fee';
  blendedRate?: number; // If no role-specific rates
  marginTarget?: number; // e.g., 0.35 for 35%
}

function calculateRevenue(findings: Finding[], rateCard: RateCard): RevenueProjection {
  const blendedRate = rateCard.blendedRate ||
    rateCard.roles.reduce((sum, r) => sum + r.hourlyRate, 0) / rateCard.roles.length;

  let totalHoursLow = 0;
  let totalHoursHigh = 0;

  for (const finding of findings) {
    totalHoursLow += finding.effortHoursLow * finding.affectedCount;
    totalHoursHigh += finding.effortHoursHigh * finding.affectedCount;
  }

  return {
    totalHoursLow,
    totalHoursHigh,
    totalRevenueLow: totalHoursLow * blendedRate,
    totalRevenueHigh: totalHoursHigh * blendedRate,
    byModule: groupByModule(findings, blendedRate),
    quickWins: findings
      .filter(f => f.severity >= 'high' && ['XS', 'S'].includes(f.effortTshirt))
      .sort((a, b) => b.compositeScore - a.compositeScore),
  };
}
```

---

## Pathfinder Integration

### Confidence Feed Webhook

```typescript
// POST /api/webhooks/pathfinder
// Header: X-Bearing-API-Key: {api_key}

interface PathfinderConfidenceFeed {
  schema_version: string;
  pathfinder_instance_id: string;
  servicenow_instance_url: string;
  observation_window_hours: number;
  generated_at: string;
  ci_confidence_records: Array<{
    ci_sys_id: string;
    ci_class: string;
    confidence_score: number;     // 0-100
    traffic_state: 'active' | 'idle' | 'deprecated' | 'unknown';
    last_observation: string;
    observation_count: number;
    communication_partners: Array<{
      partner_ci_sys_id: string;
      protocol: string;
      port: number;
      last_seen: string;
      traffic_volume_bytes_24h: number;
    }>;
    relationship_confirmations: Array<{
      rel_ci_sys_id: string;
      parent_ci_sys_id: string;
      child_ci_sys_id: string;
      rel_type: string;
      confirmed: boolean;
      confidence: number;
    }>;
    behavioral_classification?: {
      suggested_class: string;
      classification_confidence: number;
      reasoning: string;
    };
  }>;
  coverage_summary: {
    total_monitored_hosts: number;
    active_cis: number;
    idle_cis: number;
    deprecated_cis: number;
    unknown_cis: number;
    monitored_subnets: string[];
    unmonitored_subnets_detected: string[];
  };
}
```

### Fusion-Only Findings

These are findings that can ONLY be detected when both Bearing assessment data and Pathfinder behavioral data are available:

```typescript
const fusionRules = [
  {
    key: 'cmdb_traffic_mismatch_active_idle',
    title: 'CMDB says Active, Pathfinder says Idle',
    severity: 'critical',
    detect: (cmdbStatus: string, pathfinderState: string) =>
      cmdbStatus === 'Operational' && pathfinderState === 'idle',
    description: 'CI is marked Operational in the CMDB but Pathfinder has observed minimal traffic. The CMDB record may be inaccurate.',
  },
  {
    key: 'cmdb_traffic_mismatch_retired_active',
    title: 'CMDB says Retired, Pathfinder says Active',
    severity: 'high',
    detect: (cmdbStatus: string, pathfinderState: string) =>
      cmdbStatus === 'Retired' && pathfinderState === 'active',
    description: 'CI is marked Retired in the CMDB but Pathfinder observes active traffic. This CI may still be in use despite being marked for decommission.',
  },
  {
    key: 'cmdb_class_mismatch',
    title: 'CSDM class does not match observed behavior',
    severity: 'high',
    detect: (cmdbClass: string, suggestedClass: string, confidence: number) =>
      cmdbClass !== suggestedClass && confidence > 75,
    description: 'Pathfinder behavioral analysis suggests this CI should be classified differently based on observed traffic patterns.',
  },
  {
    key: 'shadow_it_detection',
    title: 'Active traffic with no CMDB record',
    severity: 'critical',
    detect: (hasCmdbRecord: boolean, pathfinderState: string) =>
      !hasCmdbRecord && pathfinderState === 'active',
    description: 'Pathfinder observes active traffic from a host that has no corresponding CI in the CMDB. This is undocumented infrastructure.',
  },
  {
    key: 'relationship_unconfirmed',
    title: 'CMDB relationship not confirmed by traffic',
    severity: 'medium',
    detect: (hasRelationship: boolean, confirmed: boolean) =>
      hasRelationship && !confirmed,
    description: 'A relationship exists in the CMDB but Pathfinder has not observed traffic between these CIs. The relationship may be stale.',
  },
];
```

---

## Key Design Principles

1. **Revenue-first, not findings-first.** The dashboard leads with dollar amounts. Findings are the supporting detail. Every screen answers "how much is this worth?"

2. **org_id on everything.** Multi-tenancy is not optional. Every table, every query, every API response is scoped to the authenticated org. Use Supabase RLS. Never bypass it.

3. **Export-first, API-second.** The export scanner path must work before the API connection path. Most customers will start with export. Don't make API connection a prerequisite.

4. **Dual reports from single scan.** Never build separate scan logic for consultant vs. customer reports. One scan, one findings set, two views.

5. **Patterns, not one-offs.** Every finding maps to a remediation pattern. Every pattern has effort ranges and SOW templates. Don't create findings without patterns.

6. **Pathfinder is additive.** Everything works without Pathfinder data. When Pathfinder data exists, the assessment gets richer. Never make Pathfinder a hard dependency.

7. **Protect the patents.** The assessment-to-SOW pipeline, the calibration feedback loop, the dual-report generation, the sanitized export assessment, the assessment-triggered discovery deployment, and the composite health scoring with behavioral confidence fusion are all provisional patent claims. The implementation must match the claim language. Don't shortcut the chains described in the claims.

8. **Seed data is the product.** The scan rules and remediation patterns ARE the product. The platform is just plumbing. Invest heavily in rule quality, pattern accuracy, and SOW template language. This is where domain expertise lives.

---

## Environment Variables

```env
# Database
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# ServiceNow OAuth (for API connection mode)
SERVICENOW_CLIENT_ID=
SERVICENOW_CLIENT_SECRET=
SERVICENOW_REDIRECT_URI=

# Pathfinder Integration
PATHFINDER_WEBHOOK_SECRET=

# Encryption (for stored credentials)
ENCRYPTION_KEY=

# Document Generation
REPORTS_STORAGE_BUCKET=

# Feature Flags
ENABLE_PATHFINDER_INTEGRATION=false
ENABLE_BENCHMARKING=false
ENABLE_CONTINUOUS_MONITORING=false
```

---

## What to Build First

Start here. In this exact order:

1. `npx create-next-app@latest bearing --typescript --tailwind --app --src-dir`
2. Set up Supabase project + run migration for core schema
3. Build the export upload page + export parser
4. Seed 12 core platform scan rules + remediation patterns
5. Build the scoring engine
6. Build the assessment detail page with health gauge + revenue summary
7. Ship it. Everything else layers on top.
