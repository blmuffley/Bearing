# Bearing — CMDB Maturity Model

## Five-Level Model

| Level | Name | Health Score | Key Criteria |
|-------|------|-------------|-------------|
| 1 | **Ad-hoc** | < 30 | Manual CI entry, no discovery tools, no CSDM, spreadsheet-based tracking |
| 2 | **Managed** | 30-54 | Some discovery running, basic CI population, some relationships mapped |
| 3 | **Defined** | 55-74 | CSDM partially adopted (2+ layers), automated discovery covering 60%+ of estate |
| 4 | **Measured** | 75-89 | Confidence scores on CIs, health monitoring active, automated governance (dedup, stale detection), 80%+ coverage |
| 5 | **Optimized** | 90+ | Full CSDM adoption (all 4 layers), autonomous CMDB operations (AI-driven remediation), continuous assessment |

## Determination Algorithm

```python
def determine_maturity_level(overall_score, dimension_scores, findings):
    csdm_layers = estimate_csdm_layers(csdm_score)
    has_discovery = accuracy_score > 30
    coverage_pct = accuracy_score  # proxy
    has_governance = overall_score >= 75 and critical_high_findings <= 5
    has_autonomous = overall_score >= 90 and has_governance

    if overall_score >= 90 and csdm_layers >= 4 and has_autonomous:
        return 5, "Optimized"
    elif overall_score >= 75 and has_governance and coverage_pct >= 80:
        return 4, "Measured"
    elif overall_score >= 55 and csdm_layers >= 2 and coverage_pct >= 60:
        return 3, "Defined"
    elif overall_score >= 30 and has_discovery:
        return 2, "Managed"
    else:
        return 1, "Ad-hoc"
```

## CSDM Layer Estimation

The CSDM compliance score maps to populated layers:

| CSDM Score | Estimated Layers |
|-----------|-----------------|
| 90+ | 4 (full adoption) |
| 65-89 | 3 |
| 40-64 | 2 |
| 15-39 | 1 |
| < 15 | 0 |

## Level Progression Roadmap

### Level 1 → 2: Deploy Discovery
- Implement ServiceNow Discovery or deploy Pathfinder
- Automate CI population for 30%+ of infrastructure
- Begin mapping key service dependencies

### Level 2 → 3: Adopt CSDM
- Populate at least 2 CSDM layers (Business Service + Infrastructure)
- Achieve 60%+ automated discovery coverage
- Map application-to-infrastructure dependencies

### Level 3 → 4: Implement Governance
- Deploy Pathfinder for continuous CI confidence scoring
- Implement automated duplicate detection and stale CI management
- Achieve 80%+ discovery coverage
- Enable continuous health monitoring with degradation alerts

### Level 4 → 5: Autonomous Operations
- Full CSDM adoption (all 4 layers via Contour)
- Deploy CMDB Ops agents for autonomous remediation
- Enable continuous Bearing assessments on schedule
- Achieve 90+ health score consistently

## Avennorth Product Mapping

| Level Transition | Enabling Product |
|-----------------|-----------------|
| 1 → 2 | **Pathfinder** (automated discovery) |
| 2 → 3 | **Contour** (CSDM service modeling) |
| 3 → 4 | **Pathfinder** (confidence scoring, governance automation) |
| 4 → 5 | **Pathfinder + Contour** (autonomous CMDB ops) |

This is the core sales motion: Bearing reveals the gap, Pathfinder and Contour close it.
