/**
 * Export payload parser for sanitized ServiceNow JSON exports.
 *
 * Validates incoming export payloads against a Zod schema and returns
 * strongly-typed data for the scan engine to consume.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas for each record type
// ---------------------------------------------------------------------------

const businessRuleSchema = z.object({
  sys_id: z.string(),
  name: z.string(),
  script: z.string(),
  collection: z.string(),
  when: z.string(),
  active: z.boolean(),
  scope: z.string().optional(),
});

const scriptIncludeSchema = z.object({
  sys_id: z.string(),
  name: z.string(),
  script: z.string(),
  api_name: z.string(),
  active: z.boolean(),
  scope: z.string().optional(),
});

const uiPolicySchema = z.object({
  sys_id: z.string(),
  short_description: z.string(),
  table: z.string(),
  active: z.boolean(),
  script_true: z.string().optional(),
  script_false: z.string().optional(),
});

const uiActionSchema = z.object({
  sys_id: z.string(),
  name: z.string(),
  script: z.string(),
  table: z.string(),
  active: z.boolean(),
});

const updateSetSchema = z.object({
  sys_id: z.string(),
  name: z.string(),
  state: z.string(),
  application: z.string(),
  created_on: z.string(),
  updated_on: z.string(),
});

const updateSetEntrySchema = z.object({
  sys_id: z.string(),
  update_set: z.string(),
  name: z.string(),
  type: z.string(),
  action: z.string(),
});

const aclSchema = z.object({
  sys_id: z.string(),
  name: z.string(),
  operation: z.string(),
  type: z.string(),
  script: z.string(),
  condition: z.string(),
  active: z.boolean(),
  admin_overrides: z.boolean(),
});

const roleAssignmentSchema = z.object({
  sys_id: z.string(),
  user: z.string(),
  role: z.string(),
  inherited: z.boolean(),
});

const systemPropertySchema = z.object({
  sys_id: z.string(),
  name: z.string(),
  value: z.string(),
  description: z.string(),
});

// ---------------------------------------------------------------------------
// Module schemas
// ---------------------------------------------------------------------------

const coreModuleSchema = z.object({
  business_rules: z.array(businessRuleSchema).optional(),
  script_includes: z.array(scriptIncludeSchema).optional(),
  ui_policies: z.array(uiPolicySchema).optional(),
  ui_actions: z.array(uiActionSchema).optional(),
  update_sets: z.array(updateSetSchema).optional(),
  update_set_entries: z.array(updateSetEntrySchema).optional(),
  acls: z.array(aclSchema).optional(),
  role_assignments: z.array(roleAssignmentSchema).optional(),
  system_properties: z.array(systemPropertySchema).optional(),
});

const cmdbCiSchema = z.object({
  sys_id: z.string(),
  name: z.string(),
  sys_class_name: z.string(),
  operational_status: z.string(),
  install_status: z.string(),
  last_discovered: z.string(),
  discovery_source: z.string(),
});

const cmdbRelationshipSchema = z.object({
  sys_id: z.string(),
  parent: z.string(),
  child: z.string(),
  type: z.string(),
});

const cmdbModuleSchema = z.object({
  cis: z.array(cmdbCiSchema).optional(),
  relationships: z.array(cmdbRelationshipSchema).optional(),
});

const incidentSchema = z.object({
  sys_id: z.string(),
  number: z.string(),
  state: z.string(),
  priority: z.string(),
  assignment_group: z.string(),
  assigned_to: z.string(),
  category: z.string(),
  opened_at: z.string(),
  resolved_at: z.string().optional(),
});

const changeSchema = z.object({
  sys_id: z.string(),
  number: z.string(),
  type: z.string(),
  state: z.string(),
  approval: z.string(),
  backout_plan: z.string().optional(),
  opened_at: z.string(),
  closed_at: z.string().optional(),
});

const itsmModuleSchema = z.object({
  incidents: z.array(incidentSchema).optional(),
  changes: z.array(changeSchema).optional(),
});

const hardwareAssetSchema = z.object({
  sys_id: z.string(),
  display_name: z.string(),
  model: z.string(),
  serial_number: z.string(),
  ci: z.string().optional(),
  install_status: z.string(),
  warranty_expiration: z.string().optional(),
  assigned_to: z.string().optional(),
});

const itamModuleSchema = z.object({
  hardware_assets: z.array(hardwareAssetSchema).optional(),
});

// ---------------------------------------------------------------------------
// Top-level export payload schema
// ---------------------------------------------------------------------------

const metadataSchema = z.object({
  instance_url: z.string(),
  instance_version: z.string(),
  export_date: z.string(),
  licensed_plugins: z.array(z.string()),
});

const modulesSchema = z.object({
  core: coreModuleSchema.optional(),
  cmdb: cmdbModuleSchema.optional(),
  itsm: itsmModuleSchema.optional(),
  itam: itamModuleSchema.optional(),
});

export const exportPayloadSchema = z.object({
  metadata: metadataSchema,
  modules: modulesSchema,
});

// ---------------------------------------------------------------------------
// Derived TypeScript type
// ---------------------------------------------------------------------------

export type ExportPayload = z.infer<typeof exportPayloadSchema>;

// ---------------------------------------------------------------------------
// Parser function
// ---------------------------------------------------------------------------

/**
 * Validate and parse an unknown JSON value as an ExportPayload.
 *
 * @param json - The raw (unknown) JSON value to validate.
 * @returns The validated and typed ExportPayload.
 * @throws {z.ZodError} When the payload does not match the expected schema.
 */
export function parseExportPayload(json: unknown): ExportPayload {
  return exportPayloadSchema.parse(json);
}
