# Bearing — Pathfinder Integration Specification

## Overview

When Pathfinder is deployed alongside Bearing, it publishes a confidence feed via webhook. Bearing consumes this feed to produce **fusion findings** — insights only detectable by comparing CMDB records with live behavioral observation from Pathfinder's eBPF/ETW agents.

## Constraint

Bearing MUST work without Pathfinder. The Pathfinder integration is purely additive. If no confidence feed is received, Bearing operates on CMDB data alone. Fusion findings simply stop being generated.

## Confidence Feed Webhook

**Endpoint:** `POST /api/webhooks/pathfinder`
**Authentication:** `X-Bearing-API-Key` header

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
      "ci_sys_id": "abc123...",
      "ci_class": "cmdb_ci_app_server",
      "confidence_score": 90,
      "traffic_state": "active",
      "last_observation": "2026-03-31T11:45:00Z",
      "observation_count": 1247,
      "communication_partners": [...],
      "relationship_confirmations": [...],
      "behavioral_classification": {
        "suggested_class": "cmdb_ci_app_server",
        "classification_confidence": 80,
        "reasoning": "Receiving HTTP/HTTPS traffic"
      }
    }
  ],
  "coverage_summary": {
    "total_monitored_hosts": 1247,
    "active_cis": 1100,
    "idle_cis": 89,
    "deprecated_cis": 34,
    "unknown_cis": 24,
    "monitored_subnets": ["10.0.1.0/24"],
    "unmonitored_subnets_detected": ["10.0.5.0/24"]
  }
}
```

### Traffic States

| State | Meaning |
|-------|---------|
| `active` | Meaningful traffic in current observation window |
| `idle` | CI is reachable but minimal/no application traffic |
| `deprecated` | Was active previously, zero traffic for 7+ days |
| `unknown` | Insufficient data to classify |

## Fusion Finding Types

| Finding | Severity | Detection Logic |
|---------|----------|----------------|
| **Shadow IT** | Critical | CI in Pathfinder records with `active` traffic but NOT in CMDB sys_ids |
| **Ghost CIs** | High | CMDB operational_status=1 (Operational) but Pathfinder traffic_state=`deprecated` |
| **Misclassified CIs** | High | Pathfinder behavioral_classification.suggested_class ≠ CMDB sys_class_name AND classification_confidence > 75% |
| **Unconfirmed Relationships** | Medium | CMDB relationship exists but relationship_confirmation.confirmed = false |
| **Confidence Gaps** | Medium | CMDB operational_status=1 but Pathfinder confidence_score < 30 |

## Processing Flow

1. Pathfinder Gateway publishes confidence feed to Bearing webhook
2. Bearing validates API key and schema
3. CI confidence records are stored in the confidence store (keyed by ci_sys_id)
4. Coverage summary metadata is updated
5. During the next assessment run, the engine checks `confidence_store.has_data`
6. If data exists, `FusionFindingGenerator.generate()` is called with CMDB CIs
7. Fusion findings are added to the assessment's finding list
8. `assessment.has_pathfinder_data` is set to `true`

## Data Lifecycle

- Confidence records are overwritten on each feed ingestion (latest observation wins)
- Records persist in memory for the application lifecycle
- No historical confidence data is retained — only current state matters
- If the feed stops arriving, existing data remains until application restart
