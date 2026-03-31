/**
 * Scan engine orchestrator for export-based assessments.
 *
 * Iterates through enabled scan rules, extracts the relevant data from an
 * ExportPayload, evaluates each rule, computes composite and health scores,
 * and returns a complete ScanResult.
 */

import type { Finding } from '@/types/finding';
import type { ExportPayload } from './export-parser';
import { computeCompositeScore } from '@/server/scoring/composite-scorer';
import { computeHealthScore, computeDomainScores } from '@/server/scoring/health-index';
import {
  evaluateHardcodedSysIds,
  evaluateDuplicateBusinessRules,
  evaluateClientServerAntipattern,
  evaluateSyncAjax,
} from './modules/core/scripting-debt';
import {
  evaluateStaleUpdateSets,
  evaluateUpdateSetCollisions,
  evaluateDirectProductionChanges,
} from './modules/core/update-set-debt';
import {
  evaluatePermissiveAcls,
  evaluateRedundantAcls,
  evaluateElevatedRoles,
} from './modules/core/security-acl-debt';
import {
  evaluateStaleCIs,
  evaluateOrphanedCIs,
  evaluateMissingDiscoverySource,
  evaluateDuplicateCIs,
} from './modules/cmdb/data-quality';
import {
  evaluateUnassignedIncidents,
  evaluateMiscategorizedIncidents,
  evaluateAgedOpenIncidents,
  evaluateIncidentReopens,
} from './modules/itsm/incident-health';
import {
  evaluateEmergencyChangeRatio,
  evaluateUnauthorizedChanges,
  evaluateChangeBackoutMissing,
} from './modules/itsm/change-health';
import {
  evaluateUnreconciledAssets,
  evaluateExpiredWarrantyAssets,
} from './modules/itam/ham-reconciliation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanResult {
  findings: Finding[];
  healthScore: number;
  domainScores: Record<string, number>;
  scanMetadata: {
    instanceVersion: string;
    totalRulesEvaluated: number;
    totalFindingsGenerated: number;
    scanDurationMs: number;
  };
}

/** Internal representation of a rule the engine can execute. */
interface EngineRule {
  key: string;
  module: string;
  enabled: boolean;
  run: (payload: ExportPayload) => Omit<Finding, 'compositeScore'>[];
}

// ---------------------------------------------------------------------------
// Built-in rule definitions
// ---------------------------------------------------------------------------

function buildCoreRules(): EngineRule[] {
  return [
    {
      key: 'core_hardcoded_sysid',
      module: 'core',
      enabled: true,
      run(payload) {
        const core = payload.modules.core;
        if (!core) return [];

        // Collect all script-bearing records (business rules + script includes)
        const scripts: Array<{
          sys_id: string;
          name: string;
          script: string;
          collection?: string;
          scope?: string;
        }> = [];

        for (const br of core.business_rules ?? []) {
          if (!br.active) continue;
          scripts.push({
            sys_id: br.sys_id,
            name: br.name,
            script: br.script,
            collection: br.collection,
            scope: br.scope,
          });
        }

        for (const si of core.script_includes ?? []) {
          if (!si.active) continue;
          scripts.push({
            sys_id: si.sys_id,
            name: si.name,
            script: si.script,
            scope: si.scope,
          });
        }

        return evaluateHardcodedSysIds(scripts);
      },
    },
    {
      key: 'core_duplicate_business_rule',
      module: 'core',
      enabled: true,
      run(payload) {
        const rules = payload.modules.core?.business_rules;
        if (!rules || rules.length === 0) return [];
        return evaluateDuplicateBusinessRules(rules);
      },
    },
    {
      key: 'core_client_server_antipattern',
      module: 'core',
      enabled: true,
      run(payload) {
        const core = payload.modules.core;
        if (!core) return [];
        return evaluateClientServerAntipattern(
          core.ui_policies ?? [],
          core.ui_actions ?? [],
        );
      },
    },
    {
      key: 'core_sync_ajax',
      module: 'core',
      enabled: true,
      run(payload) {
        const core = payload.modules.core;
        if (!core) return [];

        // Check all script-bearing records for synchronous AJAX
        const scripts: Array<{
          sys_id: string;
          name: string;
          script: string;
          table?: string;
        }> = [];

        for (const br of core.business_rules ?? []) {
          scripts.push({
            sys_id: br.sys_id,
            name: br.name,
            script: br.script,
            table: 'sys_script',
          });
        }

        for (const si of core.script_includes ?? []) {
          scripts.push({
            sys_id: si.sys_id,
            name: si.name,
            script: si.script,
            table: 'sys_script_include',
          });
        }

        for (const ua of core.ui_actions ?? []) {
          scripts.push({
            sys_id: ua.sys_id,
            name: ua.name,
            script: ua.script,
            table: 'sys_ui_action',
          });
        }

        for (const up of core.ui_policies ?? []) {
          if (up.script_true) {
            scripts.push({
              sys_id: up.sys_id,
              name: up.short_description,
              script: up.script_true,
              table: 'sys_ui_policy',
            });
          }
          if (up.script_false) {
            scripts.push({
              sys_id: up.sys_id,
              name: up.short_description,
              script: up.script_false,
              table: 'sys_ui_policy',
            });
          }
        }

        return evaluateSyncAjax(scripts);
      },
    },
    // --- Update set debt rules ---
    {
      key: 'core_stale_update_set',
      module: 'core',
      enabled: true,
      run(payload) {
        const updateSets = payload.modules.core?.update_sets;
        if (!updateSets || updateSets.length === 0) return [];
        return evaluateStaleUpdateSets(updateSets);
      },
    },
    {
      key: 'core_update_set_collision',
      module: 'core',
      enabled: true,
      run(payload) {
        const entries = payload.modules.core?.update_set_entries;
        if (!entries || entries.length === 0) return [];
        return evaluateUpdateSetCollisions(entries);
      },
    },
    {
      key: 'core_direct_production_change',
      module: 'core',
      enabled: true,
      run(payload) {
        const updateSets = payload.modules.core?.update_sets;
        if (!updateSets || updateSets.length === 0) return [];
        return evaluateDirectProductionChanges(updateSets);
      },
    },
    // --- Security / ACL debt rules ---
    {
      key: 'core_permissive_acl',
      module: 'core',
      enabled: true,
      run(payload) {
        const acls = payload.modules.core?.acls;
        if (!acls || acls.length === 0) return [];
        return evaluatePermissiveAcls(acls);
      },
    },
    {
      key: 'core_redundant_acl',
      module: 'core',
      enabled: true,
      run(payload) {
        const acls = payload.modules.core?.acls;
        if (!acls || acls.length === 0) return [];
        return evaluateRedundantAcls(acls);
      },
    },
    {
      key: 'core_elevated_role',
      module: 'core',
      enabled: true,
      run(payload) {
        const roleAssignments = payload.modules.core?.role_assignments;
        if (!roleAssignments || roleAssignments.length === 0) return [];
        return evaluateElevatedRoles(roleAssignments);
      },
    },
  ];
}

function buildCmdbRules(): EngineRule[] {
  return [
    {
      key: 'cmdb_stale_ci',
      module: 'cmdb',
      enabled: true,
      run(payload) {
        const cis = payload.modules.cmdb?.cis;
        if (!cis || cis.length === 0) return [];
        return evaluateStaleCIs(cis);
      },
    },
    {
      key: 'cmdb_orphaned_ci',
      module: 'cmdb',
      enabled: true,
      run(payload) {
        const cis = payload.modules.cmdb?.cis;
        const relationships = payload.modules.cmdb?.relationships;
        if (!cis || cis.length === 0) return [];
        return evaluateOrphanedCIs(cis, relationships ?? []);
      },
    },
    {
      key: 'cmdb_missing_discovery_source',
      module: 'cmdb',
      enabled: true,
      run(payload) {
        const cis = payload.modules.cmdb?.cis;
        if (!cis || cis.length === 0) return [];
        return evaluateMissingDiscoverySource(cis);
      },
    },
    {
      key: 'cmdb_duplicate_ci',
      module: 'cmdb',
      enabled: true,
      run(payload) {
        const cis = payload.modules.cmdb?.cis;
        if (!cis || cis.length === 0) return [];
        return evaluateDuplicateCIs(cis);
      },
    },
  ];
}

function buildItsmRules(): EngineRule[] {
  return [
    // --- Incident health rules ---
    {
      key: 'itsm_unassigned_incidents',
      module: 'itsm',
      enabled: true,
      run(payload) {
        const incidents = payload.modules.itsm?.incidents;
        if (!incidents || incidents.length === 0) return [];
        return evaluateUnassignedIncidents(incidents);
      },
    },
    {
      key: 'itsm_miscategorized_incidents',
      module: 'itsm',
      enabled: true,
      run(payload) {
        const incidents = payload.modules.itsm?.incidents;
        if (!incidents || incidents.length === 0) return [];
        return evaluateMiscategorizedIncidents(incidents);
      },
    },
    {
      key: 'itsm_aged_open_incidents',
      module: 'itsm',
      enabled: true,
      run(payload) {
        const incidents = payload.modules.itsm?.incidents;
        if (!incidents || incidents.length === 0) return [];
        return evaluateAgedOpenIncidents(incidents);
      },
    },
    {
      key: 'itsm_incident_reopens',
      module: 'itsm',
      enabled: true,
      run(payload) {
        const incidents = payload.modules.itsm?.incidents;
        if (!incidents || incidents.length === 0) return [];
        return evaluateIncidentReopens(incidents);
      },
    },
    // --- Change health rules ---
    {
      key: 'itsm_emergency_change_ratio',
      module: 'itsm',
      enabled: true,
      run(payload) {
        const changes = payload.modules.itsm?.changes;
        if (!changes || changes.length === 0) return [];
        return evaluateEmergencyChangeRatio(changes);
      },
    },
    {
      key: 'itsm_unauthorized_changes',
      module: 'itsm',
      enabled: true,
      run(payload) {
        const changes = payload.modules.itsm?.changes;
        if (!changes || changes.length === 0) return [];
        return evaluateUnauthorizedChanges(changes);
      },
    },
    {
      key: 'itsm_change_backout_missing',
      module: 'itsm',
      enabled: true,
      run(payload) {
        const changes = payload.modules.itsm?.changes;
        if (!changes || changes.length === 0) return [];
        return evaluateChangeBackoutMissing(changes);
      },
    },
  ];
}

function buildItamRules(): EngineRule[] {
  return [
    {
      key: 'itam_unreconciled_assets',
      module: 'itam',
      enabled: true,
      run(payload) {
        const assets = payload.modules.itam?.hardware_assets;
        if (!assets || assets.length === 0) return [];
        return evaluateUnreconciledAssets(assets);
      },
    },
    {
      key: 'itam_expired_warranty_assets',
      module: 'itam',
      enabled: true,
      run(payload) {
        const assets = payload.modules.itam?.hardware_assets;
        if (!assets || assets.length === 0) return [];
        return evaluateExpiredWarrantyAssets(assets);
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// ScanEngine class
// ---------------------------------------------------------------------------

export class ScanEngine {
  private rules: EngineRule[];

  constructor() {
    this.rules = [
      ...buildCoreRules(),
      ...buildCmdbRules(),
      ...buildItsmRules(),
      ...buildItamRules(),
    ];
  }

  /**
   * Run all enabled scan rules against an export payload.
   *
   * @param payload - The validated export payload to scan.
   * @returns A ScanResult containing findings, health scores, and metadata.
   */
  async runExportScan(payload: ExportPayload): Promise<ScanResult> {
    const startTime = performance.now();

    const enabledRules = this.rules.filter((r) => r.enabled);
    const allFindings: Finding[] = [];

    for (const rule of enabledRules) {
      const rawFindings = rule.run(payload);

      // Attach composite score to each finding
      for (const raw of rawFindings) {
        if (raw.severity === 'info') continue;

        const compositeScore = computeCompositeScore(
          raw.severity,
          raw.effortTshirt,
          raw.riskScore,
        );

        allFindings.push({
          ...raw,
          compositeScore,
        });
      }
    }

    // Sort findings by composite score descending (highest priority first)
    allFindings.sort((a, b) => b.compositeScore - a.compositeScore);

    // Compute health scores using the module from the rule that produced each finding
    // Tag findings with their module for domain score computation
    const findingsWithModule = allFindings.map((f) => {
      const rule = this.rules.find((r) => r.key === f.ruleKey);
      return { ...f, module: rule?.module ?? 'unknown' };
    });

    const healthScore = computeHealthScore(findingsWithModule);
    const domainScores = computeDomainScores(findingsWithModule);

    const endTime = performance.now();

    return {
      findings: allFindings,
      healthScore,
      domainScores,
      scanMetadata: {
        instanceVersion: payload.metadata.instance_version,
        totalRulesEvaluated: enabledRules.length,
        totalFindingsGenerated: allFindings.length,
        scanDurationMs: Math.round(endTime - startTime),
      },
    };
  }
}
