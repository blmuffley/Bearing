# Assessment Guide

## Understanding Health Scores
- **80-100 (Excellent)**: Minor improvements recommended
- **60-79 (Good)**: Several areas for improvement identified
- **40-59 (Fair)**: Substantial technical debt that should be addressed
- **0-39 (Critical)**: Significant operational risk requiring immediate attention

## Assessment Modules

### Core Platform
Analyzes scripting practices, update set hygiene, and security configurations.
- Hard-coded references that break during migrations
- Duplicate or conflicting business rules
- Client-side scripts performing server operations
- Synchronous calls that degrade performance
- Production change control violations
- Security ACL issues
- Elevated role assignments

### CMDB
Evaluates Configuration Management Database health.
- Stale configuration items not updated by discovery
- Orphaned CIs with no relationships
- Missing discovery sources
- Duplicate CI records

### ITSM
Reviews IT Service Management process health.
- Unassigned incident backlogs
- Miscategorized incidents
- Aged open incidents
- Incident quality (reopens)
- Change management compliance
- Emergency change ratios

### ITAM
Assesses IT Asset Management data quality.
- Hardware assets not linked to CMDB CIs
- Assets with expired warranties still in use

## Finding Severity Levels

| Severity | Description | Recommended Timeline |
|----------|-------------|---------------------|
| Critical | Immediate operational risk | 0-30 days |
| High | Significant impact, needs near-term attention | 30-60 days |
| Medium | Should be addressed in planning cycle | 60-120 days |
| Low | Scheduled maintenance item | Next planning cycle |

## Effort Estimates

Each finding includes a t-shirt size effort estimate:

| Size | Typical Hours | Description |
|------|--------------|-------------|
| XS | 1-2 hours | Quick configuration change |
| S | 2-4 hours | Simple remediation |
| M | 4-16 hours | Moderate effort, may require testing |
| L | 16-40 hours | Significant effort, multi-day task |
| XL | 40+ hours | Major initiative or redesign |

## Pathfinder Enhancement
When Pathfinder behavioral data is available, Bearing produces additional insights:
- CIs marked active in CMDB but showing no traffic
- Retired CIs still receiving production traffic
- Misclassified CIs based on observed behavior
- Undocumented infrastructure (Shadow IT)
- Unconfirmed CMDB relationships
- Four-zone coverage analysis
