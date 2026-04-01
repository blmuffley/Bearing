# Bearing Assessment Guide

## Preparing For and Running a CMDB Health Assessment

This guide walks you through what to expect before, during, and after a Bearing assessment. It covers prerequisites, what data Bearing accesses, how long the process takes, and how to interpret your results.

---

## Before the Assessment

### ServiceNow Version Requirements

Bearing supports ServiceNow **Utah and later** releases (Utah, Vancouver, Washington DC, Xanadu, and subsequent releases). If your instance is running an earlier version, contact your Avennorth representative to discuss options.

### Service Account Setup

Bearing requires a dedicated service account with **read-only access** to CMDB and related platform tables. This account should be configured as follows:

1. **Create a new ServiceNow user** specifically for Bearing assessments. Do not reuse an existing user account.

2. **Assign the following roles:**
   - `itil` (read access to ITSM tables)
   - `asset` (read access to ITAM tables)
   - `cmdb_read` (read access to CMDB tables)
   - `x_avnth_bearing.user` (Bearing scoped application role, if the scoped app is installed)

3. **Do not assign admin or security_admin roles.** Bearing does not need and should not have elevated privileges.

4. **Enable the account** and set a strong password. If using OAuth, configure the OAuth application profile (see Authentication section below).

### Network Access

If your ServiceNow instance is not publicly accessible (for example, if it sits behind a VPN or IP allowlist), ensure that Bearing's assessment infrastructure can reach your instance on HTTPS (port 443). Your Avennorth representative will provide the IP addresses to allowlist.

### Scoped Application (Optional)

Bearing can operate in two modes:

- **API-only mode** -- Bearing connects to your instance via the standard ServiceNow REST API using the service account described above. No installation on your instance is required.
- **Scoped app mode** -- The `x_avnth_bearing` scoped application is installed on your instance. This provides a dedicated application scope, custom tables for storing assessment metadata on-instance, and tighter integration with ServiceNow's security model.

The scoped app is optional. API-only mode delivers the same assessment quality.

---

## Authentication

Bearing supports two authentication methods:

### OAuth 2.0 (Recommended)

OAuth is the preferred method. It avoids storing passwords and supports token refresh without manual intervention.

1. In your ServiceNow instance, navigate to **System OAuth > Application Registry**
2. Create a new OAuth application with the following settings:
   - **Name:** Avennorth Bearing
   - **Client ID:** (auto-generated)
   - **Client Secret:** (auto-generated -- save this securely)
   - **Redirect URL:** Provided by your Avennorth representative
   - **Token Lifespan:** 1800 seconds (30 minutes) or longer
   - **Refresh Token Lifespan:** 8640000 seconds (100 days) or longer
3. Share the Client ID and Client Secret with your Avennorth representative through a secure channel

### Basic Authentication

If OAuth is not available, Bearing can authenticate using the service account username and password. Basic auth credentials are encrypted at rest and in transit.

---

## What Bearing Reads

Bearing queries the following ServiceNow tables during an assessment. All access is **read-only**. Bearing never modifies, creates, or deletes records in these tables.

### CMDB Tables

| Table | Purpose |
|-------|---------|
| `cmdb_ci` | Base CI table -- all configuration items |
| `cmdb_ci_server` | Server CIs |
| `cmdb_ci_computer` | Computer CIs |
| `cmdb_ci_database` | Database CIs |
| `cmdb_ci_appl` | Application CIs |
| `cmdb_ci_service` | Business Service CIs |
| `cmdb_ci_service_auto` | Application Service CIs |
| `cmdb_ci_service_technical` | Technical Service CIs |
| `cmdb_ci_business_app` | Business Application CIs |
| `cmdb_ci_netgear` | Network device CIs |
| `cmdb_ci_hardware` | Hardware CIs |
| `cmdb_ci_cluster` | Cluster CIs |
| `cmdb_ci_lb` | Load balancer CIs |
| `cmdb_rel_ci` | CI relationships |
| `cmdb_rel_type` | Relationship type definitions |
| `cmn_location` | Location records |
| `svc_ci_assoc` | Service-CI associations |

### Discovery and Data Quality Tables

| Table | Purpose |
|-------|---------|
| `discovery_status` | Discovery run results and status |
| `sys_audit` | Audit trail for CI update frequency analysis |

### ITSM Tables (for cross-reference validation)

| Table | Purpose |
|-------|---------|
| `incident` | Incident records referencing CIs |
| `change_request` | Change records referencing CIs |
| `task_sla` | SLA records tied to CI-based services |

### Platform Configuration Tables

| Table | Purpose |
|-------|---------|
| `sys_dictionary` | Table and field definitions |
| `sys_db_object` | Table structure definitions |
| `sys_scope` | Application scope definitions |
| `sys_properties` | System property values |

Bearing reads only the fields necessary for assessment. It does not read sensitive fields such as passwords, credentials, or personally identifiable information (PII). Query filters are applied to minimize data transfer.

---

## What Bearing Writes

**Bearing writes nothing to your standard ServiceNow tables.**

If the `x_avnth_bearing` scoped application is installed, Bearing writes assessment results to its own scoped tables only:

| Table | Purpose |
|-------|---------|
| `x_avnth_bearing_assessment` | Assessment run metadata |
| `x_avnth_bearing_finding` | Individual findings |
| `x_avnth_bearing_score` | Dimension and composite scores |

These tables exist entirely within the Bearing application scope and do not affect any other ServiceNow functionality.

In API-only mode, all assessment data is stored in Bearing's own infrastructure. Nothing is written to your ServiceNow instance.

---

## During the Assessment

### What Happens

1. **Connection test** -- Bearing verifies it can authenticate and reach the required tables
2. **Data collection** -- Bearing queries each table using paginated REST API calls, reading up to 10,000 records per request
3. **Analysis** -- Collected data is evaluated against Bearing's rule library across all eight dimensions
4. **Scoring** -- Findings are scored individually and aggregated into dimension scores, an overall health score, and a maturity level
5. **Report generation** -- Results are compiled into the interactive dashboard and downloadable reports

### How Long It Takes

Assessment duration depends on instance size:

| Instance Size | CI Count | Typical Duration |
|---------------|----------|-----------------|
| Small | Under 5,000 CIs | 15-30 minutes |
| Medium | 5,000-25,000 CIs | 30-90 minutes |
| Large | 25,000-100,000 CIs | 1-3 hours |
| Very Large | 100,000+ CIs | 3-6 hours |

These times reflect the full scan cycle from connection to completed reports. The assessment runs as a background process -- no one needs to watch it.

### Performance Impact

Bearing is designed to have minimal impact on your ServiceNow instance:

- All queries use standard REST API calls with pagination
- Queries are throttled to avoid consuming excessive API capacity
- No bulk operations, imports, or transform maps are executed
- Assessments can be scheduled during off-peak hours if preferred

Most customers report no noticeable performance impact during assessments.

---

## After the Assessment

### Reviewing Your Results

Once the assessment completes, you can access results through:

**The Interactive Dashboard**
- Overall health score with trend tracking
- Dimension scores with drill-down details
- Maturity level with advancement criteria
- Technical debt summary with dollar estimates
- Findings explorer with filtering by dimension, severity, and effort

**Downloadable Reports**
- CMDB Health Scorecard (executive summary)
- Technical Debt Summary (itemized breakdown)
- Maturity Model Report (current level and roadmap)
- Recommendation Report (prioritized actions)
- Before/After Comparison (available after second assessment)

### Understanding Your Scores

**Health Score (0-100)**
- **90-100:** Excellent -- your CMDB is well-maintained and trustworthy
- **75-89:** Good -- solid foundation with targeted improvements needed
- **55-74:** Fair -- significant gaps that affect downstream processes
- **30-54:** Poor -- major remediation needed before the CMDB can be relied upon
- **0-29:** Critical -- the CMDB is not usable for its intended purpose

**Severity Levels**
- **Critical:** Findings that actively undermine CMDB trustworthiness or block key processes
- **High:** Significant quality gaps that degrade the value of CMDB data
- **Medium:** Issues that reduce data quality but do not block operations
- **Low:** Minor improvements that would enhance overall quality

### What to Do Next

1. **Review critical findings first.** These are the issues most likely to cause operational problems today.
2. **Identify quick wins.** Findings marked as low effort with high severity represent the fastest path to score improvement.
3. **Plan remediation phases.** Use the recommendation report to build a phased improvement plan.
4. **Schedule a follow-up assessment.** Run Bearing again after remediation to measure progress and generate a Before/After comparison.

---

## Continuous Assessment

Bearing supports recurring assessments for organizations that want ongoing CMDB health monitoring. With continuous assessment:

- Assessments run on a schedule (weekly, biweekly, or monthly)
- Health score trends are tracked over time
- Alerts notify your team when scores drop below a threshold
- Before/After comparisons show improvement across each cycle

Continuous assessment turns CMDB health from a point-in-time snapshot into an operational metric your team can manage proactively.

---

## Questions?

For questions about assessment setup, results interpretation, or continuous monitoring, contact your Avennorth representative or email support@avennorth.com.
