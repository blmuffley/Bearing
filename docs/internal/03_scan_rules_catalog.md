# Bearing -- Scan Rules Catalog

> **Internal Avennorth Document** -- Not for customer distribution.
> Last updated: 2026-03-29

---

## Overview

Bearing ships with **23 scan rules** across **4 modules**. Each rule follows a consistent pattern:

1. Query ServiceNow data (from export payload or live API)
2. Evaluate against rule-specific logic (pattern match, count threshold, or age check)
3. Generate findings with severity, effort estimate, and remediation pattern

Rules are defined in two places:
- **Database:** `scan_rules` table (12 core rules seeded via `supabase/seed.sql`)
- **Code:** Evaluator functions in `src/server/scanner/modules/`

The scan engine (`src/server/scanner/engine.ts`) registers all 23 rules and runs them against the data.

---

## Module: Core Platform (10 rules)

### 1. core_hardcoded_sysid -- Hard-coded sys_ids in scripts

| Property | Value |
|----------|-------|
| Module | core |
| Category | code_quality |
| Severity | **Critical** |
| Risk Score | 4 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | script_refactor_simple |
| Effort | XS (2-4 hours) |
| ServiceNow Tables | sys_script, sys_script_include, sys_ui_script, sys_script_client |

**What it detects:** Scripts containing hard-coded 32-character sys_id values instead of dynamic references (system properties, script includes, or GlideRecord lookups). Hard-coded sys_ids break during cloning, upgrades, and cross-instance promotion.

**How it evaluates:** Regex pattern `[0-9a-f]{32}` applied to all active script bodies. Filters out the script's own sys_id and known system sys_ids. Each matching script produces one finding with `affectedCount` = number of hard-coded sys_ids in that script.

**Example finding:**
> Hard-coded sys_id in business rule: "Auto-assign to VIP group"
> Business rule "Auto-assign to VIP group" on table incident contains 3 hard-coded sys_id reference(s). These will break during cloning, migration, or instance refresh.

---

### 2. core_duplicate_business_rules -- Duplicate business rules on the same table

| Property | Value |
|----------|-------|
| Module | core |
| Category | code_quality |
| Severity | **High** |
| Risk Score | 3 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | business_rule_consolidation |
| Effort | S (4-8 hours) |
| ServiceNow Tables | sys_script |

**What it detects:** Active business rules on the same table with overlapping when-conditions and similar script logic, causing redundant execution and potential conflicts.

**How it evaluates:** Groups business rules by `collection` (table). Within each group, compares `when`, `filter_condition`, and `script` fields with a similarity threshold of 0.7. Reports when 2+ rules on the same table overlap.

**Example finding:**
> Duplicate business rules on table "incident": 3 rules with overlapping conditions
> Business rules "Set Priority", "Priority Calculator", and "Auto Priority" on table incident have overlapping when-conditions and similar logic.

---

### 3. core_client_server_antipattern -- Client scripts performing server-side operations

| Property | Value |
|----------|-------|
| Module | core |
| Category | architecture |
| Severity | **High** |
| Risk Score | 4 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | client_script_migration |
| Effort | M (4-12 hours) |
| ServiceNow Tables | sys_script_client |

**What it detects:** Client scripts that execute GlideRecord queries, direct table operations (`g_form.getReference`), or server-side calls (`gs.getUser`, `gs.hasRole`) that should be handled server-side.

**How it evaluates:** Scans active client script bodies for patterns: `new GlideRecord`, `GlideRecord(`, `g_form.getReference`, `gs.getUser`, `gs.hasRole`. Any match = finding.

**Example finding:**
> Client script "Populate Related Fields" performs server-side GlideRecord query
> Client script on table sc_req_item executes GlideRecord queries that should be handled by a business rule or GlideAjax script include.

---

### 4. core_sync_ajax -- Synchronous AJAX calls causing UI freezes

| Property | Value |
|----------|-------|
| Module | core |
| Category | performance |
| Severity | **High** |
| Risk Score | 3 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | ajax_modernization |
| Effort | S (2-6 hours) |
| ServiceNow Tables | sys_script, sys_script_include, sys_ui_action, sys_ui_policy |

**What it detects:** Scripts using synchronous GlideAjax (`getXMLWait`) or synchronous `XMLHttpRequest` calls that block the browser UI thread.

**How it evaluates:** Scans all script-bearing records (business rules, script includes, UI actions, UI policies) for patterns: `getXMLWait`, `XMLHttpRequest.*false)`. Any match = finding.

**Example finding:**
> Synchronous AJAX call in UI action "Validate Assignment"
> UI action "Validate Assignment" uses getXMLWait which blocks the browser UI thread until the server responds.

---

### 5. core_unscoped_customizations -- Customizations in the global scope

| Property | Value |
|----------|-------|
| Module | core |
| Category | architecture |
| Severity | **Medium** |
| Risk Score | 3 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | scope_migration |
| Effort | L (16-40 hours) |
| ServiceNow Tables | sys_metadata |

**What it detects:** Customizations (scripts, tables, UI components) in the global scope instead of a defined application scope, increasing upgrade risk and reducing maintainability.

**How it evaluates:** Counts metadata records with `sys_scope=global` and custom update names. Warning at 50+, critical at 200+.

**Example finding:**
> 147 customizations in global scope
> 147 customization records reside in the global scope. These should be migrated to scoped applications for upgrade safety.

---

### 6. core_deprecated_api -- Usage of deprecated ServiceNow APIs

| Property | Value |
|----------|-------|
| Module | core |
| Category | code_quality |
| Severity | **Medium** |
| Risk Score | 2 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | api_version_upgrade |
| Effort | S (4-8 hours) |
| ServiceNow Tables | sys_script, sys_script_include, sys_script_client |

**What it detects:** Scripts using deprecated API methods (Packages.java, parameterless getDisplayValue(), Glide. namespace) that may break on platform upgrades.

**How it evaluates:** Scans active scripts for patterns: `Packages.`, `getDisplayValue()`, `Glide.`. Any match = finding.

**Example finding:**
> Deprecated API usage in script include "LegacyUtils"
> Script include "LegacyUtils" uses Packages.java which is deprecated and will be removed in a future ServiceNow release.

---

### 7. core_stale_update_sets -- Stale update sets older than 90 days

| Property | Value |
|----------|-------|
| Module | core |
| Category | change_management |
| Severity | **Medium** |
| Risk Score | 2 |
| Evaluation Logic | age_check |
| Remediation Pattern | update_set_cleanup |
| Effort | XS (2-4 hours) |
| ServiceNow Tables | sys_update_set |

**What it detects:** Update sets in "in progress" state that have not been modified in over 90 days, indicating abandoned work.

**How it evaluates:** Checks `sys_updated_on` against thresholds. Warning at 90 days, critical at 180 days.

**Example finding:**
> 23 stale update sets (90+ days without modification)
> 23 update sets are in "in progress" state but have not been modified in over 90 days.

---

### 8. core_update_set_collisions -- Update set collision records

| Property | Value |
|----------|-------|
| Module | core |
| Category | change_management |
| Severity | **High** |
| Risk Score | 4 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | update_set_conflict_resolution |
| Effort | M (8-24 hours) |
| ServiceNow Tables | sys_update_set_problem |

**What it detects:** Update set preview problems and collision records that indicate conflicting changes between update sets, blocking clean promotion.

**How it evaluates:** Counts unresolved collision and preview problem records. Warning at 5, critical at 20.

**Example finding:**
> 12 unresolved update set collisions
> 12 collision records indicate conflicting changes between update sets that are blocking promotion.

---

### 9. core_direct_prod_changes -- Direct changes made in production

| Property | Value |
|----------|-------|
| Module | core |
| Category | change_management |
| Severity | **Critical** |
| Risk Score | 5 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | production_change_remediation |
| Effort | L (16-32 hours) |
| ServiceNow Tables | sys_update_xml |

**What it detects:** Configuration changes made directly in the production instance in the Default update set, indicating change control gaps.

**How it evaluates:** Counts update XML records in the Default update set created in the last 30 days. Warning at 1, critical at 10.

**Example finding:**
> 34 direct production changes in the last 30 days
> 34 configuration changes were made directly in production outside of a managed update set.

---

### 10. core_permissive_acls -- Overly permissive Access Control Lists

| Property | Value |
|----------|-------|
| Module | core |
| Category | security |
| Severity | **Critical** |
| Risk Score | 5 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | acl_restructuring |
| Effort | M (8-16 hours) |
| ServiceNow Tables | sys_security_acl, sys_security_acl_role |

**What it detects:** ACL rules with no conditions, no script, and no role requirements -- effectively granting unrestricted access.

**How it evaluates:** Finds active ACLs where `condition` is empty, `script` is empty, and no roles are assigned via left join to `sys_security_acl_role`.

**Example finding:**
> Overly permissive ACL on table "hr_case" (read operation)
> ACL rule on hr_case for read operation has no conditions, no script, and no role requirements.

---

### 11. core_redundant_acls -- Redundant ACL rules on the same resource

| Property | Value |
|----------|-------|
| Module | core |
| Category | security |
| Severity | **High** |
| Risk Score | 3 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | acl_restructuring |
| Effort | M (8-16 hours) |
| ServiceNow Tables | sys_security_acl |

**What it detects:** Multiple active ACL rules on the same table and operation that overlap in scope.

**How it evaluates:** Groups ACLs by `name` + `operation`. Reports when 2+ ACLs exist per resource. Warning at 5, critical at 15 total redundancies.

**Example finding:**
> 3 redundant ACL rules on "incident" (write operation)
> 3 ACL rules exist for the write operation on table incident with overlapping scope.

---

### 12. core_elevated_roles -- Users with elevated role assignments

| Property | Value |
|----------|-------|
| Module | core |
| Category | security |
| Severity | **High** |
| Risk Score | 4 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | role_audit_remediation |
| Effort | M (4-12 hours) |
| ServiceNow Tables | sys_user_has_role |

**What it detects:** Active users with highly privileged roles (admin, security_admin, impersonator) that may indicate over-provisioning.

**How it evaluates:** Counts active role assignments for elevated roles. Warning at 10 total, critical at 25. Per-role max of 5.

**Example finding:**
> 18 users with elevated admin role
> 18 active users have the admin role assigned. Review for over-provisioning.

---

## Module: CMDB (4 rules)

### 13. cmdb_stale_ci -- Stale CIs not discovered in 180+ days

| Property | Value |
|----------|-------|
| Module | cmdb |
| Category | data_quality |
| Severity | **Medium** |
| Risk Score | 2 |
| Evaluation Logic | age_check |
| Remediation Pattern | ci_lifecycle_cleanup |
| Effort | S (2-6 hours) |
| ServiceNow Tables | cmdb_ci |

**What it detects:** CIs with `last_discovered` older than 180 days while still marked as Operational, indicating potentially stale data.

**How it evaluates:** Compares `last_discovered` against the 180-day threshold for CIs with operational status.

**Example finding:**
> 245 stale CIs not discovered in 180+ days
> 245 CIs are marked Operational but have not been discovered in over 180 days.

---

### 14. cmdb_orphaned_ci -- Orphaned CIs with no relationships

| Property | Value |
|----------|-------|
| Module | cmdb |
| Category | data_quality |
| Severity | **Medium** |
| Risk Score | 3 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | ci_lifecycle_cleanup |
| Effort | S (2-6 hours) |
| ServiceNow Tables | cmdb_ci, cmdb_rel_ci |

**What it detects:** CIs that have no relationships (parent, child, or peer) in `cmdb_rel_ci`, making them disconnected from the service map.

**How it evaluates:** Cross-references CI sys_ids against relationship records. CIs appearing in neither `parent` nor `child` of any relationship = orphaned.

**Example finding:**
> 89 orphaned CIs with no relationships
> 89 CIs have no relationships defined, leaving them disconnected from the service map.

---

### 15. cmdb_missing_discovery_source -- CIs with no discovery source

| Property | Value |
|----------|-------|
| Module | cmdb |
| Category | data_quality |
| Severity | **High** |
| Risk Score | 3 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | ci_lifecycle_cleanup |
| Effort | S (2-6 hours) |
| ServiceNow Tables | cmdb_ci |

**What it detects:** CIs with an empty or null `discovery_source` field, indicating they were manually created and are not being maintained by any automated discovery process.

**How it evaluates:** Checks `discovery_source` for empty/null values on operational CIs.

**Example finding:**
> 312 CIs with no discovery source
> 312 operational CIs have no discovery source, meaning they were manually created and are not maintained by automated discovery.

---

### 16. cmdb_duplicate_ci -- Duplicate CIs

| Property | Value |
|----------|-------|
| Module | cmdb |
| Category | data_quality |
| Severity | **High** |
| Risk Score | 4 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | ci_deduplication |
| Effort | M (4-12 hours) |
| ServiceNow Tables | cmdb_ci |

**What it detects:** CIs that appear to be duplicates based on matching name, serial number, or other identifying attributes within the same class.

**How it evaluates:** Groups CIs by class and compares identifying attributes (name, serial_number, ip_address). CIs with matching identifiers within the same class = potential duplicates.

**Example finding:**
> 15 potential duplicate CIs detected
> 15 CI pairs share identical identifying attributes within the same class.

---

## Module: ITSM (7 rules)

### 17. itsm_unassigned_incidents -- Unassigned open incidents

| Property | Value |
|----------|-------|
| Module | itsm |
| Category | incident_health |
| Severity | **High** |
| Risk Score | 3 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | process_optimization |
| Effort | S (2-6 hours) |
| ServiceNow Tables | incident |

**What it detects:** Open incidents with no assigned_to or assignment_group, indicating routing gaps.

**How it evaluates:** Counts non-terminal incidents where both `assigned_to` and `assignment_group` are empty.

**Example finding:**
> 47 unassigned open incidents
> 47 open incidents have no assigned user or assignment group.

---

### 18. itsm_miscategorized_incidents -- Miscategorized incidents

| Property | Value |
|----------|-------|
| Module | itsm |
| Category | incident_health |
| Severity | **Medium** |
| Risk Score | 2 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | process_optimization |
| Effort | S (2-4 hours) |
| ServiceNow Tables | incident |

**What it detects:** Incidents with generic or default category values (empty, "Inquiry", "Other"), indicating poor categorization practices.

**How it evaluates:** Checks `category` against known generic values: empty string, "inquiry", "Inquiry / Help", "Other", "other".

**Example finding:**
> 234 incidents with generic or missing category
> 234 incidents have generic category values, reducing reporting accuracy.

---

### 19. itsm_aged_open_incidents -- Aged open incidents (30+ days)

| Property | Value |
|----------|-------|
| Module | itsm |
| Category | incident_health |
| Severity | **High** |
| Risk Score | 3 |
| Evaluation Logic | age_check |
| Remediation Pattern | process_optimization |
| Effort | M (4-8 hours) |
| ServiceNow Tables | incident |

**What it detects:** Incidents that have been open for more than 30 days without resolution.

**How it evaluates:** Checks `opened_at` on non-terminal incidents against the 30-day threshold.

**Example finding:**
> 56 incidents open for 30+ days
> 56 incidents have been open without resolution for over 30 days.

---

### 20. itsm_incident_reopens -- Reopened incidents (high reopen rate)

| Property | Value |
|----------|-------|
| Module | itsm |
| Category | incident_health |
| Severity | **Medium** |
| Risk Score | 3 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | process_optimization |
| Effort | S (2-6 hours) |
| ServiceNow Tables | incident |

**What it detects:** Incidents that have been reopened after resolution, indicating inadequate root cause resolution.

**How it evaluates:** Counts incidents with `reopen_count` > 0 or state transitions from Resolved back to active states.

**Example finding:**
> 28 incidents reopened after resolution
> 28 incidents were reopened, indicating potential issues with initial resolution quality.

---

### 21. itsm_emergency_change_ratio -- High emergency change ratio

| Property | Value |
|----------|-------|
| Module | itsm |
| Category | change_health |
| Severity | **High** |
| Risk Score | 4 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | process_optimization |
| Effort | M (4-12 hours) |
| ServiceNow Tables | change_request |

**What it detects:** A high ratio of emergency changes compared to total changes, indicating process maturity issues.

**How it evaluates:** Calculates the percentage of changes with `type=emergency`. Warning when ratio exceeds typical thresholds.

**Example finding:**
> Emergency changes represent 23% of all changes
> 45 out of 196 changes are emergency type, exceeding the recommended threshold.

---

### 22. itsm_unauthorized_changes -- Unauthorized changes

| Property | Value |
|----------|-------|
| Module | itsm |
| Category | change_health |
| Severity | **Critical** |
| Risk Score | 5 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | process_optimization |
| Effort | M (4-12 hours) |
| ServiceNow Tables | change_request |

**What it detects:** Changes that were implemented without proper approval, indicating change control gaps.

**How it evaluates:** Identifies changes in implementation or closed state without required approvals or with `unauthorized=true`.

**Example finding:**
> 8 unauthorized changes detected
> 8 changes were implemented without required approvals.

---

### 23. itsm_change_backout_missing -- Changes missing backout plans

| Property | Value |
|----------|-------|
| Module | itsm |
| Category | change_health |
| Severity | **Medium** |
| Risk Score | 3 |
| Evaluation Logic | count_threshold |
| Remediation Pattern | process_optimization |
| Effort | S (2-4 hours) |
| ServiceNow Tables | change_request |

**What it detects:** Changes without a documented backout plan, increasing risk of failed changes.

**How it evaluates:** Checks the `backout_plan` field for empty or null values on non-standard changes.

**Example finding:**
> 67 changes missing backout plans
> 67 change requests have no documented backout plan.

---

## Module: ITAM (2 rules)

### 24. itam_unreconciled_assets -- Unreconciled hardware assets

| Property | Value |
|----------|-------|
| Module | itam |
| Category | asset_management |
| Severity | **Medium** |
| Risk Score | 3 |
| Evaluation Logic | pattern_match |
| Remediation Pattern | asset_reconciliation |
| Effort | M (4-12 hours) |
| ServiceNow Tables | alm_hardware |

**What it detects:** Hardware assets with no linked CI record, meaning asset management and CMDB are not reconciled.

**How it evaluates:** Checks the `ci` field for null or empty values on deployed assets.

**Example finding:**
> 156 hardware assets not linked to CMDB CIs
> 156 deployed hardware assets have no corresponding CI record.

---

### 25. itam_expired_warranty_assets -- Expired warranty assets

| Property | Value |
|----------|-------|
| Module | itam |
| Category | asset_management |
| Severity | **Low** |
| Risk Score | 2 |
| Evaluation Logic | age_check |
| Remediation Pattern | asset_lifecycle_review |
| Effort | S (2-4 hours) |
| ServiceNow Tables | alm_hardware |

**What it detects:** Hardware assets with expired warranty dates that are still in active/deployed status.

**How it evaluates:** Compares `warranty_expiration` against current date for assets in deployed status.

**Example finding:**
> 89 assets with expired warranties still deployed
> 89 hardware assets have warranty dates in the past but are still actively deployed.

---

## Rule Summary Table

| # | Rule Key | Module | Severity | Risk | Effort | Pattern |
|---|----------|--------|----------|------|--------|---------|
| 1 | core_hardcoded_sysid | core | Critical | 4 | XS | script_refactor_simple |
| 2 | core_duplicate_business_rules | core | High | 3 | S | business_rule_consolidation |
| 3 | core_client_server_antipattern | core | High | 4 | M | client_script_migration |
| 4 | core_sync_ajax | core | High | 3 | S | ajax_modernization |
| 5 | core_unscoped_customizations | core | Medium | 3 | L | scope_migration |
| 6 | core_deprecated_api | core | Medium | 2 | S | api_version_upgrade |
| 7 | core_stale_update_sets | core | Medium | 2 | XS | update_set_cleanup |
| 8 | core_update_set_collisions | core | High | 4 | M | update_set_conflict_resolution |
| 9 | core_direct_prod_changes | core | Critical | 5 | L | production_change_remediation |
| 10 | core_permissive_acls | core | Critical | 5 | M | acl_restructuring |
| 11 | core_redundant_acls | core | High | 3 | M | acl_restructuring |
| 12 | core_elevated_roles | core | High | 4 | M | role_audit_remediation |
| 13 | cmdb_stale_ci | cmdb | Medium | 2 | S | ci_lifecycle_cleanup |
| 14 | cmdb_orphaned_ci | cmdb | Medium | 3 | S | ci_lifecycle_cleanup |
| 15 | cmdb_missing_discovery_source | cmdb | High | 3 | S | ci_lifecycle_cleanup |
| 16 | cmdb_duplicate_ci | cmdb | High | 4 | M | ci_deduplication |
| 17 | itsm_unassigned_incidents | itsm | High | 3 | S | process_optimization |
| 18 | itsm_miscategorized_incidents | itsm | Medium | 2 | S | process_optimization |
| 19 | itsm_aged_open_incidents | itsm | High | 3 | M | process_optimization |
| 20 | itsm_incident_reopens | itsm | Medium | 3 | S | process_optimization |
| 21 | itsm_emergency_change_ratio | itsm | High | 4 | M | process_optimization |
| 22 | itsm_unauthorized_changes | itsm | Critical | 5 | M | process_optimization |
| 23 | itsm_change_backout_missing | itsm | Medium | 3 | S | process_optimization |
| 24 | itam_unreconciled_assets | itam | Medium | 3 | M | asset_reconciliation |
| 25 | itam_expired_warranty_assets | itam | Low | 2 | S | asset_lifecycle_review |

**Severity distribution:** 4 Critical, 9 High, 9 Medium, 1 Low
**Module distribution:** 12 Core, 4 CMDB, 7 ITSM, 2 ITAM
