/**
 * CMDB data quality scan rules.
 *
 * These functions evaluate ServiceNow CMDB export data for data quality
 * issues and return arrays of findings (without composite scores -
 * the scan engine adds those).
 */

import type { Finding } from '@/types/finding';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Number of days after which a CI's discovery data is considered stale. */
const STALE_CI_THRESHOLD_DAYS = 180;

// ---------------------------------------------------------------------------
// Minimal record shapes expected from the export payload
// ---------------------------------------------------------------------------

interface CmdbCi {
  sys_id: string;
  name: string;
  sys_class_name: string;
  operational_status: string;
  install_status: string;
  last_discovered: string;
  discovery_source: string;
}

interface CmdbRelationship {
  sys_id: string;
  parent: string;
  child: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(dateStr: string, now: Date): number {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return Infinity;
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Rule: Stale CIs
// ---------------------------------------------------------------------------

/**
 * Find CIs where last_discovered is empty or older than 180 days AND
 * operational_status is "Operational". These CIs are likely stale and
 * may no longer reflect the actual state of the infrastructure.
 *
 * Each stale CI produces a **high** finding.
 */
export function evaluateStaleCIs(
  cis: CmdbCi[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];
  const now = new Date();

  for (const ci of cis) {
    if (ci.operational_status !== 'Operational') continue;

    const isEmptyDiscovery =
      !ci.last_discovered || ci.last_discovered.trim() === '';
    const isStaleDiscovery =
      !isEmptyDiscovery &&
      daysBetween(ci.last_discovered, now) >= STALE_CI_THRESHOLD_DAYS;

    if (!isEmptyDiscovery && !isStaleDiscovery) continue;

    const staleDays = isEmptyDiscovery
      ? 'never discovered'
      : `${daysBetween(ci.last_discovered, now)} days since last discovery`;

    findings.push({
      ruleKey: 'cmdb_stale_ci',
      title: `Stale CI: ${ci.name} (${ci.sys_class_name})`,
      description:
        `CI "${ci.name}" (class: ${ci.sys_class_name}) is marked as Operational ` +
        `but has ${staleDays}. This CI likely does not reflect the current ` +
        `state of the infrastructure and should be validated or retired.`,
      severity: 'high',
      severityScore: 3,
      effortTshirt: 'S',
      effortHoursLow: 0.5,
      effortHoursHigh: 2,
      riskScore: 3,
      evidence: {
        table: 'cmdb_ci',
        sysId: ci.sys_id,
        field: 'last_discovered',
        value: `Status: ${ci.operational_status}, Last discovered: ${ci.last_discovered || 'never'}`,
      },
      remediationPattern: 'ci_lifecycle_cleanup',
      remediationDescription:
        'Verify whether the CI still exists in the environment. If it does, ' +
        'run discovery to refresh its data. If it no longer exists, update ' +
        'its operational status to Retired or Non-Operational.',
      affectedCount: 1,
      pathfinderRelevant: true,
      pathfinderRecommendation: {
        action: 'deploy_sensor',
        reason: 'Pathfinder can confirm whether this CI is still active via traffic observation.',
      },
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Orphaned CIs
// ---------------------------------------------------------------------------

/**
 * Find CIs that have no relationships (neither parent nor child in any
 * relationship). Orphaned CIs indicate incomplete CMDB modeling and
 * reduce the value of impact analysis and service mapping.
 *
 * Each orphaned CI produces a **medium** finding.
 */
export function evaluateOrphanedCIs(
  cis: CmdbCi[],
  relationships: CmdbRelationship[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  // Build a set of all CIs that participate in at least one relationship
  const connectedCis = new Set<string>();
  for (const rel of relationships) {
    connectedCis.add(rel.parent);
    connectedCis.add(rel.child);
  }

  for (const ci of cis) {
    if (connectedCis.has(ci.sys_id)) continue;

    findings.push({
      ruleKey: 'cmdb_orphaned_ci',
      title: `Orphaned CI: ${ci.name} (${ci.sys_class_name})`,
      description:
        `CI "${ci.name}" (class: ${ci.sys_class_name}) has no relationships ` +
        `to any other CI. Orphaned CIs reduce the value of impact analysis, ` +
        `service mapping, and change risk assessment.`,
      severity: 'medium',
      severityScore: 2,
      effortTshirt: 'S',
      effortHoursLow: 1,
      effortHoursHigh: 3,
      riskScore: 2,
      evidence: {
        table: 'cmdb_ci',
        sysId: ci.sys_id,
        field: 'sys_id',
        value: `CI "${ci.name}" has 0 relationships (neither parent nor child)`,
      },
      remediationPattern: 'relationship_mapping',
      remediationDescription:
        'Map the CI to its upstream and downstream dependencies using ' +
        'CMDB relationship types. Run discovery or use Pathfinder traffic ' +
        'analysis to identify actual communication partners.',
      affectedCount: 1,
      pathfinderRelevant: true,
      pathfinderRecommendation: {
        action: 'relationship_discovery',
        reason: 'Pathfinder can identify communication partners via traffic observation to build relationships.',
      },
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Missing discovery source
// ---------------------------------------------------------------------------

/**
 * Find CIs where discovery_source is empty or "Manual". These CIs are
 * not being updated by automated discovery and will drift from reality
 * over time.
 *
 * Each finding is **medium** severity.
 */
export function evaluateMissingDiscoverySource(
  cis: CmdbCi[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  for (const ci of cis) {
    const source = ci.discovery_source?.trim() ?? '';
    const isMissing = source === '' || source.toLowerCase() === 'manual';

    if (!isMissing) continue;

    findings.push({
      ruleKey: 'cmdb_missing_discovery_source',
      title: `No automated discovery: ${ci.name} (${ci.sys_class_name})`,
      description:
        `CI "${ci.name}" (class: ${ci.sys_class_name}) has a discovery source ` +
        `of "${source || 'empty'}". Without automated discovery, this CI's ` +
        `attributes will not be kept current and will drift from reality.`,
      severity: 'medium',
      severityScore: 2,
      effortTshirt: 'M',
      effortHoursLow: 1,
      effortHoursHigh: 4,
      riskScore: 2,
      evidence: {
        table: 'cmdb_ci',
        sysId: ci.sys_id,
        field: 'discovery_source',
        value: `Discovery source: "${source || 'empty'}"`,
      },
      remediationPattern: 'discovery_onboarding',
      remediationDescription:
        'Onboard the CI into an automated discovery schedule. Configure ' +
        'ServiceNow Discovery, a third-party integration, or Pathfinder ' +
        'to populate and maintain CI attributes automatically.',
      affectedCount: 1,
      pathfinderRelevant: true,
      pathfinderRecommendation: {
        action: 'deploy_sensor',
        reason: 'Pathfinder can provide continuous discovery for this CI via network traffic observation.',
      },
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Duplicate CIs
// ---------------------------------------------------------------------------

/**
 * Find CIs with the same name and class. These are potential duplicates
 * that fragment CMDB data and can cause incorrect impact analysis,
 * duplicate incident routing, and inaccurate reporting.
 *
 * Each duplicate group produces a **high** finding.
 */
export function evaluateDuplicateCIs(
  cis: CmdbCi[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  // Group by name + class
  const groups = new Map<string, CmdbCi[]>();
  for (const ci of cis) {
    const key = `${ci.name}::${ci.sys_class_name}`;
    const group = groups.get(key);
    if (group) {
      group.push(ci);
    } else {
      groups.set(key, [ci]);
    }
  }

  for (const [key, group] of groups) {
    if (group.length <= 1) continue;

    const [name, className] = key.split('::');

    findings.push({
      ruleKey: 'cmdb_duplicate_ci',
      title: `Duplicate CIs: ${name} (${className})`,
      description:
        `${group.length} CIs exist with the name "${name}" and class ` +
        `"${className}". Duplicate CIs fragment CMDB data and can cause ` +
        `incorrect impact analysis, duplicate incident routing, and ` +
        `inaccurate reporting.`,
      severity: 'high',
      severityScore: 3,
      effortTshirt: 'M',
      effortHoursLow: 2,
      effortHoursHigh: 6,
      riskScore: 3,
      evidence: {
        table: 'cmdb_ci',
        field: 'name',
        value: `${group.length} CIs with name "${name}" and class "${className}"`,
      },
      remediationPattern: 'ci_deduplication',
      remediationDescription:
        'Identify the authoritative CI record and merge or retire the ' +
        'duplicates. Update relationships, incidents, and change records ' +
        'to reference the surviving CI. Establish identification and ' +
        'reconciliation rules to prevent future duplicates.',
      affectedCount: group.length,
      pathfinderRelevant: true,
      pathfinderRecommendation: {
        action: 'identity_verification',
        reason: 'Pathfinder can correlate traffic patterns to determine which duplicate CI is the real asset.',
      },
    });
  }

  return findings;
}
