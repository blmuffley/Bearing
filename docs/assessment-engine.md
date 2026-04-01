# Bearing — Assessment Engine Specification

## Overview

The assessment engine orchestrates CMDB health evaluation across eight dimensions. Each dimension produces a 0-100 score weighted into an overall composite. The engine also generates findings, calculates technical debt, determines maturity level, and produces recommendations.

## Eight Dimensions

| Dimension | Weight | Scorer Class | What It Measures |
|-----------|--------|-------------|-----------------|
| Completeness | 20% | `CompletenessScorer` | Required field population: name, class, IP, owner, support group, environment |
| Accuracy | 15% | `AccuracyScorer` | Discovery validation, internal consistency, generic name detection |
| Currency | 15% | `CurrencyScorer` | Data freshness — staleness thresholds at 30/60/90/180 days |
| Relationships | 15% | `RelationshipsScorer` | Service dependency coverage — CIs with at least one relationship |
| CSDM Compliance | 10% | `CSDMComplianceScorer` | CSDM layer population (Business Service, Business App, Technical Service, Infrastructure) and infrastructure-to-service mapping |
| Classification | 10% | `ClassificationScorer` | CI class specificity — detection of generic cmdb_ci usage |
| Orphan Analysis | 10% | `OrphanAnalysisScorer` | CIs with zero relationships — invisible to service impact analysis |
| Duplicate Detection | 5% | `DuplicateDetectionScorer` | IP address, serial number, and name+class overlap detection |

## Scoring Algorithm

```python
# Per-dimension
dimension_score = (checks_passed / checks_total) * 100

# Overall composite
overall_score = sum(dimension.score * dimension.weight for dimension in dimensions)

# Grade mapping
# A: 90-100, B: 75-89, C: 60-74, D: 40-59, F: 0-39
```

## Assessment Lifecycle

```
PENDING → RUNNING → COMPLETED
                  → FAILED
```

1. `create_assessment()` — creates record in PENDING state
2. `run_assessment()` — background task transitions through RUNNING to COMPLETED/FAILED
3. Results stored in-memory and written to ServiceNow `x_avnth_bearing_*` tables

## Dimension Scorer Interface

All scorers inherit from `BaseDimensionScorer`:

```python
class BaseDimensionScorer(ABC):
    dimension: Dimension
    weight: float

    def score(self) -> DimensionScoreResponse: ...
    def get_findings(self) -> list[FindingResponse]: ...
```

Each scorer:
- Queries ServiceNow CMDB tables via `self.sn_client`
- Evaluates quality checks against the returned data
- Tracks `checks_passed` / `checks_total` for score calculation
- Generates `FindingResponse` objects for each detected issue

## Finding Severity Thresholds

Findings are generated with severity based on the percentage of CIs affected:

| Percentage Affected | Severity |
|--------------------|----------|
| > 50% | Critical |
| > 25% | High |
| > 10% | Medium |
| ≤ 10% | Low |

## Fusion Findings

When Pathfinder confidence data is available, the engine generates additional fusion-only findings:

- **Shadow IT** — active hosts with no CMDB record
- **Ghost CIs** — CMDB records with no observed traffic
- **Misclassification** — behavioral class differs from CMDB class
- **Unconfirmed Relationships** — CMDB relationships with no traffic backing
- **Confidence Gaps** — operational CIs with low Pathfinder confidence

## Technical Debt Calculation

Each finding maps to a cost formula based on its dimension:

| Dimension | Formula |
|-----------|---------|
| Completeness | `count × $2.0/hr × $150/hr` |
| Accuracy | `count × $1.5/hr × $150/hr × 12 incidents/yr` |
| Currency | `count × $1.0/hr × $150/hr` |
| Relationships | `count × $1.5/hr × $150/hr × 12 incidents/yr` |
| CSDM | `count × $3.0/hr × $150/hr` |
| Classification | `count × $2.0/hr × $150/hr` |
| Orphans | `count × $5,000/CI/yr` |
| Duplicates | `count × $1.5/hr × $150/hr` |

All parameters are customer-configurable via `DebtParameters`.
