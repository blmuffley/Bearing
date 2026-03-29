-- Bearing: Seed Data
-- Remediation patterns and scan rules for the core platform module

-- ============================================================
-- REMEDIATION PATTERNS (inserted first — scan_rules FK depends on these)
-- ============================================================

INSERT INTO remediation_patterns (pattern_key, display_name, description, effort_hours_low, effort_hours_high, effort_tshirt, required_roles, sow_scope_template, sow_assumptions, sow_deliverables, sow_exclusions) VALUES

-- 1. script_refactor_simple
('script_refactor_simple',
 'Simple Script Refactoring',
 'Refactor scripts to remove hard-coded values, fix anti-patterns, and align with ServiceNow best practices. Applies to straightforward single-table or single-concern scripts.',
 2, 4, 'XS',
 '["admin", "developer"]'::jsonb,
 'Identify and refactor scripts containing hard-coded sys_ids, magic strings, or simple anti-patterns. Replace with system properties, script includes, or dynamic references.',
 'Customer provides access to a sub-production instance for testing. Scripts are not part of a vendor-managed application.',
 '["Refactored scripts with hard-coded values replaced by dynamic references", "Updated system properties or script includes as needed", "Unit test validation in sub-production"]'::jsonb,
 'Does not cover scripts within vendor-locked scoped applications or store apps.'),

-- 2. script_refactor_complex
('script_refactor_complex',
 'Complex Script Refactoring',
 'Refactor complex, multi-dependency scripts that span multiple tables, integrate with external systems, or contain deeply nested logic requiring architectural review.',
 8, 16, 'M',
 '["admin", "developer", "architect"]'::jsonb,
 'Perform architectural review and refactoring of complex scripts with multiple dependencies, cross-table logic, or external integrations. Decompose monolithic scripts into modular, maintainable components.',
 'Customer provides documentation of existing integrations and business logic intent. A sub-production instance is available for end-to-end testing.',
 '["Architectural review document", "Refactored and modularized scripts", "Updated integration points", "End-to-end test results in sub-production"]'::jsonb,
 'Does not include re-architecture of external systems or third-party integration endpoints.'),

-- 3. business_rule_consolidation
('business_rule_consolidation',
 'Business Rule Consolidation',
 'Identify and consolidate duplicate or overlapping business rules on the same table to reduce execution overhead and eliminate conflicts.',
 4, 8, 'S',
 '["admin", "developer"]'::jsonb,
 'Analyze business rules on affected tables to identify duplicates, overlapping conditions, and conflicting logic. Consolidate into optimized, non-conflicting rules with proper ordering.',
 'Customer can identify the intended business outcome for each rule. Rules are not part of a vendor-managed scoped application.',
 '["Business rule audit report per table", "Consolidated business rules with documented merge rationale", "Validation testing in sub-production"]'::jsonb,
 'Does not cover business rules within vendor-locked scoped applications.'),

-- 4. client_script_migration
('client_script_migration',
 'Client Script to Server Migration',
 'Migrate business logic currently executing in client scripts to appropriate server-side scripts (business rules, script includes, or scheduled jobs) to improve security and reliability.',
 4, 12, 'M',
 '["admin", "developer"]'::jsonb,
 'Identify client scripts performing server-side operations (GlideRecord queries, data mutations, role checks). Migrate logic to appropriate server-side constructs while preserving UI responsiveness.',
 'Customer accepts that form behavior may change slightly as logic moves server-side. Sub-production instance available for user acceptance testing.',
 '["Inventory of client scripts requiring migration", "Server-side replacement scripts", "Updated client scripts (UI-only logic)", "UAT test plan and results"]'::jsonb,
 'Does not include redesign of form layouts or UI policies beyond what is necessary for the migration.'),

-- 5. ajax_modernization
('ajax_modernization',
 'Synchronous AJAX Modernization',
 'Replace synchronous GlideAjax and XMLHttpRequest calls with asynchronous patterns to eliminate UI freezing and improve user experience.',
 2, 6, 'S',
 '["developer"]'::jsonb,
 'Locate all synchronous AJAX calls (getXMLWait, synchronous XMLHttpRequest) and convert to asynchronous callback or promise-based patterns using GlideAjax with getXMLAnswer.',
 'Customer accepts minor changes to script execution flow. Dependent downstream logic will be refactored to handle async responses.',
 '["Inventory of synchronous AJAX calls", "Refactored async scripts", "Validation that dependent logic handles async flow", "Performance comparison before/after"]'::jsonb,
 'Does not cover synchronous calls within third-party or store application scripts.'),

-- 6. scope_migration
('scope_migration',
 'Application Scope Migration',
 'Migrate unscoped (global) customizations into properly defined application scopes to improve upgrade safety, maintainability, and namespace isolation.',
 16, 40, 'L',
 '["admin", "developer", "architect"]'::jsonb,
 'Inventory global-scope customizations, design target application scope structure, and migrate scripts, tables, and configurations into scoped applications with proper access controls and cross-scope APIs.',
 'Customer has a defined application ownership model or is willing to establish one. A dedicated sub-production instance is available for iterative migration and testing.',
 '["Global customization inventory and scope mapping plan", "Created scoped applications with migrated artifacts", "Cross-scope access policies configured", "Regression testing in sub-production", "Migration runbook for production"]'::jsonb,
 'Does not include migration of customizations that depend on global-only APIs without scoped equivalents. Platform upgrade is out of scope.'),

-- 7. api_version_upgrade
('api_version_upgrade',
 'Deprecated API Upgrade',
 'Replace usage of deprecated ServiceNow APIs (GlideRecord v1 methods, legacy SOAP endpoints, retired script APIs) with current supported equivalents.',
 4, 8, 'S',
 '["developer"]'::jsonb,
 'Scan all scripts for deprecated API usage (per ServiceNow deprecation notices for the target version). Replace with current supported API equivalents and validate functionality.',
 'Customer has identified the target ServiceNow version for upgrade compatibility. Deprecated API mapping documentation is available from ServiceNow release notes.',
 '["Deprecated API usage report", "Updated scripts using supported APIs", "Validation test results", "Compatibility confirmation for target version"]'::jsonb,
 'Does not include full platform upgrade execution or testing of third-party integrations using deprecated endpoints.'),

-- 8. update_set_cleanup
('update_set_cleanup',
 'Update Set Cleanup & Organization',
 'Clean up stale, incomplete, and orphaned update sets. Establish naming conventions and organizational standards for ongoing change management.',
 2, 4, 'XS',
 '["admin"]'::jsonb,
 'Audit all update sets in non-complete states. Archive or delete stale update sets, resolve orphaned records, and document a naming convention and lifecycle policy for future use.',
 'Customer authorizes deletion or archival of update sets older than the agreed-upon threshold. A list of active project update sets is provided to avoid accidental cleanup.',
 '["Update set audit report (stale, orphaned, in-progress)", "Cleaned update set list", "Naming convention and lifecycle policy document"]'::jsonb,
 'Does not include remediation of configuration changes captured in the cleaned update sets.'),

-- 9. update_set_conflict_resolution
('update_set_conflict_resolution',
 'Update Set Conflict Resolution',
 'Resolve update set collisions and preview errors that block promotion across environments. Includes merge conflict analysis and resolution.',
 8, 24, 'M',
 '["admin", "developer"]'::jsonb,
 'Analyze update set preview errors and collision records across the promotion pipeline. Resolve merge conflicts, duplicate entries, and ordering issues to restore clean promotion paths.',
 'Customer provides access to all environments in the promotion pipeline (dev, test, staging, prod). Conflict resolution priorities are defined by the customer change advisory board.',
 '["Collision and preview error analysis report", "Resolved update sets ready for promotion", "Promotion validation in target environment", "Recommended process improvements to prevent recurrence"]'::jsonb,
 'Does not include re-implementation of conflicting features or redesign of the SDLC pipeline tooling.'),

-- 10. production_change_remediation
('production_change_remediation',
 'Production Change Process Remediation',
 'Address direct production changes by back-capturing into update sets, establishing change controls, and remediating configuration drift between environments.',
 16, 32, 'L',
 '["admin", "architect"]'::jsonb,
 'Identify direct production changes not captured in update sets. Back-capture changes, reconcile environment drift, and implement change control policies (update set enforcement, instance protection policies) to prevent recurrence.',
 'Customer provides a list of known direct production changes or authorizes a full environment comparison. A baseline sub-production environment is available for drift analysis.',
 '["Environment drift analysis report", "Back-captured update sets for production-only changes", "Reconciled sub-production environment", "Implemented change control policies (update set enforcement, instance protection)", "Change management process documentation"]'::jsonb,
 'Does not include implementation of a full SDLC/DevOps pipeline. Does not cover data-level changes (only configuration/customization).'),

-- 11. acl_restructuring
('acl_restructuring',
 'ACL Restructuring',
 'Restructure Access Control Lists to follow least-privilege principles, remove overly permissive rules, consolidate redundant ACLs, and ensure proper inheritance chains.',
 8, 16, 'M',
 '["admin", "security_admin"]'::jsonb,
 'Audit all ACL rules for overly permissive conditions (empty scripts, wildcard roles, no conditions). Restructure to follow least-privilege, remove redundancies, and validate that legitimate access is preserved.',
 'Customer provides a role-to-persona mapping document or is willing to define one. ACL changes are tested in sub-production with representative user accounts before production deployment.',
 '["ACL audit report with risk ratings", "Restructured ACL rules following least-privilege", "Role-to-ACL mapping documentation", "Access validation test results with representative users"]'::jsonb,
 'Does not include redesign of the customer role hierarchy or implementation of new roles beyond what is needed for ACL restructuring.'),

-- 12. role_audit_remediation
('role_audit_remediation',
 'Role Audit & Remediation',
 'Audit user role assignments, identify over-provisioned accounts, remove unnecessary elevated roles, and establish role governance processes.',
 4, 12, 'M',
 '["admin", "security_admin"]'::jsonb,
 'Perform a comprehensive role audit across all users. Identify accounts with elevated roles (admin, security_admin, impersonator) that do not require them. Remove excess privileges and document a role governance policy.',
 'Customer stakeholders are available to confirm required role assignments for their teams. An approved role matrix or RACI exists or will be created during this engagement.',
 '["Role assignment audit report", "List of over-provisioned accounts with recommended changes", "Remediated role assignments", "Role governance policy and periodic review process"]'::jsonb,
 'Does not include implementation of role-mining automation or integration with external identity governance tools.');


-- ============================================================
-- SCAN RULES (12 core platform rules)
-- ============================================================

INSERT INTO scan_rules (module, category, rule_key, display_name, description, severity, risk_score, remediation_pattern_key, query_config, evaluation_logic, threshold_config) VALUES

-- 1. Hard-coded sys_ids
('core', 'code_quality', 'core_hardcoded_sysid',
 'Hard-coded sys_ids in scripts',
 'Detects scripts containing hard-coded 32-character sys_id values instead of dynamic references. Hard-coded sys_ids break during cloning, upgrades, and cross-instance promotion.',
 'critical', 4, 'script_refactor_simple',
 '{
   "table": "sys_script",
   "conditions": "scriptLIKE%sys_id%^ORscriptLIKE%addQuery(''%^active=true",
   "fields": ["sys_id", "name", "collection", "script", "sys_updated_on"],
   "additional_tables": ["sys_script_include", "sys_ui_script", "sys_script_client"]
 }'::jsonb,
 'pattern_match',
 '{"pattern": "[0-9a-f]{32}", "min_matches": 1, "exclude_patterns": ["sys_id\\s*=\\s*current\\.sys_id"]}'::jsonb),

-- 2. Duplicate business rules
('core', 'code_quality', 'core_duplicate_business_rules',
 'Duplicate business rules on the same table',
 'Identifies business rules on the same table with overlapping when-conditions and similar script logic, causing redundant execution and potential conflicts.',
 'high', 3, 'business_rule_consolidation',
 '{
   "table": "sys_script",
   "conditions": "active=true^collection!=NULL",
   "fields": ["sys_id", "name", "collection", "when", "filter_condition", "script", "order"],
   "group_by": "collection"
 }'::jsonb,
 'pattern_match',
 '{"similarity_threshold": 0.7, "compare_fields": ["when", "filter_condition", "script"], "min_duplicates_per_table": 2}'::jsonb),

-- 3. Client scripts doing server work
('core', 'architecture', 'core_client_server_antipattern',
 'Client scripts performing server-side operations',
 'Detects client scripts that execute GlideRecord queries, direct table operations, or other server-side logic that should be handled by business rules or script includes.',
 'high', 4, 'client_script_migration',
 '{
   "table": "sys_script_client",
   "conditions": "scriptLIKEGlideRecord%^ORscriptLIKEg_form.getReference%^ORscriptLIKEgs.%^active=true",
   "fields": ["sys_id", "name", "table", "type", "script", "sys_updated_on"]
 }'::jsonb,
 'pattern_match',
 '{"patterns": ["new GlideRecord", "GlideRecord\\(", "g_form\\.getReference", "gs\\.getUser", "gs\\.hasRole"], "min_matches": 1}'::jsonb),

-- 4. Synchronous AJAX calls
('core', 'performance', 'core_sync_ajax',
 'Synchronous AJAX calls causing UI freezes',
 'Identifies scripts using synchronous GlideAjax (getXMLWait) or synchronous XMLHttpRequest calls that block the browser UI thread.',
 'high', 3, 'ajax_modernization',
 '{
   "table": "sys_script_client",
   "conditions": "scriptLIKEgetXMLWait%^ORscriptLIKEfalse)%XMLHttpRequest%^active=true",
   "fields": ["sys_id", "name", "table", "type", "script", "sys_updated_on"]
 }'::jsonb,
 'pattern_match',
 '{"patterns": ["getXMLWait", "XMLHttpRequest.*false\\)"], "min_matches": 1}'::jsonb),

-- 5. Non-scoped customizations
('core', 'architecture', 'core_unscoped_customizations',
 'Customizations in the global scope',
 'Identifies customizations (scripts, tables, UI components) that reside in the global scope instead of a defined application scope, increasing upgrade risk and reducing maintainability.',
 'medium', 3, 'scope_migration',
 '{
   "table": "sys_metadata",
   "conditions": "sys_scope=global^sys_class_name!=sys_dictionary^sys_class_name!=sys_db_object^sys_update_nameSTARTSWITHcustom",
   "fields": ["sys_id", "sys_class_name", "sys_name", "sys_scope", "sys_update_name", "sys_updated_on"],
   "count_only": true
 }'::jsonb,
 'count_threshold',
 '{"warning_threshold": 50, "critical_threshold": 200}'::jsonb),

-- 6. Deprecated API usage
('core', 'code_quality', 'core_deprecated_api',
 'Usage of deprecated ServiceNow APIs',
 'Scans scripts for deprecated API methods and classes that may break on platform upgrades (e.g., GlideRecord.getDisplayValue without field, Packages.java usage, legacy SOAP helpers).',
 'medium', 2, 'api_version_upgrade',
 '{
   "table": "sys_script",
   "conditions": "scriptLIKEPackages.%^ORscriptLIKEgetDisplayValue()%^ORscriptLIKEGlide.%^active=true",
   "fields": ["sys_id", "name", "collection", "script", "sys_updated_on"],
   "additional_tables": ["sys_script_include", "sys_script_client"]
 }'::jsonb,
 'pattern_match',
 '{"patterns": ["Packages\\.", "getDisplayValue\\(\\)", "Glide\\."], "min_matches": 1}'::jsonb),

-- 7. Stale update sets
('core', 'change_management', 'core_stale_update_sets',
 'Stale update sets older than 90 days',
 'Identifies update sets in "in progress" state that have not been modified in over 90 days, indicating abandoned work that clutters the change pipeline.',
 'medium', 2, 'update_set_cleanup',
 '{
   "table": "sys_update_set",
   "conditions": "state=in progress^sys_updated_on<javascript:gs.daysAgoStart(90)",
   "fields": ["sys_id", "name", "state", "application", "sys_created_by", "sys_updated_on"]
 }'::jsonb,
 'age_check',
 '{"age_field": "sys_updated_on", "warning_days": 90, "critical_days": 180}'::jsonb),

-- 8. Update set collisions
('core', 'change_management', 'core_update_set_collisions',
 'Update set collision records',
 'Detects update set preview problems and collision records that indicate conflicting changes between update sets, blocking clean promotion across environments.',
 'high', 4, 'update_set_conflict_resolution',
 '{
   "table": "sys_update_set_problem",
   "conditions": "type=collision^ORtype=Preview Problem^status!=resolved",
   "fields": ["sys_id", "type", "description", "status", "remote_update_set", "sys_created_on"]
 }'::jsonb,
 'count_threshold',
 '{"warning_threshold": 5, "critical_threshold": 20}'::jsonb),

-- 9. Direct production changes
('core', 'change_management', 'core_direct_prod_changes',
 'Direct changes made in production',
 'Identifies configuration changes made directly in the production instance outside of a managed update set promotion process, indicating change control gaps.',
 'critical', 5, 'production_change_remediation',
 '{
   "table": "sys_update_xml",
   "conditions": "update_set.nameSTARTSWITHDefault^sys_created_on>javascript:gs.daysAgoStart(30)^update_set.is_default=true",
   "fields": ["sys_id", "name", "type", "target_name", "update_set", "sys_created_by", "sys_created_on"]
 }'::jsonb,
 'count_threshold',
 '{"warning_threshold": 1, "critical_threshold": 10}'::jsonb),

-- 10. Overly permissive ACLs
('core', 'security', 'core_permissive_acls',
 'Overly permissive Access Control Lists',
 'Detects ACL rules with no conditions, no script, and no role requirements — effectively granting unrestricted access to the protected resource.',
 'critical', 5, 'acl_restructuring',
 '{
   "table": "sys_security_acl",
   "conditions": "active=true^conditionISEMPTY^scriptISEMPTY^admin_overrides=false",
   "fields": ["sys_id", "name", "type", "operation", "condition", "script", "admin_overrides", "sys_updated_on"],
   "join": {"table": "sys_security_acl_role", "condition": "sys_security_acl.sys_id=acl", "type": "left", "empty_check": true}
 }'::jsonb,
 'pattern_match',
 '{"require_empty": ["condition", "script"], "require_no_roles": true}'::jsonb),

-- 11. Redundant ACLs
('core', 'security', 'core_redundant_acls',
 'Redundant ACL rules on the same resource',
 'Identifies multiple ACL rules on the same table and operation that overlap in scope, creating maintenance confusion and potential security gaps during edits.',
 'high', 3, 'acl_restructuring',
 '{
   "table": "sys_security_acl",
   "conditions": "active=true",
   "fields": ["sys_id", "name", "type", "operation", "condition", "script", "sys_updated_on"],
   "group_by": ["name", "operation"]
 }'::jsonb,
 'count_threshold',
 '{"min_duplicates_per_resource": 2, "warning_threshold": 5, "critical_threshold": 15}'::jsonb),

-- 12. Elevated role assignments
('core', 'security', 'core_elevated_roles',
 'Users with elevated role assignments',
 'Audits user-to-role assignments for highly privileged roles (admin, security_admin, impersonator, soap, rest_api_explorer) to identify over-provisioned accounts.',
 'high', 4, 'role_audit_remediation',
 '{
   "table": "sys_user_has_role",
   "conditions": "role.name=admin^ORrole.name=security_admin^ORrole.name=impersonator^state=active^user.active=true",
   "fields": ["sys_id", "user", "role", "state", "sys_created_on", "granted_by"],
   "elevated_roles": ["admin", "security_admin", "impersonator", "soap", "rest_api_explorer"]
 }'::jsonb,
 'count_threshold',
 '{"warning_threshold": 10, "critical_threshold": 25, "per_role_max": 5}'::jsonb);
