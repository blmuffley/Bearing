# Fusion Engine Reference

**Internal Engineering Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## Overview

The fusion engine generates findings that are only detectable when both CMDB assessment data (from Bearing) and behavioral observation data (from Pathfinder) are available. These "fusion findings" represent the highest-value insights Bearing produces -- they validate CMDB records against real network traffic.

Fusion is strictly additive. Every assessment runs and completes without Pathfinder data. When Pathfinder confidence data has been received via webhook, the assessment engine appends fusion findings to the standard dimension findings.

**Source files**:
- `src/bearing/fusion/pathfinder.py` -- Confidence store and feed processor
- `src/bearing/fusion/findings.py` -- Fusion finding generator (5 detection types)
- `src/bearing/fusion/contour.py` -- Contour event processor (future use)
- `src/bearing/api/webhooks.py` -- Webhook endpoints

---

## Pathfinder Confidence Feed

### Webhook Endpoint

```
POST /api/webhooks/pathfinder
Header: X-Bearing-API-Key: {api_key}
Content-Type: application/json
```

Returns `401` if the API key does not match `BEARING_API_KEY`.
Returns `200` with `{"status": "accepted", "records_processed": N}` on success.
Returns `422` if the payload fails Pydantic validation.

### Payload Schema

```json
{
  "schema_version": "1.0",
  "pathfinder_instance_id": "pf-prod-01",
  "servicenow_instance_url": "https://customer.service-now.com",
  "observation_window_hours": 24,
  "generated_at": "2026-03-31T12:00:00Z",
  "ci_confidence_records": [
    {
      "ci_sys_id": "abc123def456...",
      "ci_class": "cmdb_ci_linux_server",
      "confidence_score": 90,
      "traffic_state": "active",
      "last_observation": "2026-03-31T11:55:00Z",
      "observation_count": 1500,
      "communication_partners": [
        {
          "partner_ci_sys_id": "def456...",
          "protocol": "TCP",
          "port": 443,
          "last_seen": "2026-03-31T11:55:00Z",
          "traffic_volume_bytes_24h": 52428800
        }
      ],
      "relationship_confirmations": [
        {
          "rel_ci_sys_id": "rel001...",
          "parent_ci_sys_id": "abc123...",
          "child_ci_sys_id": "def456...",
          "rel_type": "Depends on::Used by",
          "confirmed": true,
          "confidence": 95
        }
      ],
      "behavioral_classification": {
        "suggested_class": "cmdb_ci_app_server",
        "classification_confidence": 85,
        "reasoning": "Serves HTTP/HTTPS traffic on ports 80/443 with request-response pattern"
      }
    }
  ],
  "coverage_summary": {
    "total_monitored_hosts": 500,
    "active_cis": 400,
    "idle_cis": 80,
    "deprecated_cis": 15,
    "unknown_cis": 5,
    "monitored_subnets": ["10.0.1.0/24", "10.0.2.0/24"],
    "unmonitored_subnets_detected": ["10.0.5.0/24"]
  }
}
```

### Key Schema Types

**TrafficState** enum: `active`, `idle`, `deprecated`, `unknown`

- `active` -- Pathfinder observes regular network traffic
- `idle` -- Host is reachable but traffic is minimal/none
- `deprecated` -- Host shows signs of decommissioning (no traffic for extended period)
- `unknown` -- Insufficient observation data to classify

**confidence_score**: 0-100 integer. Represents Pathfinder's confidence in the accuracy of its observations for this CI. Higher = more observation data, consistent behavior.

**behavioral_classification**: Optional. When present, Pathfinder suggests a CI class based on observed traffic patterns (e.g., a host serving HTTP traffic on 80/443 is likely an app server, not a generic server).

---

## Confidence Store

The `ConfidenceStore` is an in-memory singleton (module-level `_store` instance). It holds:

- `records: dict[str, CIConfidenceRecord]` -- Keyed by `ci_sys_id`
- Coverage summary fields (total_monitored, active, idle, deprecated, subnet lists)

**Lifecycle**: Data persists for the lifetime of the application process. Each incoming Pathfinder feed overwrites records for the same `ci_sys_id`. There is no TTL or eviction.

**Access pattern**: `get_confidence_store()` returns the singleton. The `PathfinderProcessor` writes to it during webhook ingestion. The `FusionFindingGenerator` reads from it during assessment execution.

**Production consideration**: In a production deployment with multiple workers, the in-memory store would not be shared across processes. A database-backed store (ServiceNow table or PostgreSQL) would be needed.

---

## Fusion Finding Types

All fusion findings have:
- `finding_type = FindingType.FUSION`
- `fusion_source = FusionSource.FUSION`
- Appropriate `avennorth_product` and `automation_potential` values

### 1. Shadow IT Detection

**Category**: `shadow_it`
**Severity**: Critical
**Dimension**: Completeness
**Detection**: Active hosts in Pathfinder data with no corresponding CMDB record.

**Logic**:
```
For each ci_sys_id in ConfidenceStore:
    if ci_sys_id NOT in cmdb_ci sys_ids
    AND traffic_state == "active":
        -> Shadow IT finding
```

**What it means**: Pathfinder sees network traffic from a host that does not exist in the CMDB. This is undocumented infrastructure -- invisible to change management, security scanning, and compliance auditing.

**Edge cases**:
- Pathfinder may report IPs that are NAT gateways, load balancers, or ephemeral cloud instances. These are valid Shadow IT detections but may inflate the count.
- Hosts with `traffic_state != "active"` are excluded -- idle hosts without CMDB records are less concerning.

**Remediation**: Create CMDB records. Pathfinder's auto-CI creation can resolve this automatically.

### 2. Ghost CI Detection

**Category**: `ghost_cis`
**Severity**: High
**Dimension**: Accuracy
**Detection**: CIs marked "Operational" in CMDB but Pathfinder says "deprecated" (no traffic).

**Logic**:
```
For each CI in cmdb_cis:
    if operational_status == "1" (Operational):
        pathfinder_record = store.records.get(ci.sys_id)
        if pathfinder_record AND pathfinder_record.traffic_state == "deprecated":
            -> Ghost CI finding
```

**What it means**: The CMDB says this CI is operational, but Pathfinder has observed that it shows no traffic. It was likely decommissioned without updating the CMDB record.

**Edge cases**:
- CIs that exist in CMDB but are NOT in Pathfinder's monitored scope are skipped (not flagged as ghosts, because we cannot make a determination).
- The `idle` traffic state is NOT flagged -- idle CIs may be legitimate (batch processing servers, DR standby systems).
- Only `deprecated` state triggers the finding, which requires extended observation of zero traffic by Pathfinder.

**Remediation**: Validate these CIs. Update status to Retired if confirmed decommissioned.

### 3. Behavioral Misclassification

**Category**: `behavioral_misclassification`
**Severity**: High
**Dimension**: Classification
**Detection**: Pathfinder's behavioral classification disagrees with CMDB class assignment.

**Logic**:
```
For each CI in cmdb_cis:
    pathfinder_record = store.records.get(ci.sys_id)
    if pathfinder_record AND pathfinder_record.behavioral_classification:
        bc = pathfinder_record.behavioral_classification
        if bc.suggested_class != ci.sys_class_name
        AND bc.classification_confidence > 75:
            -> Misclassification finding
```

**Confidence threshold**: 75%. Only high-confidence behavioral classifications trigger findings. Below 75%, the behavioral signal is not strong enough to override the CMDB record.

**What it means**: Pathfinder observed traffic patterns that suggest the CI should be a different class. For example, a host classified as `cmdb_ci_server` but serving HTTP traffic like an application server should be `cmdb_ci_app_server`.

**Edge cases**:
- Not all CIs in Pathfinder data will have `behavioral_classification` -- it requires enough traffic observation to make a determination.
- Multi-role servers (e.g., a server running both a database and a web server) may trigger false positives.

### 4. Unconfirmed Relationships

**Category**: `unconfirmed_relationships`
**Severity**: Medium
**Dimension**: Relationships
**Detection**: CMDB relationships that Pathfinder cannot confirm with observed traffic.

**Logic**:
```
For each record in ConfidenceStore:
    for each relationship_confirmation:
        if confirmed == false:
            unconfirmed_count += 1

if unconfirmed_count > 0:
    -> Unconfirmed relationships finding
```

**What it means**: A relationship exists in `cmdb_rel_ci` between two CIs, but Pathfinder has not observed network communication between them. The relationship may be stale (from a previous configuration) or incorrectly mapped.

**Edge cases**:
- Some relationships are non-network (e.g., "Managed by" relationships between a CI and a management server). These may not produce observable traffic.
- Relationships confirmed as `true` with low `confidence` values are still counted as confirmed.

### 5. Low Confidence Operational CIs

**Category**: `low_confidence_operational`
**Severity**: Medium
**Dimension**: Accuracy
**Detection**: CIs marked operational in CMDB but with Pathfinder confidence score below 30%.

**Logic**:
```
For each CI in cmdb_cis:
    if operational_status == "1":
        pathfinder_record = store.records.get(ci.sys_id)
        if pathfinder_record AND pathfinder_record.confidence_score < 30:
            -> Low confidence finding
```

**Confidence threshold**: 30%. Below this level, Pathfinder has insufficient data to make reliable determinations about the CI.

**What it means**: The CI is marked as operational, and Pathfinder is monitoring it, but does not have enough observation data to be confident about its state. This may indicate intermittent connectivity, recent deployment, or monitoring gaps.

---

## Integration Flow

```
Pathfinder Instance
    |
    | POST /api/webhooks/pathfinder (periodic feed)
    v
Bearing Webhook Handler
    |
    v
PathfinderProcessor.ingest_confidence_feed()
    |
    | Stores records in ConfidenceStore (in-memory singleton)
    v
ConfidenceStore.has_data == true
    |
    | (Next assessment run)
    v
AssessmentEngine.run_assessment()
    |
    | After dimension scorers complete:
    |   if confidence_store.has_data:
    |       fetch active CMDB CIs
    |       FusionFindingGenerator.generate(cmdb_cis)
    |       append fusion findings to all_findings
    |       assessment.has_pathfinder_data = true
    v
Assessment includes both standard and fusion findings
```

---

## Testing Fusion Findings Without Pathfinder

You do not need a real Pathfinder deployment to test fusion findings. The test suite demonstrates how:

### Approach 1: Direct ConfidenceStore Population

Create a `ConfidenceStore` instance and manually add `CIConfidenceRecord` objects:

```python
from bearing.fusion.pathfinder import ConfidenceStore
from bearing.api.schemas import CIConfidenceRecord, TrafficState, BehavioralClassification
from datetime import datetime, timezone

store = ConfidenceStore()
store.records["ci001"] = CIConfidenceRecord(
    ci_sys_id="ci001",
    ci_class="cmdb_ci_server",
    confidence_score=80,
    traffic_state=TrafficState.ACTIVE,
    last_observation=datetime.now(timezone.utc),
    observation_count=50,
    behavioral_classification=BehavioralClassification(
        suggested_class="cmdb_ci_app_server",
        classification_confidence=85,
        reasoning="Serves HTTP traffic",
    ),
)

generator = FusionFindingGenerator(store)
findings = generator.generate(cmdb_cis)
```

### Approach 2: Webhook Simulation

Send a POST request to the webhook endpoint with a crafted payload:

```bash
curl -X POST http://localhost:8080/api/webhooks/pathfinder \
  -H "Content-Type: application/json" \
  -H "X-Bearing-API-Key: your-api-key" \
  -d '{
    "schema_version": "1.0",
    "pathfinder_instance_id": "pf-test",
    "servicenow_instance_url": "https://test.service-now.com",
    "observation_window_hours": 24,
    "generated_at": "2026-03-31T12:00:00Z",
    "ci_confidence_records": [
      {
        "ci_sys_id": "unknown_host_001",
        "ci_class": "cmdb_ci_server",
        "confidence_score": 80,
        "traffic_state": "active",
        "last_observation": "2026-03-31T12:00:00Z",
        "observation_count": 50
      }
    ],
    "coverage_summary": {
      "total_monitored_hosts": 1,
      "active_cis": 1,
      "idle_cis": 0,
      "deprecated_cis": 0,
      "unknown_cis": 0
    }
  }'
```

Then trigger an assessment. The `unknown_host_001` record will produce a Shadow IT finding if it does not match any CMDB CI sys_id.

### Approach 3: Unit Tests

See `src/tests/test_fusion/test_findings.py` for examples of testing each fusion finding type independently. Each test creates a `ConfidenceStore`, populates it with specific records, and verifies the expected findings are generated.

---

## Contour Integration (Future)

The `ContourProcessor` and `ContourStore` are stub implementations for future Contour service model integration. Currently:

- The webhook endpoint (`POST /api/webhooks/contour`) accepts events and logs them.
- Events are stored in an in-memory list with `event_type`, `model_version`, `changed_services`, and `received_at`.
- No fusion findings are generated from Contour data yet.

Planned Contour fusion findings:
- CSDM model gaps identified by Contour's service mapping intelligence
- Service-CI association validation (Contour-mapped vs. CMDB-recorded)
- Service topology drift detection
