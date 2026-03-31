/**
 * ITSM change management health scan rules.
 *
 * These functions evaluate ServiceNow change request data for process
 * health issues and return arrays of findings (without composite scores -
 * the scan engine adds those).
 */

import type { Finding } from '@/types/finding';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Threshold above which the emergency change ratio is considered problematic. */
const EMERGENCY_RATIO_THRESHOLD = 0.2;

// ---------------------------------------------------------------------------
// Minimal record shape expected from the export payload
// ---------------------------------------------------------------------------

interface Change {
  sys_id: string;
  number: string;
  type: string; // 'normal', 'standard', 'emergency'
  state: string;
  approval: string;
  backout_plan?: string;
  opened_at: string;
  closed_at?: string;
}

// ---------------------------------------------------------------------------
// Rule: Emergency change ratio
// ---------------------------------------------------------------------------

/**
 * If emergency or expedited changes exceed 20% of total changes, that
 * indicates a process problem. High reliance on emergency changes
 * bypasses CAB review, increases risk, and suggests inadequate planning.
 *
 * Produces a **high** finding when the threshold is exceeded.
 */
export function evaluateEmergencyChangeRatio(
  changes: Change[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  if (changes.length === 0) return [];

  const emergencyChanges = changes.filter(
    (c) =>
      c.type === 'emergency' ||
      c.type === 'Emergency' ||
      c.type === 'expedited' ||
      c.type === 'Expedited',
  );

  const ratio = emergencyChanges.length / changes.length;

  if (ratio <= EMERGENCY_RATIO_THRESHOLD) return [];

  const percentage = Math.round(ratio * 100);

  findings.push({
    ruleKey: 'itsm_emergency_change_ratio',
    title: `Emergency change ratio is ${percentage}% (threshold: 20%)`,
    description:
      `${emergencyChanges.length} of ${changes.length} changes (${percentage}%) are ` +
      `emergency or expedited type. This exceeds the 20% threshold and indicates ` +
      `over-reliance on emergency changes, which bypass CAB review, increase risk ` +
      `of failed changes, and suggest inadequate change planning and lead times.`,
    severity: 'high',
    severityScore: 3,
    effortTshirt: 'L',
    effortHoursLow: 8,
    effortHoursHigh: 24,
    riskScore: 4,
    evidence: {
      table: 'change_request',
      field: 'type',
      value: `${emergencyChanges.length}/${changes.length} changes are emergency/expedited (${percentage}%)`,
    },
    remediationPattern: 'change_process_improvement',
    remediationDescription:
      'Analyze root causes for emergency changes. Improve change lead times, ' +
      'implement standard change templates for recurring changes, and establish ' +
      'governance policies that require justification for emergency classifications.',
    affectedCount: emergencyChanges.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Unauthorized changes
// ---------------------------------------------------------------------------

/**
 * Find changes in "Implement" state that have not gone through approval
 * (approval field is empty or "not requested"). Changes implemented
 * without authorization represent a critical governance failure.
 *
 * Each unauthorized change produces a **critical** finding.
 */
export function evaluateUnauthorizedChanges(
  changes: Change[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  const unauthorized = changes.filter((c) => {
    const isImplementing =
      c.state === 'Implement' ||
      c.state === 'implement' ||
      c.state === '-1';

    const noApproval =
      !c.approval ||
      c.approval.trim() === '' ||
      c.approval === 'not requested' ||
      c.approval === 'Not Yet Requested';

    return isImplementing && noApproval;
  });

  if (unauthorized.length === 0) return [];

  findings.push({
    ruleKey: 'itsm_unauthorized_changes',
    title: `${unauthorized.length} unauthorized change(s) in Implement state`,
    description:
      `${unauthorized.length} change request(s) are in Implement state without ` +
      `having gone through the approval process (approval is empty or "not ` +
      `requested"). Unauthorized changes represent a critical governance failure ` +
      `that can cause outages, audit findings, and compliance violations.`,
    severity: 'critical',
    severityScore: 4,
    effortTshirt: 'M',
    effortHoursLow: 4,
    effortHoursHigh: 16,
    riskScore: 5,
    evidence: {
      table: 'change_request',
      field: 'approval',
      value: `${unauthorized.length} changes implemented without approval (e.g. ${unauthorized.slice(0, 3).map((c) => c.number).join(', ')})`,
    },
    remediationPattern: 'change_authorization_remediation',
    remediationDescription:
      'Enforce mandatory approval workflows for all change types. Configure ' +
      'state transition rules to prevent changes from moving to Implement ' +
      'without an approved approval record. Conduct a retrospective on ' +
      'unauthorized changes to assess impact.',
    affectedCount: unauthorized.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Missing backout plan
// ---------------------------------------------------------------------------

/**
 * Find changes without a backout plan. A missing backout plan increases
 * the risk of extended outages when a change fails, as there is no
 * documented rollback procedure.
 *
 * Each batch of changes missing a backout plan produces a **medium** finding.
 */
export function evaluateChangeBackoutMissing(
  changes: Change[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  const missingBackout = changes.filter(
    (c) => !c.backout_plan || c.backout_plan.trim() === '',
  );

  if (missingBackout.length === 0) return [];

  findings.push({
    ruleKey: 'itsm_change_backout_missing',
    title: `${missingBackout.length} change(s) without a backout plan`,
    description:
      `${missingBackout.length} change request(s) have an empty backout_plan ` +
      `field. Missing backout plans increase the risk of extended outages when ` +
      `a change fails, as there is no documented rollback procedure. This is ` +
      `a common audit finding in ITIL maturity assessments.`,
    severity: 'medium',
    severityScore: 2,
    effortTshirt: 'M',
    effortHoursLow: 4,
    effortHoursHigh: 16,
    riskScore: 3,
    evidence: {
      table: 'change_request',
      field: 'backout_plan',
      value: `${missingBackout.length} changes with empty backout_plan (e.g. ${missingBackout.slice(0, 3).map((c) => c.number).join(', ')})`,
    },
    remediationPattern: 'change_template_development',
    remediationDescription:
      'Create change templates with mandatory backout plan sections. Enforce ' +
      'backout_plan as a required field in change form policies. Develop ' +
      'standard backout procedures for common change types.',
    affectedCount: missingBackout.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}
