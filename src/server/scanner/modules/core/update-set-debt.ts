/**
 * Core update set debt scan rules.
 *
 * These functions evaluate ServiceNow export data for update set hygiene
 * issues and return arrays of findings (without composite scores -
 * the scan engine adds those).
 */

import type { Finding } from '@/types/finding';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Number of days after which an "in progress" update set is considered stale. */
const STALE_THRESHOLD_DAYS = 90;

/** Name patterns suggesting a direct production edit rather than a planned change. */
const DIRECT_EDIT_PATTERNS = [
  /^default$/i,
  /quick\s*fix/i,
  /hotfix/i,
  /prod\s*fix/i,
  /emergency/i,
  /temp/i,
  /test/i,
];

// ---------------------------------------------------------------------------
// Minimal record shapes expected from the export payload
// ---------------------------------------------------------------------------

interface UpdateSet {
  sys_id: string;
  name: string;
  state: string;
  application: string;
  created_on: string;
  updated_on: string;
}

interface UpdateSetEntry {
  sys_id: string;
  update_set: string;
  name: string;
  type: string;
  action: string;
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
// Rule: Stale update sets
// ---------------------------------------------------------------------------

/**
 * Find update sets that haven't been modified in 90+ days and are still
 * in "in progress" state. These indicate abandoned work or forgotten
 * customizations that clutter the development pipeline.
 *
 * Each stale update set produces a **medium** finding.
 */
export function evaluateStaleUpdateSets(
  updateSets: UpdateSet[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];
  const now = new Date();

  for (const us of updateSets) {
    if (us.state !== 'in progress') continue;

    const age = daysBetween(us.updated_on, now);
    if (age < STALE_THRESHOLD_DAYS) continue;

    findings.push({
      ruleKey: 'core_stale_update_set',
      title: `Stale update set: ${us.name}`,
      description:
        `Update set "${us.name}" has been in "in progress" state for ${age} days ` +
        `without modification. Stale update sets clutter the development ` +
        `pipeline and may contain incomplete or abandoned customizations.`,
      severity: 'medium',
      severityScore: 2,
      effortTshirt: 'XS',
      effortHoursLow: 0.5,
      effortHoursHigh: 1,
      riskScore: 2,
      evidence: {
        table: 'sys_update_set',
        sysId: us.sys_id,
        field: 'state',
        value: `State: ${us.state}, Last updated: ${us.updated_on}`,
      },
      remediationPattern: 'update_set_cleanup',
      remediationDescription:
        'Review the stale update set and either complete, abandon, or delete it. ' +
        'If it contains needed changes, migrate them to a current update set.',
      affectedCount: 1,
      pathfinderRelevant: false,
      pathfinderRecommendation: null,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Update set collisions
// ---------------------------------------------------------------------------

/**
 * Group update set entries by the record they modify (`name` field). If the
 * same record appears in multiple update sets, that is a collision that can
 * cause merge conflicts and unpredictable promotion order.
 *
 * Each collision produces a **high** finding.
 */
export function evaluateUpdateSetCollisions(
  updateSetEntries: UpdateSetEntry[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  // Group entries by the record name they modify
  const recordToUpdateSets = new Map<string, Set<string>>();
  for (const entry of updateSetEntries) {
    const existing = recordToUpdateSets.get(entry.name);
    if (existing) {
      existing.add(entry.update_set);
    } else {
      recordToUpdateSets.set(entry.name, new Set([entry.update_set]));
    }
  }

  for (const [recordName, updateSetIds] of recordToUpdateSets) {
    if (updateSetIds.size <= 1) continue;

    findings.push({
      ruleKey: 'core_update_set_collision',
      title: `Update set collision on: ${recordName}`,
      description:
        `Record "${recordName}" is modified in ${updateSetIds.size} different ` +
        `update sets. This creates merge conflicts during promotion and can ` +
        `result in changes being overwritten or applied in the wrong order.`,
      severity: 'high',
      severityScore: 3,
      effortTshirt: 'M',
      effortHoursLow: 2,
      effortHoursHigh: 6,
      riskScore: 4,
      evidence: {
        table: 'sys_update_xml',
        field: 'name',
        value: `Record "${recordName}" appears in ${updateSetIds.size} update sets`,
      },
      remediationPattern: 'update_set_collision_resolution',
      remediationDescription:
        'Consolidate changes to the same record into a single update set, or ' +
        'establish a promotion order that resolves the collision. Review the ' +
        'conflicting changes and determine which version should take precedence.',
      affectedCount: updateSetIds.size,
      pathfinderRelevant: false,
      pathfinderRecommendation: null,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Direct production changes
// ---------------------------------------------------------------------------

/**
 * Find update sets created directly in production. These are identified by
 * a state of "complete" combined with global scope (or no application scope)
 * and name patterns suggesting ad-hoc edits rather than planned changes.
 *
 * Each direct production change produces a **critical** finding.
 */
export function evaluateDirectProductionChanges(
  updateSets: UpdateSet[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  for (const us of updateSets) {
    if (us.state !== 'complete') continue;

    // Check for global scope or empty application
    const isGlobalScope =
      !us.application ||
      us.application === 'global' ||
      us.application === 'Global';

    if (!isGlobalScope) continue;

    // Check for name patterns suggesting direct production edits
    const matchesDirectEdit = DIRECT_EDIT_PATTERNS.some((pattern) =>
      pattern.test(us.name),
    );

    if (!matchesDirectEdit) continue;

    findings.push({
      ruleKey: 'core_direct_production_change',
      title: `Direct production change: ${us.name}`,
      description:
        `Update set "${us.name}" appears to be a direct production change ` +
        `(completed in global scope with a name suggesting an ad-hoc edit). ` +
        `Direct production changes bypass the development-to-production ` +
        `promotion pipeline and create governance and auditability gaps.`,
      severity: 'critical',
      severityScore: 4,
      effortTshirt: 'M',
      effortHoursLow: 2,
      effortHoursHigh: 8,
      riskScore: 5,
      evidence: {
        table: 'sys_update_set',
        sysId: us.sys_id,
        field: 'name',
        value: `Name: "${us.name}", State: ${us.state}, Application: ${us.application || 'global'}`,
      },
      remediationPattern: 'production_change_remediation',
      remediationDescription:
        'Review the direct production change for correctness. Back-port the ' +
        'change into a sub-production update set so it is captured in the ' +
        'promotion pipeline. Establish governance policies to prevent future ' +
        'direct production changes.',
      affectedCount: 1,
      pathfinderRelevant: false,
      pathfinderRecommendation: null,
    });
  }

  return findings;
}
