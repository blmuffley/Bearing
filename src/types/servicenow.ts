/**
 * Types for ServiceNow module tables and API responses.
 */

import type { Module } from './assessment';

export interface ServiceNowTableApiParams {
  table: string;
  sysparmQuery?: string;
  sysparmFields?: string[];
  sysparmLimit?: number;
  sysparmOffset?: number;
  sysparmDisplayValue?: boolean;
}

export interface ServiceNowTableApiResponse<T = Record<string, unknown>> {
  result: T[];
}

export interface ServiceNowPaginatedResponse<T = Record<string, unknown>> {
  result: T[];
  totalCount: number;
  offset: number;
  limit: number;
}

export interface ServiceNowErrorResponse {
  error: {
    message: string;
    detail?: string;
  };
  status: string;
}

export interface ServiceNowOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

export interface ServiceNowOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface ServiceNowBasicAuthConfig {
  username: string;
  password: string;
}

export type ServiceNowAuthConfig =
  | { type: 'oauth'; config: ServiceNowOAuthConfig }
  | { type: 'basic'; config: ServiceNowBasicAuthConfig };

/**
 * Tables organized by module, matching the MODULE_TABLES constant in CLAUDE.md.
 */
export type CoreTable =
  | 'sys_script'
  | 'sys_script_include'
  | 'sys_ui_policy'
  | 'sys_ui_action'
  | 'sys_dictionary'
  | 'sys_db_object'
  | 'sys_scope'
  | 'sys_update_set'
  | 'sys_update_xml'
  | 'sys_security_acl'
  | 'sys_user_has_role'
  | 'sys_properties';

export type CmdbTable =
  | 'cmdb_ci'
  | 'cmdb_rel_ci'
  | 'cmdb_rel_type'
  | 'cmn_location'
  | 'discovery_status'
  | 'svc_ci_assoc'
  | 'cmdb_ci_service'
  | 'cmdb_ci_service_auto';

export type ItsmTable =
  | 'incident'
  | 'problem'
  | 'change_request'
  | 'sc_request'
  | 'sc_task'
  | 'task_sla'
  | 'sla_definition'
  | 'sys_trigger'
  | 'sys_user_group';

export type ItamTable =
  | 'alm_hardware'
  | 'alm_consumable'
  | 'alm_license'
  | 'cmdb_sam_sw_install'
  | 'cmdb_software_product_model'
  | 'ast_contract'
  | 'alm_stockroom';

export type HrsdTable =
  | 'sn_hr_core_case'
  | 'sn_hr_core_task'
  | 'kb_knowledge'
  | 'topic';

export type SpmTable =
  | 'pm_project'
  | 'pm_program'
  | 'pm_portfolio'
  | 'dmn_demand'
  | 'resource_plan'
  | 'planned_task'
  | 'time_card'
  | 'cost_plan';

export type SecopsTable =
  | 'sn_vul_vulnerability'
  | 'sn_vul_entry'
  | 'sn_si_incident'
  | 'sn_si_task';

export type GrcTable =
  | 'sn_compliance_policy'
  | 'sn_risk_risk'
  | 'sn_grc_control'
  | 'sn_grc_test_plan'
  | 'sn_audit_engagement';

export type CsmTable =
  | 'sn_customerservice_case'
  | 'csm_consumer'
  | 'customer_account'
  | 'customer_contact'
  | 'sn_entitlement';

export type ItomTable =
  | 'discovery_status'
  | 'discovery_credentials'
  | 'sa_pattern'
  | 'em_alert'
  | 'em_event'
  | 'evt_mgmt_rule';

export type EaTable =
  | 'cmdb_ci_business_app'
  | 'business_capability'
  | 'pa_indicators'
  | 'asmt_assessment_instance';

export type ServiceNowTable =
  | CoreTable
  | CmdbTable
  | ItsmTable
  | ItamTable
  | HrsdTable
  | SpmTable
  | SecopsTable
  | GrcTable
  | CsmTable
  | ItomTable
  | EaTable;

export type ModuleTableMap = {
  core: readonly CoreTable[];
  cmdb: readonly CmdbTable[];
  itsm: readonly ItsmTable[];
  itam: readonly ItamTable[];
  hrsd: readonly HrsdTable[];
  spm: readonly SpmTable[];
  secops: readonly SecopsTable[];
  grc: readonly GrcTable[];
  csm: readonly CsmTable[];
  itom: readonly ItomTable[];
  ea: readonly EaTable[];
};

export interface ServiceNowRecord {
  sys_id: string;
  sys_created_on?: string;
  sys_updated_on?: string;
  sys_class_name?: string;
  [key: string]: unknown;
}
