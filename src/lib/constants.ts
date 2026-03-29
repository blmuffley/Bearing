// ─── Brand Colors ───────────────────────────────────────────────────────────
export const COLORS = {
  obsidian: '#1A1A2E',
  electricLime: '#CCFF00',
  darkGray: '#2D2D3D',
  mediumGray: '#6B6B7B',
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
export const FONTS = {
  heading: 'Syne',
  body: 'DM Sans',
  code: 'Space Mono',
} as const;

// ─── Severity Levels ────────────────────────────────────────────────────────
export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_SCORES: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

// ─── Effort T-shirt Sizes ───────────────────────────────────────────────────
export const EFFORT_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type EffortSize = (typeof EFFORT_SIZES)[number];

// ─── Assessment Statuses ────────────────────────────────────────────────────
export const ASSESSMENT_STATUSES = [
  'queued',
  'scanning',
  'analyzing',
  'scoring',
  'complete',
  'error',
] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

// ─── Scan Types ─────────────────────────────────────────────────────────────
export const SCAN_TYPES = ['full_api', 'export_ingest', 'instance_scan_import'] as const;
export type ScanType = (typeof SCAN_TYPES)[number];

// ─── Module Definitions ─────────────────────────────────────────────────────
export const MODULES = [
  'core', 'cmdb', 'itsm', 'itam', 'hrsd',
  'spm', 'secops', 'grc', 'csm', 'itom', 'ea',
] as const;
export type Module = (typeof MODULES)[number];

// ─── ServiceNow Tables by Module ────────────────────────────────────────────
export const MODULE_TABLES = {
  core: [
    'sys_script',           // Business rules
    'sys_script_include',   // Script includes
    'sys_ui_policy',        // UI policies
    'sys_ui_action',        // UI actions
    'sys_dictionary',       // Table/field definitions
    'sys_db_object',        // Table definitions
    'sys_scope',            // Application scopes
    'sys_update_set',       // Update sets
    'sys_update_xml',       // Update set entries
    'sys_security_acl',     // ACLs
    'sys_user_has_role',    // Role assignments
    'sys_properties',       // System properties
  ],
  cmdb: [
    'cmdb_ci',              // Base CI table
    'cmdb_rel_ci',          // CI relationships
    'cmdb_rel_type',        // Relationship types
    'cmn_location',         // Locations
    'discovery_status',     // Discovery results
    'svc_ci_assoc',         // Service-CI associations
    'cmdb_ci_service',      // Business services
    'cmdb_ci_service_auto', // Application services
  ],
  itsm: [
    'incident',
    'problem',
    'change_request',
    'sc_request',
    'sc_task',
    'task_sla',
    'sla_definition',
    'sys_trigger',
    'sys_user_group',       // Assignment groups
  ],
  itam: [
    'alm_hardware',
    'alm_consumable',
    'alm_license',
    'cmdb_sam_sw_install',
    'cmdb_software_product_model',
    'ast_contract',
    'alm_stockroom',
  ],
  hrsd: ['sn_hr_core_case', 'sn_hr_core_task', 'kb_knowledge', 'topic'],
  spm: ['pm_project', 'pm_program', 'pm_portfolio', 'dmn_demand', 'resource_plan', 'planned_task', 'time_card', 'cost_plan'],
  secops: ['sn_vul_vulnerability', 'sn_vul_entry', 'sn_si_incident', 'sn_si_task'],
  grc: ['sn_compliance_policy', 'sn_risk_risk', 'sn_grc_control', 'sn_grc_test_plan', 'sn_audit_engagement'],
  csm: ['sn_customerservice_case', 'csm_consumer', 'customer_account', 'customer_contact', 'sn_entitlement'],
  itom: ['discovery_status', 'discovery_credentials', 'sa_pattern', 'em_alert', 'em_event', 'evt_mgmt_rule'],
  ea: ['cmdb_ci_business_app', 'business_capability', 'pa_indicators', 'asmt_assessment_instance'],
} as const;

// ─── Composite Score Weights ────────────────────────────────────────────────
export const SCORE_WEIGHTS = {
  severity: 0.4,
  effortInverse: 0.3,
  risk: 0.3,
} as const;
