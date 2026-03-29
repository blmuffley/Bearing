/**
 * Core scripting debt scan rules.
 *
 * These functions evaluate ServiceNow export data for common scripting
 * anti-patterns and return arrays of findings (without composite scores -
 * the scan engine adds those).
 */

import type { Finding } from '@/types/finding';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** 32-character lowercase hex pattern matching a ServiceNow sys_id. */
const SYS_ID_PATTERN = /[a-f0-9]{32}/g;

/** GlideRecord usage pattern for detecting server-side calls in client scripts. */
const GLIDE_RECORD_PATTERN = /\bGlideRecord\b/;

/** Synchronous AJAX pattern. */
const SYNC_AJAX_PATTERN = /\bgetXMLWait\s*\(/;

// ---------------------------------------------------------------------------
// Minimal record shapes expected from the export payload
// ---------------------------------------------------------------------------

interface ScriptRecord {
  sys_id: string;
  name: string;
  script: string;
  collection?: string;
  scope?: string;
}

interface BusinessRule {
  sys_id: string;
  name: string;
  script: string;
  collection: string;
  when: string;
  active: boolean;
  scope?: string;
}

interface UiPolicy {
  sys_id: string;
  short_description: string;
  table: string;
  active: boolean;
  script_true?: string;
  script_false?: string;
}

interface UiAction {
  sys_id: string;
  name: string;
  script: string;
  table: string;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Rule: Hard-coded sys_ids in scripts
// ---------------------------------------------------------------------------

/**
 * Scan business rules and script includes for hard-coded 32-char hex sys_ids.
 * The record's own sys_id is filtered out to avoid false positives.
 *
 * Each match produces a **critical** finding.
 */
export function evaluateHardcodedSysIds(
  scripts: ScriptRecord[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  for (const record of scripts) {
    if (!record.script) continue;

    const matches = record.script.match(SYS_ID_PATTERN) ?? [];

    // Filter out the record's own sys_id
    const hardcoded = matches.filter((m) => m !== record.sys_id);

    if (hardcoded.length > 0) {
      findings.push({
        ruleKey: 'core_hardcoded_sysid',
        title: `Hard-coded sys_id in script: ${record.name}`,
        description:
          `"${record.name}"${record.collection ? ` on table ${record.collection}` : ''} contains ` +
          `${hardcoded.length} hard-coded sys_id reference(s). These will break during ` +
          `cloning, migration, or instance refresh.`,
        severity: 'critical',
        severityScore: 4,
        effortTshirt: 'S',
        effortHoursLow: 1,
        effortHoursHigh: 4,
        riskScore: 4,
        evidence: {
          table: record.collection ? 'sys_script' : 'sys_script_include',
          sysId: record.sys_id,
          field: 'script',
          value: `${hardcoded.length} hard-coded sys_ids detected`,
        },
        remediationPattern: 'script_refactor_simple',
        remediationDescription:
          'Replace hard-coded sys_ids with dynamic lookups using GlideRecord ' +
          'queries, system properties, or script includes that resolve references at runtime.',
        affectedCount: hardcoded.length,
        pathfinderRelevant: false,
        pathfinderRecommendation: null,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Duplicate business rules
// ---------------------------------------------------------------------------

/**
 * Find business rules on the same table with the same "when" trigger.
 * Groups by `collection + when` and flags groups with more than one rule.
 *
 * Each duplicate group produces a **high** finding.
 */
export function evaluateDuplicateBusinessRules(
  rules: BusinessRule[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  // Only consider active rules
  const activeRules = rules.filter((r) => r.active);

  // Group by collection + when
  const groups = new Map<string, BusinessRule[]>();
  for (const rule of activeRules) {
    const key = `${rule.collection}::${rule.when}`;
    const group = groups.get(key);
    if (group) {
      group.push(rule);
    } else {
      groups.set(key, [rule]);
    }
  }

  for (const [key, group] of groups) {
    if (group.length <= 1) continue;

    const [collection, when] = key.split('::');
    const ruleNames = group.map((r) => r.name).join(', ');

    findings.push({
      ruleKey: 'core_duplicate_business_rule',
      title: `Duplicate business rules on ${collection} (${when})`,
      description:
        `${group.length} active business rules fire on "${when}" for table ` +
        `${collection}: ${ruleNames}. Duplicate triggers can cause race ` +
        `conditions, performance issues, and unpredictable execution order.`,
      severity: 'high',
      severityScore: 3,
      effortTshirt: 'M',
      effortHoursLow: 2,
      effortHoursHigh: 8,
      riskScore: 3,
      evidence: {
        table: 'sys_script',
        field: 'collection',
        value: `${group.length} rules: ${ruleNames}`,
      },
      remediationPattern: 'business_rule_consolidation',
      remediationDescription:
        'Consolidate duplicate business rules into a single rule or refactor ' +
        'into a script include to eliminate execution-order dependencies.',
      affectedCount: group.length,
      pathfinderRelevant: false,
      pathfinderRecommendation: null,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Client-server anti-pattern (GlideRecord in client scripts)
// ---------------------------------------------------------------------------

/**
 * Check for GlideRecord usage in client-side scripts (UI policies and UI actions).
 * GlideRecord calls in client scripts are a server-side API being used client-side,
 * which is a significant anti-pattern.
 *
 * Each match produces a **high** finding.
 */
export function evaluateClientServerAntipattern(
  uiPolicies: UiPolicy[],
  uiActions: UiAction[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  // Check UI policies (script_true / script_false)
  for (const policy of uiPolicies) {
    if (!policy.active) continue;

    const scriptsToCheck: { field: string; script: string | undefined }[] = [
      { field: 'script_true', script: policy.script_true },
      { field: 'script_false', script: policy.script_false },
    ];

    for (const { field, script } of scriptsToCheck) {
      if (!script) continue;
      if (GLIDE_RECORD_PATTERN.test(script)) {
        findings.push({
          ruleKey: 'core_client_server_antipattern',
          title: `GlideRecord in UI policy: ${policy.short_description}`,
          description:
            `UI policy "${policy.short_description}" on table ${policy.table} ` +
            `uses GlideRecord in ${field}. GlideRecord is a server-side API and ` +
            `should not be used in client scripts. Use GlideAjax instead.`,
          severity: 'high',
          severityScore: 3,
          effortTshirt: 'S',
          effortHoursLow: 1,
          effortHoursHigh: 4,
          riskScore: 3,
          evidence: {
            table: 'sys_ui_policy',
            sysId: policy.sys_id,
            field,
            value: 'GlideRecord usage detected in client script',
          },
          remediationPattern: 'client_script_refactor',
          remediationDescription:
            'Replace GlideRecord calls with GlideAjax calls that invoke a ' +
            'server-side script include for data retrieval.',
          affectedCount: 1,
          pathfinderRelevant: false,
          pathfinderRecommendation: null,
        });
      }
    }
  }

  // Check UI actions
  for (const action of uiActions) {
    if (!action.active || !action.script) continue;

    if (GLIDE_RECORD_PATTERN.test(action.script)) {
      findings.push({
        ruleKey: 'core_client_server_antipattern',
        title: `GlideRecord in UI action: ${action.name}`,
        description:
          `UI action "${action.name}" on table ${action.table} uses GlideRecord ` +
          `in its script. GlideRecord is a server-side API and should not be ` +
          `used in client-side UI actions. Use GlideAjax instead.`,
        severity: 'high',
        severityScore: 3,
        effortTshirt: 'S',
        effortHoursLow: 1,
        effortHoursHigh: 4,
        riskScore: 3,
        evidence: {
          table: 'sys_ui_action',
          sysId: action.sys_id,
          field: 'script',
          value: 'GlideRecord usage detected in client script',
        },
        remediationPattern: 'client_script_refactor',
        remediationDescription:
          'Replace GlideRecord calls with GlideAjax calls that invoke a ' +
          'server-side script include for data retrieval.',
        affectedCount: 1,
        pathfinderRelevant: false,
        pathfinderRecommendation: null,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Synchronous AJAX (getXMLWait)
// ---------------------------------------------------------------------------

/**
 * Check for synchronous AJAX calls (getXMLWait) in any script.
 * Synchronous AJAX blocks the browser thread and degrades user experience.
 *
 * Each match produces a **high** finding.
 */
export function evaluateSyncAjax(
  scripts: Array<{ sys_id: string; name: string; script: string; table?: string }>,
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  for (const record of scripts) {
    if (!record.script) continue;

    if (SYNC_AJAX_PATTERN.test(record.script)) {
      findings.push({
        ruleKey: 'core_sync_ajax',
        title: `Synchronous AJAX in script: ${record.name}`,
        description:
          `"${record.name}" uses getXMLWait() for synchronous server calls. ` +
          `This blocks the browser thread and causes the UI to freeze until ` +
          `the server responds. Use getXMLAnswer() with a callback instead.`,
        severity: 'high',
        severityScore: 3,
        effortTshirt: 'S',
        effortHoursLow: 1,
        effortHoursHigh: 3,
        riskScore: 3,
        evidence: {
          table: record.table ?? 'sys_script',
          sysId: record.sys_id,
          field: 'script',
          value: 'getXMLWait() synchronous AJAX call detected',
        },
        remediationPattern: 'async_ajax_refactor',
        remediationDescription:
          'Replace getXMLWait() with getXMLAnswer() using an asynchronous ' +
          'callback pattern to avoid blocking the browser thread.',
        affectedCount: 1,
        pathfinderRelevant: false,
        pathfinderRecommendation: null,
      });
    }
  }

  return findings;
}
