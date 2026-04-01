# Dimension Scorer Reference

**Internal Engineering Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## Overview

Bearing evaluates CMDB health across eight dimensions. Each dimension has a dedicated scorer class that inherits from `BaseDimensionScorer` and implements the `score()` method. Scorers query ServiceNow CMDB tables, run quality checks, compute a 0-100 score, and generate findings for detected issues.

### Scoring Mechanics

All scorers share the same scoring formula via `BaseDimensionScorer._build_score_response()`:

```
score = round((checks_passed / checks_total) * 100)
```

Where `checks_passed` and `checks_total` are counters maintained by each scorer during evaluation. The meaning of "a check" varies per dimension (e.g., one CI having a required field populated = one check passed).

### Weighted Composite

The overall health score is the weighted sum of all dimension scores:

```
overall_score = round(sum(dimension_score * weight for each dimension))
```

| Dimension | Weight | Source File |
|---|---|---|
| Completeness | 20% | `dimensions/completeness.py` |
| Accuracy | 15% | `dimensions/accuracy.py` |
| Currency | 15% | `dimensions/currency.py` |
| Relationships | 15% | `dimensions/relationships.py` |
| CSDM Compliance | 10% | `dimensions/csdm_compliance.py` |
| Classification | 10% | `dimensions/classification.py` |
| Orphan Analysis | 10% | `dimensions/orphan_analysis.py` |
| Duplicate Detection | 5% | `dimensions/duplicate_detection.py` |

Total weight: 100%

### Grade Mapping

| Score Range | Grade |
|---|---|
| 90-100 | A |
| 75-89 | B |
| 60-74 | C |
| 40-59 | D |
| 0-39 | F |

---

## 1. Completeness Scorer (20%)

**File**: `src/bearing/assessment/dimensions/completeness.py`
**Class**: `CompletenessScorer`

### Purpose

Measures what percentage of active CIs have required fields populated. A CI with missing owner, support group, or environment cannot be properly managed during incidents.

### ServiceNow Tables and Fields

| Table | Query | Fields |
|---|---|---|
| `cmdb_ci` | `operational_status=1^ORoperational_status=6` | `sys_id`, `name`, `sys_class_name`, `ip_address`, `owned_by`, `support_group`, `environment`, `operational_status`, `sys_updated_on`, `discovery_source` |

### Required Fields Checked

- `name`
- `sys_class_name`
- `ip_address`
- `owned_by`
- `support_group`
- `environment`

### Scoring Formula

```
checks_total = number_of_CIs * 6  (one check per required field per CI)
checks_passed = checks_total - total_missing_field_values
score = round((checks_passed / checks_total) * 100)
```

### Findings Generated

For each required field, if any CIs are missing that field, a finding is generated:

| Category | Severity Thresholds | Title Pattern |
|---|---|---|
| `missing_{field_name}` | >50% missing = Critical, >25% = High, >10% = Medium, else Low | "{count} CIs missing '{field}' field ({pct}%)" |

**Finding details**:
- Type: `GAP`
- Effort estimate: `affected_count * 0.25 hours`
- Remediation: "Populate the '{field}' field on affected CIs via discovery tool or manual update."

### Example

1000 active CIs, 600 missing `owned_by`:
- checks_total = 6000
- 600 missing for `owned_by` = check fails for those
- Finding: severity=CRITICAL (60% > 50%), category=`missing_owned_by`
- Effort: 600 * 0.25 = 150 hours

---

## 2. Accuracy Scorer (15%)

**File**: `src/bearing/assessment/dimensions/accuracy.py`
**Class**: `AccuracyScorer`

### Purpose

Measures whether CI data matches observed reality. Without discovery validation, CMDB records drift from actual infrastructure state. Checks for discovery validation, recent discovery timestamps, and generic/placeholder names.

### ServiceNow Tables and Fields

| Table | Query | Fields |
|---|---|---|
| `cmdb_ci` | `operational_status=1^ORoperational_status=6` | `sys_id`, `name`, `sys_class_name`, `ip_address`, `discovery_source`, `last_discovered` |

### Checks (3 per CI)

1. **Discovery source present** -- Does the CI have a `discovery_source` value?
2. **Recently discovered** -- Does the CI have a `last_discovered` timestamp? (Presence check only, does not enforce recency.)
3. **Non-generic name** -- Is the CI name meaningful (not a placeholder)?

### Generic Name Detection

Names are considered generic if they start with or exactly match:
`unknown`, `new ci`, `test`, `temp`, `placeholder`, `unnamed`, `default`, `n/a`, `none`, `tbd`

Case-insensitive matching with whitespace trimming.

### Scoring Formula

```
checks_total = number_of_CIs * 3
checks_passed = has_discovery_count + recently_discovered_count + non_generic_name_count
score = round((checks_passed / checks_total) * 100)
```

### Findings Generated

| Category | Condition | Severity Thresholds |
|---|---|---|
| `no_discovery_validation` | CIs with empty `discovery_source` | >50% = Critical, >25% = High, else Medium |
| `generic_ci_names` | CIs with placeholder names | Always Medium |

**Remediation for no discovery**: "Deploy Pathfinder or ServiceNow Discovery to validate CI data automatically."

---

## 3. Currency Scorer (15%)

**File**: `src/bearing/assessment/dimensions/currency.py`
**Class**: `CurrencyScorer`

### Purpose

Measures data freshness. CIs not updated within a reasonable timeframe are likely inaccurate. The scorer buckets CIs by staleness and flags aging records.

### ServiceNow Tables and Fields

| Table | Query | Fields |
|---|---|---|
| `cmdb_ci` | `operational_status=1^ORoperational_status=6` | `sys_id`, `name`, `sys_class_name`, `sys_updated_on`, `last_discovered`, `operational_status` |

### Staleness Thresholds

| Bucket | Days Since Last Update | Severity |
|---|---|---|
| Current | 0-29 | -- |
| Aging | 30-59 | Low |
| Stale | 60-89 | Medium |
| Very Stale | 90-179 | High |
| Critical | 180+ or unparseable | Critical |

CIs with empty or unparseable `sys_updated_on` are placed in the Critical bucket.

### Date Parsing

Expects ISO 8601 format. Handles both `2026-03-15T10:00:00Z` and `2026-03-15 10:00:00` (space-separated) formats. Assumes UTC when timezone is absent.

### Scoring Formula

```
checks_total = number_of_CIs
checks_passed = current_count + aging_count  (CIs under 60 days old)
score = round((checks_passed / checks_total) * 100)
```

### Findings Generated

| Category | Condition | Severity |
|---|---|---|
| `stale_ci_180_plus` | 180+ days since update | Critical |
| `stale_ci_90_180` | 90-180 days since update | High |
| `stale_ci_60_90` | 60-90 days since update | Medium |

**Remediation for 90-180 days**: "Enable automated discovery to keep CI data current. Deploy Pathfinder for continuous observation."

---

## 4. Relationships Scorer (15%)

**File**: `src/bearing/assessment/dimensions/relationships.py`
**Class**: `RelationshipsScorer`

### Purpose

Measures service dependency mapping coverage. CIs without relationships are invisible to service impact analysis -- when they fail, there is no way to trace the impact to business services.

### ServiceNow Tables and Fields

| Table | Query | Fields |
|---|---|---|
| `cmdb_ci` | `operational_status=1^ORoperational_status=6` | `sys_id` |
| `cmdb_rel_ci` | (all records) | `sys_id`, `parent`, `child`, `type` |

### Processing Logic

1. Fetch all active CI `sys_id` values into a set.
2. Fetch all relationships from `cmdb_rel_ci`.
3. For each relationship, extract parent and child sys_ids. Handles both reference object format (`{"value": "..."}`) and string format.
4. Build a set of all CIs that appear as a parent or child in any relationship.
5. CIs not in the connected set are "without relationships."

### Scoring Formula

```
checks_total = number_of_active_CIs
checks_passed = number_of_CIs_with_at_least_one_relationship
score = round((checks_passed / checks_total) * 100)
```

### Findings Generated

| Category | Condition | Severity Thresholds |
|---|---|---|
| `no_relationships` | CIs with zero relationships | >50% = Critical, >25% = High, else Medium |

**Remediation**: "Deploy Pathfinder to automatically discover service dependencies through network traffic observation."

### Performance Note

This scorer fetches ALL relationships from `cmdb_rel_ci` (no query filter). For large instances, this can be a significant data volume. The auto-pagination in `get_all_records()` handles this with batched requests and rate limiting.

---

## 5. CSDM Compliance Scorer (10%)

**File**: `src/bearing/assessment/dimensions/csdm_compliance.py`
**Class**: `CSDMComplianceScorer`

### Purpose

Measures adoption of the ServiceNow Common Service Data Model (CSDM). CSDM defines four layers of service hierarchy. Organizations without CSDM adoption cannot use service-oriented ITSM capabilities.

### ServiceNow Tables and Fields

| Table | Query | What It Represents |
|---|---|---|
| `cmdb_ci_service` | `operational_status=1` | Business Services (CSDM Layer 1) |
| `cmdb_ci_business_app` | `operational_status=1` | Business Applications (CSDM Layer 2) |
| `cmdb_ci_service_auto` | `operational_status=1` | Technical Services (CSDM Layer 3) |
| `cmdb_ci_server` | `operational_status=1^ORoperational_status=6` | Infrastructure (CSDM Layer 4) |
| `svc_ci_assoc` | (all records) | Service-CI associations (mapping) |

### Processing Logic

1. For each CSDM layer, count records using `get_record_count()`.
2. Track how many layers have at least one record.
3. If infrastructure CIs exist, check `svc_ci_assoc` to determine what percentage of infrastructure maps to a service.
4. A mapping ratio above 50% counts as one additional check passed.

### Scoring Formula

```
checks_total = 4 (CSDM layers) + 1 (if infrastructure exists)
checks_passed = populated_layer_count + (1 if mapping_ratio > 0.5)
score = round((checks_passed / checks_total) * 100)
```

### Findings Generated

| Category | Condition | Severity |
|---|---|---|
| `csdm_missing_business_service` | Business Service layer has 0 records | High |
| `csdm_missing_{layer}` | Any other layer has 0 records | Medium |
| `csdm_unmapped_infrastructure` | <50% of infrastructure mapped to services | High |

**Remediation**: "Deploy Contour for automated CSDM mapping" or "Populate the {layer} layer."

### Maturity Impact

The CSDM score heavily influences maturity level determination. The `MaturityScorer` estimates populated CSDM layers from this dimension's score:

| CSDM Score | Estimated Layers |
|---|---|
| 90+ | 4 |
| 65-89 | 3 |
| 40-64 | 2 |
| 15-39 | 1 |
| 0-14 | 0 |

---

## 6. Classification Scorer (10%)

**File**: `src/bearing/assessment/dimensions/classification.py`
**Class**: `ClassificationScorer`

### Purpose

Measures whether CIs are assigned to the correct class in the ServiceNow class hierarchy. CIs in generic base classes (like `cmdb_ci`) lack class-specific attributes and cannot be properly managed.

### ServiceNow Tables and Fields

| Table | Query | Fields |
|---|---|---|
| `cmdb_ci` | `operational_status=1^ORoperational_status=6` | `sys_id`, `name`, `sys_class_name`, `category`, `subcategory`, `operational_status` |

### Generic Classes (Flagged)

```python
GENERIC_CLASSES = {
    "cmdb_ci",          # Base class -- always wrong
    "cmdb_ci_computer",  # Should be server/workstation/etc.
    "cmdb_ci_hardware",  # Should be specific hardware type
    "cmdb_ci_server",    # Should be linux/win/unix
}
```

### Expected Specific Subclasses

For servers: `cmdb_ci_linux_server`, `cmdb_ci_win_server`, `cmdb_ci_unix_server`, `cmdb_ci_esx_server`, `cmdb_ci_solaris_server`, `cmdb_ci_aix_server`, `cmdb_ci_hpux_server`.

### Scoring Formula

```
checks_total = number_of_CIs
checks_passed = number_of_CIs NOT in GENERIC_CLASSES
score = round((checks_passed / checks_total) * 100)
```

### Findings Generated

| Category | Condition | Severity |
|---|---|---|
| `base_class_ci` | CIs classified as `cmdb_ci` | >10% = High, else Medium |
| `generic_server_class` | CIs classified as `cmdb_ci_server` instead of OS-specific | Medium |

**Remediation**: "Reclassify CIs to their correct subclass. Deploy Pathfinder for behavioral classification that suggests correct CI classes."

---

## 7. Orphan Analysis Scorer (10%)

**File**: `src/bearing/assessment/dimensions/orphan_analysis.py`
**Class**: `OrphanAnalysisScorer`

### Purpose

Identifies CIs with zero relationships in `cmdb_rel_ci`. Orphaned CIs are invisible to service impact analysis -- an incident on an orphan cannot be correlated to any business service.

### ServiceNow Tables and Fields

| Table | Query | Fields |
|---|---|---|
| `cmdb_ci` | `operational_status=1^ORoperational_status=6` | `sys_id`, `sys_class_name` |
| `cmdb_rel_ci` | (all records) | `parent`, `child` |

### Processing Logic

1. Fetch all active CIs and build a set of sys_ids.
2. Fetch all relationships and build a set of "connected" sys_ids (union of all parent and child values).
3. Orphans = active CIs minus connected CIs.
4. Categorize orphans by `sys_class_name` for the finding description.

### Scoring Formula

```
checks_total = number_of_active_CIs
checks_passed = number_of_CIs - orphan_count
score = round((checks_passed / checks_total) * 100)
```

### Findings Generated

| Category | Condition | Severity Thresholds |
|---|---|---|
| `orphaned_cis` | CIs with zero relationships | >40% = Critical, >20% = High, else Medium |

Finding description includes top 5 orphan classes by count.

**Remediation**: "Deploy Pathfinder to automatically discover relationships through network traffic observation."

### Data Overlap with Relationships Scorer

The Orphan Analysis scorer queries the same tables as the Relationships scorer. Both fetch `cmdb_ci` and `cmdb_rel_ci`. The difference is scope:
- **Relationships** measures the percentage of CIs with *any* relationship.
- **Orphans** specifically identifies and categorizes the CIs that have *zero* relationships.

In practice, the two scorers compute similar data. A future optimization could share the fetched data between them.

---

## 8. Duplicate Detection Scorer (5%)

**File**: `src/bearing/assessment/dimensions/duplicate_detection.py`
**Class**: `DuplicateDetectionScorer`

### Purpose

Identifies potential duplicate CIs based on IP address overlap, serial number matches, and exact name+class combinations. Duplicates inflate CI counts, corrupt reporting, and create confusion during incident response.

### ServiceNow Tables and Fields

| Table | Query | Fields |
|---|---|---|
| `cmdb_ci` | `operational_status=1^ORoperational_status=6` | `sys_id`, `name`, `ip_address`, `serial_number`, `sys_class_name` |

### Detection Methods

**1. IP Address Duplicates**
- Group CIs by `ip_address`.
- Exclude empty IPs and `0.0.0.0`.
- Any IP assigned to more than one CI is flagged.
- Severity: High.

**2. Serial Number Duplicates**
- Group CIs by `serial_number`.
- Exclude empty, `n/a`, `none`, `unknown` values (case-insensitive).
- Any serial number on more than one CI is flagged.
- Severity: High.

**3. Name+Class Duplicates**
- Group CIs by lowercase `(name, sys_class_name)` tuple.
- Any combination appearing more than once is flagged.
- Severity: Medium.

### Scoring Formula

```
duplicate_count = ip_dup_ci_count + serial_dup_ci_count + name_dup_ci_count
unique_cis = total_CIs - min(duplicate_count, total_CIs)
checks_total = total_CIs
checks_passed = unique_cis
score = round((checks_passed / checks_total) * 100)
```

Note: A single CI can appear in multiple duplicate categories, so `duplicate_count` can exceed the actual number of duplicate CIs. The `min()` prevents the score from going negative.

### Findings Generated

| Category | Condition | Severity |
|---|---|---|
| `duplicate_ip_address` | Multiple CIs share same IP | High |
| `duplicate_serial_number` | Multiple CIs share same serial | High |
| `duplicate_name_class` | Multiple CIs share same name+class | Medium |

---

## Technical Debt Cost Formulas

Each dimension has a specific cost formula in `TechnicalDebtCalculator`:

| Dimension | Formula | Default Values |
|---|---|---|
| Completeness | `count * avg_hours_to_map * hourly_rate` | count * 2.0h * $150 |
| Accuracy | `count * mttr_hours * hourly_rate * incidents/yr` | count * 1.5h * $150 * 12 |
| Currency | `count * validation_hours * hourly_rate` | count * 1.0h * $150 |
| Relationships | `count * mttr_hours * hourly_rate * incidents/yr` | count * 1.5h * $150 * 12 |
| CSDM | `count * mapping_hours * hourly_rate` | count * 3.0h * $150 |
| Classification | `count * map_hours * hourly_rate` | count * 2.0h * $150 |
| Orphans | `count * risk_exposure_per_ci_per_year` | count * $5,000 |
| Duplicates | `count * resolution_hours * hourly_rate` | count * 1.5h * $150 |

All parameters are configurable via `DebtParameters`. Default hourly rate is $150.

---

## Adding a New Dimension Scorer

1. Create `src/bearing/assessment/dimensions/your_dimension.py`.
2. Inherit from `BaseDimensionScorer`.
3. Set `dimension` to a new `Dimension` enum value (add to `schemas.py`).
4. Set `weight` (ensure all weights still sum to 1.0 -- adjust existing weights).
5. Implement `score()`: query tables, run checks, call `_add_finding()`, return `_build_score_response()`.
6. Add the scorer to the `scorers` list in `AssessmentEngine.run_assessment()`.
7. Add a cost formula entry in `TechnicalDebtCalculator._cost_for_finding()`.
8. Add dimension-specific recommendation logic in `RecommendationEngine`.
9. Write tests with mocked `ServiceNowClient`.
