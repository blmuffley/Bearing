/**
 * ITSM incident health scan rules.
 *
 * These functions evaluate ServiceNow incident data for process health
 * issues and return arrays of findings (without composite scores -
 * the scan engine adds those).
 */

import type { Finding } from '@/types/finding';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Number of days after which an open incident is considered aged. */
const AGED_INCIDENT_THRESHOLD_DAYS = 30;

/** States considered resolved or closed (not flaggable as unassigned). */
const TERMINAL_STATES = ['Resolved', 'Closed', '6', '7'];

/** Generic/default category values that indicate miscategorization. */
const GENERIC_CATEGORIES = ['', 'inquiry', 'Inquiry / Help', 'Other', 'other'];

// ---------------------------------------------------------------------------
// Minimal record shape expected from the export payload
// ---------------------------------------------------------------------------

interface Incident {
  sys_id: string;
  number: string;
  state: string;
  priority: string;
  assignment_group: string;
  assigned_to: string;
  category: string;
  opened_at: string;
  resolved_at?: string;
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
// Rule: Unassigned incidents
// ---------------------------------------------------------------------------

/**
 * Find incidents with empty assigned_to that are not in a terminal state
 * (Resolved or Closed). Unassigned incidents indicate workflow gaps and
 * can lead to SLA breaches.
 *
 * Each unassigned incident produces a **high** finding.
 */
export function evaluateUnassignedIncidents(
  incidents: Incident[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  const unassigned = incidents.filter(
    (inc) =>
      (!inc.assigned_to || inc.assigned_to.trim() === '') &&
      !TERMINAL_STATES.includes(inc.state),
  );

  if (unassigned.length === 0) return [];

  findings.push({
    ruleKey: 'itsm_unassigned_incidents',
    title: `${unassigned.length} unassigned open incident(s)`,
    description:
      `${unassigned.length} incident(s) have no assigned_to value and are not ` +
      `in a Resolved or Closed state. Unassigned incidents indicate assignment ` +
      `rule gaps, missing auto-routing, or workflow failures that can lead to ` +
      `SLA breaches and customer dissatisfaction.`,
    severity: 'high',
    severityScore: 3,
    effortTshirt: 'M',
    effortHoursLow: 4,
    effortHoursHigh: 16,
    riskScore: 3,
    evidence: {
      table: 'incident',
      field: 'assigned_to',
      value: `${unassigned.length} incidents with empty assigned_to (e.g. ${unassigned.slice(0, 3).map((i) => i.number).join(', ')})`,
    },
    remediationPattern: 'incident_workflow_optimization',
    remediationDescription:
      'Review and fix assignment rules, auto-routing configurations, and ' +
      'workflow triggers to ensure all incoming incidents are automatically ' +
      'assigned to an appropriate group or individual.',
    affectedCount: unassigned.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Miscategorized incidents
// ---------------------------------------------------------------------------

/**
 * Find incidents where category is empty or set to a generic default value.
 * Miscategorized incidents undermine reporting accuracy and trend analysis.
 *
 * Each batch of miscategorized incidents produces a **medium** finding.
 */
export function evaluateMiscategorizedIncidents(
  incidents: Incident[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  const miscategorized = incidents.filter((inc) => {
    const cat = inc.category?.trim() ?? '';
    return GENERIC_CATEGORIES.includes(cat);
  });

  if (miscategorized.length === 0) return [];

  findings.push({
    ruleKey: 'itsm_miscategorized_incidents',
    title: `${miscategorized.length} miscategorized incident(s)`,
    description:
      `${miscategorized.length} incident(s) have an empty or generic category ` +
      `value. Miscategorized incidents undermine reporting accuracy, trend ` +
      `analysis, and knowledge management. This often indicates missing ` +
      `mandatory field enforcement or inadequate category taxonomy.`,
    severity: 'medium',
    severityScore: 2,
    effortTshirt: 'M',
    effortHoursLow: 4,
    effortHoursHigh: 12,
    riskScore: 2,
    evidence: {
      table: 'incident',
      field: 'category',
      value: `${miscategorized.length} incidents with empty or generic category (e.g. ${miscategorized.slice(0, 3).map((i) => i.number).join(', ')})`,
    },
    remediationPattern: 'incident_categorization_cleanup',
    remediationDescription:
      'Review and update the incident category taxonomy. Make category a ' +
      'mandatory field with validated choices. Bulk-update existing incidents ' +
      'with correct categories based on short description analysis.',
    affectedCount: miscategorized.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Aged open incidents
// ---------------------------------------------------------------------------

/**
 * Find open incidents older than 30 days. Aged incidents indicate process
 * bottlenecks, inadequate escalation procedures, or abandoned tickets.
 *
 * Each batch of aged incidents produces a **high** finding.
 */
export function evaluateAgedOpenIncidents(
  incidents: Incident[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];
  const now = new Date();

  const aged = incidents.filter((inc) => {
    if (TERMINAL_STATES.includes(inc.state)) return false;
    return daysBetween(inc.opened_at, now) > AGED_INCIDENT_THRESHOLD_DAYS;
  });

  if (aged.length === 0) return [];

  findings.push({
    ruleKey: 'itsm_aged_open_incidents',
    title: `${aged.length} aged open incident(s) (>30 days)`,
    description:
      `${aged.length} incident(s) have been open for more than 30 days without ` +
      `reaching a Resolved or Closed state. Aged incidents indicate process ` +
      `bottlenecks, inadequate escalation procedures, missing SLA enforcement, ` +
      `or abandoned tickets that inflate backlog metrics.`,
    severity: 'high',
    severityScore: 3,
    effortTshirt: 'L',
    effortHoursLow: 8,
    effortHoursHigh: 40,
    riskScore: 3,
    evidence: {
      table: 'incident',
      field: 'opened_at',
      value: `${aged.length} incidents open >30 days (e.g. ${aged.slice(0, 3).map((i) => i.number).join(', ')})`,
    },
    remediationPattern: 'incident_backlog_remediation',
    remediationDescription:
      'Conduct an incident backlog review to triage aged tickets. Close or ' +
      'resolve stale incidents, escalate blocked tickets, and implement ' +
      'automated SLA breach notifications and escalation workflows.',
    affectedCount: aged.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Incident reopens
// ---------------------------------------------------------------------------

/**
 * Find incidents that have been reopened (state is "In Progress" but
 * resolved_at is populated, indicating a previous resolution). Reopens
 * indicate quality issues in the resolution process.
 *
 * Each batch of reopened incidents produces a **medium** finding.
 */
export function evaluateIncidentReopens(
  incidents: Incident[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  const reopened = incidents.filter((inc) => {
    const isInProgress =
      inc.state === 'In Progress' || inc.state === '2';
    const wasPreviouslyResolved =
      inc.resolved_at != null && inc.resolved_at.trim() !== '';
    return isInProgress && wasPreviouslyResolved;
  });

  if (reopened.length === 0) return [];

  findings.push({
    ruleKey: 'itsm_incident_reopens',
    title: `${reopened.length} reopened incident(s)`,
    description:
      `${reopened.length} incident(s) have been reopened after a prior resolution ` +
      `(state is In Progress but resolved_at is populated). Reopens indicate ` +
      `quality issues in the resolution process, insufficient root cause ` +
      `analysis, or incomplete fixes that erode end-user confidence.`,
    severity: 'medium',
    severityScore: 2,
    effortTshirt: 'M',
    effortHoursLow: 4,
    effortHoursHigh: 12,
    riskScore: 2,
    evidence: {
      table: 'incident',
      field: 'state',
      value: `${reopened.length} incidents reopened after resolution (e.g. ${reopened.slice(0, 3).map((i) => i.number).join(', ')})`,
    },
    remediationPattern: 'incident_quality_improvement',
    remediationDescription:
      'Analyze reopened incidents for root cause patterns. Implement ' +
      'resolution confirmation workflows, mandatory knowledge article creation ' +
      'for recurring issues, and resolution quality metrics in dashboards.',
    affectedCount: reopened.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}
