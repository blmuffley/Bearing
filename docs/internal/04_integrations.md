# Bearing -- Integration Guide

> **Internal Avennorth Document** -- Not for customer distribution.
> Last updated: 2026-03-29

---

## Pathfinder -> Bearing

### Webhook Endpoint

```
POST /api/webhooks/pathfinder
```

**Authentication:** `X-Bearing-API-Key` header containing the value of `PATHFINDER_WEBHOOK_SECRET` environment variable.

**Source file:** `src/app/api/webhooks/pathfinder/route.ts`

### Payload Schema (PathfinderConfidenceFeed)

```json
{
  "schema_version": "1.0",
  "pathfinder_instance_id": "pf-abc123",
  "servicenow_instance_url": "https://customer.service-now.com",
  "observation_window_hours": 24,
  "generated_at": "2026-03-29T12:00:00Z",
  "ci_confidence_records": [
    {
      "ci_sys_id": "abc123def456...",
      "ci_class": "cmdb_ci_linux_server",
      "confidence_score": 85,
      "traffic_state": "active",
      "last_observation": "2026-03-29T11:55:00Z",
      "observation_count": 1247,
      "communication_partners": [
        {
          "partner_ci_sys_id": "def789...",
          "protocol": "TCP",
          "port": 443,
          "last_seen": "2026-03-29T11:55:00Z",
          "traffic_volume_bytes_24h": 1048576
        }
      ],
      "relationship_confirmations": [
        {
          "rel_ci_sys_id": "rel123...",
          "parent_ci_sys_id": "abc123...",
          "child_ci_sys_id": "def789...",
          "rel_type": "Runs on::Runs",
          "confirmed": true,
          "confidence": 92
        }
      ],
      "behavioral_classification": {
        "suggested_class": "cmdb_ci_app_server",
        "classification_confidence": 78,
        "reasoning": "HTTP/HTTPS traffic patterns consistent with application server behavior"
      }
    }
  ],
  "coverage_summary": {
    "total_monitored_hosts": 500,
    "active_cis": 350,
    "idle_cis": 80,
    "deprecated_cis": 20,
    "unknown_cis": 50,
    "monitored_subnets": ["10.0.1.0/24", "10.0.2.0/24"],
    "unmonitored_subnets_detected": ["10.0.5.0/24"]
  }
}
```

All fields are validated via Zod schema in the route handler. Invalid payloads return 400 with field-level error details.

### What Bearing Does with the Data

**Step 1: Instance Connection Lookup**
The webhook looks up the `instance_connections` record by matching `servicenow_instance_url` to find the `org_id` and `connection_id`.

**Step 2: Confidence Ingestion**
The `ConfidenceIngester` (`src/server/integrations/pathfinder/confidence-ingester.ts`) upserts each CI confidence record into the `pathfinder_confidence` table. Records are batched in chunks of 100. Upsert uses the unique constraint on `(org_id, instance_connection_id, ci_sys_id)`.

**Step 3: Fusion Scoring (on demand)**
When an assessment is viewed with Pathfinder data available, `computeFusionScore()` (`src/server/scoring/pathfinder-fusion.ts`) applies 5 fusion rules:

| # | Rule | Detects | Severity |
|---|------|---------|----------|
| 1 | cmdb_traffic_mismatch_active_idle | CMDB = Operational, Pathfinder = idle | Critical |
| 2 | cmdb_traffic_mismatch_retired_active | CMDB = Retired, Pathfinder = active | High |
| 3 | cmdb_class_mismatch | CMDB class != Pathfinder behavioral classification (>75% confidence) | High |
| 4 | shadow_it_detection | Active traffic with no CMDB record | Critical |
| 5 | relationship_unconfirmed | CMDB relationship exists but no traffic observed | Medium |

These are "fusion-only" findings -- they can ONLY be detected when both Bearing assessment data and Pathfinder behavioral data exist.

**Step 4: Coverage Zone Analysis**
The `analyzeCoverage()` function (`src/server/integrations/pathfinder/coverage-analyzer.ts`) maps every CI into one of four zones:

| Zone | Definition |
|------|-----------|
| **Fully Covered** | CI in CMDB AND has Pathfinder data with confidence > 50 |
| **Pathfinder Only** | Pathfinder sees traffic but no CMDB CI matches (shadow IT) |
| **Discovery Only** | CI in CMDB with discovery source but no Pathfinder data |
| **Dark** | CI in CMDB with no discovery source AND no Pathfinder data |

Recommendations are auto-generated based on zone percentages:
- Dark > 20%: "Consider expanding Pathfinder deployment"
- Any Pathfinder-only CIs: "Shadow IT detected"
- Discovery-only > 30%: "Pathfinder coverage gap -- deploy agents"

**Step 5: Deployment Recommendations**
The `generateDeploymentRecommendations()` function (`src/server/integrations/pathfinder/deployment-recommender.ts`) groups dark-zone and discovery-only CIs by /24 subnet, filters out subnets already covered by Pathfinder agents, and produces prioritized deployment manifests:

- 20+ CIs in a subnet = high priority
- 5-19 CIs = medium priority
- <5 CIs = low priority

---

## Bearing -> Compass

**Source file:** `src/server/integrations/compass/pipeline-sync.ts`

> **Note:** The Compass webhook contract is not yet finalized. The current implementation posts to a placeholder endpoint. TODOs in the code track outstanding items: HMAC signature verification, retry logic, idempotency keys.

### Pipeline Sync Endpoint

```
POST {COMPASS_URL}/api/integrations/bearing/sync
Authorization: Bearer {COMPASS_API_KEY}
Content-Type: application/json
```

### SOW Data Pushed to Compass

When a SOW is generated, Bearing pushes a `sow_sync` event:

```json
{
  "type": "sow_sync",
  "payload": {
    "sowId": "uuid",
    "customerName": "Acme Corp",
    "status": "draft",
    "engagementType": "time_and_materials",
    "totalRevenueLow": 45000,
    "totalRevenueHigh": 85000,
    "assessmentHealthScore": 42,
    "findingsSummary": { "critical": 5, "high": 12, "medium": 20, "low": 8 }
  }
}
```

Returns `compassDealId` from the Compass response.

### Assessment Lead Data Pushed

When an assessment completes, Bearing pushes an `assessment_lead` event:

```json
{
  "type": "assessment_lead",
  "payload": {
    "customerName": "Acme Corp",
    "instanceUrl": "https://acme.service-now.com",
    "healthScore": 42,
    "totalRevenue": 85000,
    "quickWinCount": 7
  }
}
```

Returns `compassLeadId` from the Compass response.

### Calibration Data Received from Compass

Compass records actual engagement hours. These flow back to Bearing via the `benchmarks.recordActualHours` tRPC procedure, which updates `calibration_factor` on the corresponding `remediation_patterns` row.

---

## Bearing -> ServiceNow

### REST API Client

**Source files:**
- `src/lib/servicenow/api.ts` -- ServiceNowClient class with Table API wrapper
- `src/lib/servicenow/auth.ts` -- OAuth 2.0 and basic auth handling
- `src/lib/servicenow/tables.ts` -- Table name constants per module

### Authentication Methods

**OAuth 2.0 (Authorization Code Grant):**
1. Redirect user to: `https://{instance}.service-now.com/oauth_auth.do?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}`
2. Exchange code for token: `POST /oauth_token.do` with `grant_type=authorization_code`
3. Refresh: `POST /oauth_token.do` with `grant_type=refresh_token`

Environment variables: `SERVICENOW_CLIENT_ID`, `SERVICENOW_CLIENT_SECRET`, `SERVICENOW_REDIRECT_URI`

**Basic Auth:**
`Authorization: Basic base64(username:password)`

Credentials are encrypted at rest (encryption module pending full implementation).

### Table API Patterns

```
GET /api/now/table/{table_name}
  ?sysparm_query={encoded_query}
  &sysparm_fields={comma_separated_fields}
  &sysparm_limit={limit}
  &sysparm_offset={offset}
  &sysparm_display_value=false
```

- Default limit: 100, max: 10000
- Use `sysparm_offset` for pagination
- Check `X-Total-Count` header for total records
- ServiceNow rate limits apply (varies by instance edition)

### Connection Testing

```
POST /api/connections/test
```

Verifies connectivity by calling `ServiceNowClient.testConnection()` which queries a lightweight endpoint on the target instance.

### Tables Queried by Module

**Core Platform:** sys_script, sys_script_include, sys_ui_policy, sys_ui_action, sys_dictionary, sys_db_object, sys_scope, sys_update_set, sys_update_xml, sys_security_acl, sys_user_has_role, sys_properties

**CMDB:** cmdb_ci, cmdb_rel_ci, cmdb_rel_type, cmn_location, discovery_status, svc_ci_assoc, cmdb_ci_service, cmdb_ci_service_auto

**ITSM:** incident, problem, change_request, sc_request, sc_task, task_sla, sla_definition, sys_trigger, sys_user_group

**ITAM:** alm_hardware, alm_consumable, alm_license, cmdb_sam_sw_install, cmdb_software_product_model, ast_contract, alm_stockroom

---

## Environment Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | Supabase project settings -> Database -> Connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase project settings -> API -> Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase project settings -> API -> anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Supabase project settings -> API -> service_role key |
| `NEXTAUTH_SECRET` | Session encryption secret | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application base URL | Your deployment URL (e.g. `https://bearing.avennorth.com`) |
| `SERVICENOW_CLIENT_ID` | OAuth 2.0 client ID for ServiceNow | ServiceNow instance -> System OAuth -> Application Registries |
| `SERVICENOW_CLIENT_SECRET` | OAuth 2.0 client secret | Same location as client ID |
| `SERVICENOW_REDIRECT_URI` | OAuth 2.0 redirect URI | Must match the registered redirect URI |
| `PATHFINDER_WEBHOOK_SECRET` | API key for Pathfinder webhook authentication | Shared with Pathfinder team |
| `ENCRYPTION_KEY` | AES key for encrypting stored credentials | Generate with `openssl rand -hex 32` |
| `REPORTS_STORAGE_BUCKET` | Storage bucket for generated reports | Supabase Storage or S3-compatible bucket |
| `COMPASS_URL` | Compass CRM base URL | Compass deployment URL |
| `COMPASS_API_KEY` | API key for Compass integration | Compass admin panel |
| `ENABLE_PATHFINDER_INTEGRATION` | Feature flag (true/false, default false) | Set to true when Pathfinder is deployed |
| `ENABLE_BENCHMARKING` | Feature flag (true/false, default false) | Set to true when 10+ assessments exist |
| `ENABLE_CONTINUOUS_MONITORING` | Feature flag (true/false, default false) | Set to true for recurring scans |
