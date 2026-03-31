# Bearing -- Database Schema Reference

> **Internal Avennorth Document** -- Not for customer distribution.
> Last updated: 2026-03-29

Migration file: `supabase/migrations/00001_initial_schema.sql`
Seed data: `supabase/seed.sql`

---

## Schema Overview

Bearing uses 10 tables in Supabase (PostgreSQL). Tables fall into two categories:

- **Tenant-scoped** (have `org_id`, RLS enabled): organizations, users, instance_connections, assessments, findings, pathfinder_confidence, generated_sows
- **Global reference data** (no `org_id`, no RLS): scan_rules, remediation_patterns, benchmark_data

Extension required: `pgcrypto` (for `gen_random_uuid()`).

---

## Table: `organizations`

**Purpose:** Tenants -- consulting firms that use Bearing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| name | TEXT | NOT NULL | Organization display name |
| slug | TEXT | NOT NULL, UNIQUE | URL-safe slug |
| brand_config | JSONB | DEFAULT '{}' | `{ logo_url, primary_color, secondary_color, legal_text }` |
| rate_card | JSONB | DEFAULT '{}' | `{ roles: [{ name, hourly_rate }], default_engagement_type }` |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Relationships:** Parent of users, instance_connections, assessments, findings, pathfinder_confidence, generated_sows.

**RLS:** None (org_id IS the id). Access controlled at the application layer.

**Indexes:** Primary key only.

---

## Table: `users`

**Purpose:** Users within organizations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| org_id | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | Tenant isolation |
| email | TEXT | NOT NULL, UNIQUE | User email address |
| name | TEXT | NOT NULL | Display name |
| role | TEXT | NOT NULL, DEFAULT 'member' | One of: admin, member, viewer |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS Policy:** `org_isolation` -- `USING (org_id = current_setting('app.current_org_id')::uuid)`

**Indexes:**
- `idx_users_org_id` on `org_id`

---

## Table: `instance_connections`

**Purpose:** ServiceNow instance connection records. Each represents one customer's ServiceNow instance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| org_id | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | Tenant isolation |
| customer_name | TEXT | NOT NULL | Customer display name |
| instance_url | TEXT | NOT NULL | e.g. `https://customer.service-now.com` |
| connection_type | TEXT | NOT NULL | One of: oauth, basic, export |
| credentials_encrypted | TEXT | | Encrypted OAuth tokens or basic auth (NULL for export) |
| servicenow_version | TEXT | | Instance platform version |
| licensed_plugins | JSONB | DEFAULT '[]' | List of licensed plugin IDs |
| last_connected_at | TIMESTAMPTZ | | Last successful connection time |
| status | TEXT | NOT NULL, DEFAULT 'pending' | One of: pending, active, error, disconnected |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS Policy:** `org_isolation` -- `USING (org_id = current_setting('app.current_org_id')::uuid)`

**Indexes:**
- `idx_instance_connections_org_id` on `org_id`

---

## Table: `assessments`

**Purpose:** Assessment run records. Each represents one scan of a ServiceNow instance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| org_id | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | Tenant isolation |
| instance_connection_id | UUID | NOT NULL, FK -> instance_connections(id) ON DELETE CASCADE | Which instance was scanned |
| scan_type | TEXT | NOT NULL | One of: full_api, export_ingest, instance_scan_import |
| status | TEXT | NOT NULL, DEFAULT 'queued' | One of: queued, scanning, analyzing, scoring, complete, error |
| modules_enabled | JSONB | DEFAULT '[]' | e.g. `["core", "cmdb", "itsm", "itam"]` |
| started_at | TIMESTAMPTZ | | Scan start time |
| completed_at | TIMESTAMPTZ | | Scan completion time |
| health_score | INTEGER | | Composite health score 0-100 |
| domain_scores | JSONB | DEFAULT '{}' | e.g. `{ "core": 43, "cmdb": 67, "itsm": 82 }` |
| scan_metadata | JSONB | DEFAULT '{}' | Instance version, CI counts, scan duration, etc. |
| expires_at | TIMESTAMPTZ | | Time-decay expiration (30/60/90 day visibility) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS Policy:** `org_isolation` -- `USING (org_id = current_setting('app.current_org_id')::uuid)`

**Indexes:**
- `idx_assessments_org_id` on `org_id`
- `idx_assessments_instance_connection_id` on `instance_connection_id`

---

## Table: `findings`

**Purpose:** Individual findings produced by scan rules. Each finding represents one detected technical debt item.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| org_id | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | Tenant isolation |
| assessment_id | UUID | NOT NULL, FK -> assessments(id) ON DELETE CASCADE | Parent assessment |
| module | TEXT | NOT NULL | core, cmdb, itsm, itam |
| category | TEXT | NOT NULL | Rule key (e.g. core_hardcoded_sysid) |
| severity | TEXT | NOT NULL | critical, high, medium, low, info |
| severity_score | INTEGER | NOT NULL | 1-4 numeric mapping |
| effort_tshirt | TEXT | | XS, S, M, L, XL |
| effort_hours_low | INTEGER | | Low end of effort range |
| effort_hours_high | INTEGER | | High end of effort range |
| risk_score | INTEGER | | 1-5 |
| composite_score | DECIMAL | | Computed: (severity*0.4) + (effort_inverse*0.3) + (risk*0.3) |
| title | TEXT | NOT NULL | Human-readable finding title |
| description | TEXT | | Detailed description |
| evidence | JSONB | DEFAULT '{}' | `{ table, sys_id, field, value, instance_url }` |
| remediation_pattern | TEXT | | Maps to remediation_patterns.pattern_key |
| remediation_description | TEXT | | Human-readable remediation guidance |
| affected_count | INTEGER | NOT NULL, DEFAULT 1 | Number of affected records |
| pathfinder_relevant | BOOLEAN | NOT NULL, DEFAULT false | Can Pathfinder help remediate? |
| pathfinder_recommendation | JSONB | | Deployment manifest fragment if relevant |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS Policy:** `org_isolation` -- `USING (org_id = current_setting('app.current_org_id')::uuid)`

**Indexes:**
- `idx_findings_org_id` on `org_id`
- `idx_findings_assessment_id` on `assessment_id`
- `idx_findings_severity` on `severity`
- `idx_findings_module` on `module`

---

## Table: `remediation_patterns`

**Purpose:** Effort estimation library. Each pattern defines the effort range, required roles, and SOW template language for a category of remediation work.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| pattern_key | TEXT | NOT NULL, UNIQUE | Lookup key (e.g. script_refactor_simple) |
| display_name | TEXT | NOT NULL | Human-readable name |
| description | TEXT | | What this remediation pattern covers |
| effort_hours_low | INTEGER | NOT NULL | Low end of base effort range |
| effort_hours_high | INTEGER | NOT NULL | High end of base effort range |
| effort_tshirt | TEXT | NOT NULL | XS, S, M, L, XL |
| required_roles | JSONB | DEFAULT '[]' | e.g. `["admin", "developer", "architect"]` |
| sow_scope_template | TEXT | | Pre-written scope language for SOW |
| sow_assumptions | TEXT | | Assumptions text for SOW |
| sow_deliverables | JSONB | DEFAULT '[]' | List of deliverable descriptions |
| sow_exclusions | TEXT | | Exclusions text for SOW |
| calibration_factor | DECIMAL | NOT NULL, DEFAULT 1.0 | Running average of actual/estimated ratio |
| calibration_sample_size | INTEGER | NOT NULL, DEFAULT 0 | Number of actual-vs-estimated data points |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS:** None -- global reference data.

**Indexes:** UNIQUE on `pattern_key`.

**Seed data:** 12 patterns. See `supabase/seed.sql`.

---

## Table: `scan_rules`

**Purpose:** Debt detection rule library. Defines what each rule checks, how it evaluates data, and its severity/risk classification.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| module | TEXT | NOT NULL | core, cmdb, itsm, itam |
| category | TEXT | NOT NULL | Rule category (code_quality, architecture, etc.) |
| rule_key | TEXT | NOT NULL, UNIQUE | Unique rule identifier |
| display_name | TEXT | NOT NULL | Human-readable rule name |
| description | TEXT | | What this rule detects |
| severity | TEXT | NOT NULL | critical, high, medium, low |
| risk_score | INTEGER | NOT NULL | 1-5 |
| remediation_pattern_key | TEXT | FK -> remediation_patterns(pattern_key) | Maps to remediation pattern |
| query_config | JSONB | DEFAULT '{}' | `{ table, conditions, fields, additional_tables, group_by }` |
| evaluation_logic | TEXT | NOT NULL | pattern_match, count_threshold, age_check |
| threshold_config | JSONB | DEFAULT '{}' | Rule-specific thresholds |
| enabled | BOOLEAN | NOT NULL, DEFAULT true | Whether rule is active |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS:** None -- global reference data.

**Indexes:**
- `idx_scan_rules_module` on `module`
- `idx_scan_rules_rule_key` on `rule_key`

**Seed data:** 12 core platform rules. See `supabase/seed.sql`.

---

## Table: `benchmark_data`

**Purpose:** Anonymized, aggregated assessment data for peer benchmarking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| assessment_id | UUID | NOT NULL, FK -> assessments(id) ON DELETE CASCADE | Source assessment |
| industry_vertical | TEXT | | Industry classification |
| company_size_tier | TEXT | | smb, midmarket, enterprise |
| servicenow_version | TEXT | | Platform version |
| module | TEXT | | Domain module |
| health_score | INTEGER | | Module health score |
| finding_counts | JSONB | DEFAULT '{}' | `{ critical: 5, high: 12, medium: 20, low: 8 }` |
| anonymized | BOOLEAN | NOT NULL, DEFAULT true | Always true for benchmark data |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS:** None -- anonymized aggregate data.

**Indexes:**
- `idx_benchmark_data_assessment_id` on `assessment_id`

**Note:** Cohort statistics are only surfaced when the cohort contains at least 10 assessments.

---

## Table: `pathfinder_confidence`

**Purpose:** Stores Pathfinder behavioral confidence data received via webhook.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| org_id | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | Tenant isolation |
| instance_connection_id | UUID | NOT NULL, FK -> instance_connections(id) ON DELETE CASCADE | Which instance |
| ci_sys_id | TEXT | NOT NULL | ServiceNow CI sys_id |
| ci_class | TEXT | NOT NULL | CMDB CI class |
| confidence_score | DECIMAL | NOT NULL | 0-100 |
| traffic_state | TEXT | | active, idle, deprecated, unknown |
| last_observation | TIMESTAMPTZ | | Last time Pathfinder observed this CI |
| observation_count | INTEGER | NOT NULL, DEFAULT 0 | Number of observations |
| behavioral_classification | JSONB | DEFAULT '{}' | `{ suggested_class, classification_confidence, reasoning }` |
| relationship_confirmations | JSONB | DEFAULT '[]' | Array of relationship confirmation objects |
| received_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When data was received |

**Unique constraint:** `(org_id, instance_connection_id, ci_sys_id)` -- upsert on each feed.

**RLS Policy:** `org_isolation` -- `USING (org_id = current_setting('app.current_org_id')::uuid)`

**Indexes:**
- `idx_pathfinder_confidence_org_id` on `org_id`
- `idx_pathfinder_confidence_ci_sys_id` on `ci_sys_id`

---

## Table: `generated_sows`

**Purpose:** Tracks generated Statements of Work and their pipeline status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| org_id | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | Tenant isolation |
| assessment_id | UUID | NOT NULL, FK -> assessments(id) ON DELETE CASCADE | Source assessment |
| status | TEXT | NOT NULL, DEFAULT 'draft' | draft, sent, under_review, accepted, declined |
| engagement_type | TEXT | | time_and_materials, fixed_fee, blended |
| total_hours_low | INTEGER | | Low end of total hours estimate |
| total_hours_high | INTEGER | | High end of total hours estimate |
| total_revenue_low | DECIMAL | | Low end of total revenue |
| total_revenue_high | DECIMAL | | High end of total revenue |
| included_finding_ids | JSONB | DEFAULT '[]' | Array of finding UUIDs included in SOW |
| document_url | TEXT | | URL to stored DOCX/PDF |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**RLS Policy:** `org_isolation` -- `USING (org_id = current_setting('app.current_org_id')::uuid)`

**Indexes:**
- `idx_generated_sows_org_id` on `org_id`
- `idx_generated_sows_assessment_id` on `assessment_id`

---

## Scoring Formulas Reference

### Composite Score

Used to prioritize findings. Higher = address first.

```
composite = (severity * 0.4) + (effortInverse * 0.3) + (risk * 0.3)
```

| Severity | Score |
|----------|-------|
| critical | 4 |
| high | 3 |
| medium | 2 |
| low | 1 |

| Effort (T-shirt) | Inverse Score | Hours Range |
|-------------------|---------------|-------------|
| XS | 5 | 1-4 |
| S | 4 | 2-8 |
| M | 3 | 4-16 |
| L | 2 | 8-32 |
| XL | 1 | 16-40 |

Risk score: 1-5 (defined per scan rule).

**Example:** Critical severity (4), XS effort (5), risk 4:
```
(4 * 0.4) + (5 * 0.3) + (4 * 0.3) = 1.6 + 1.5 + 1.2 = 4.3
```

### Health Score

0-100 scale. 100 = no findings. Each finding deducts a penalty weighted by severity and affected count.

```
health = max(0, round(100 - min(totalPenalty, 100)))
totalPenalty = SUM(penaltyWeight[severity] * affectedCount)
```

| Severity | Penalty Per Affected Item |
|----------|--------------------------|
| critical | 5.0 |
| high | 3.0 |
| medium | 1.5 |
| low | 0.5 |

**Example:** 3 critical findings (affected_count=1 each) + 5 high findings:
```
penalty = (3 * 5.0) + (5 * 3.0) = 15 + 15 = 30
health = max(0, round(100 - min(30, 100))) = 70
```

### Effort Mapping (Remediation Patterns)

| Pattern Key | T-shirt | Hours Low | Hours High | Required Roles |
|-------------|---------|-----------|------------|----------------|
| script_refactor_simple | XS | 2 | 4 | admin, developer |
| script_refactor_complex | M | 8 | 16 | admin, developer, architect |
| business_rule_consolidation | S | 4 | 8 | admin, developer |
| client_script_migration | M | 4 | 12 | admin, developer |
| ajax_modernization | S | 2 | 6 | developer |
| scope_migration | L | 16 | 40 | admin, developer, architect |
| api_version_upgrade | S | 4 | 8 | developer |
| update_set_cleanup | XS | 2 | 4 | admin |
| update_set_conflict_resolution | M | 8 | 24 | admin, developer |
| production_change_remediation | L | 16 | 32 | admin, architect |
| acl_restructuring | M | 8 | 16 | admin, security_admin |
| role_audit_remediation | M | 4 | 12 | admin, security_admin |

### Calibration Factor

Applied after minimum 3 samples:

```
adjustedHoursLow = baseHoursLow * calibration_factor
adjustedHoursHigh = baseHoursHigh * calibration_factor
```

Factor > 1.0: estimates were too low (actual work takes longer).
Factor < 1.0: estimates were too high (actual work is faster).
Factor = 1.0: perfectly calibrated.
