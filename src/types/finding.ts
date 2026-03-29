/**
 * Types for findings and remediation patterns.
 */

import type { Severity, EffortTshirt } from './assessment';

export type { Severity, EffortTshirt };

export interface FindingEvidence {
  table: string;
  sysId?: string;
  field?: string;
  value?: string;
  instanceUrl?: string;
}

export interface Finding {
  ruleKey: string;
  title: string;
  description: string;
  severity: Severity;
  severityScore: number;
  effortTshirt: EffortTshirt;
  effortHoursLow: number;
  effortHoursHigh: number;
  riskScore: number;
  compositeScore: number;
  evidence: FindingEvidence;
  remediationPattern: string;
  remediationDescription: string;
  affectedCount: number;
  pathfinderRelevant: boolean;
  pathfinderRecommendation?: Record<string, unknown> | null;
}

export interface FindingRecord extends Finding {
  id: string;
  orgId: string;
  assessmentId: string;
  module: string;
  category: string;
  createdAt: string;
}

export interface RemediationPattern {
  id: string;
  patternKey: string;
  displayName: string;
  description: string;
  effortHoursLow: number;
  effortHoursHigh: number;
  effortTshirt: EffortTshirt;
  requiredRoles: string[];
  sowScopeTemplate?: string | null;
  sowAssumptions?: string | null;
  sowDeliverables: string[];
  sowExclusions?: string | null;
  calibrationFactor: number;
  calibrationSampleSize: number;
  createdAt: string;
}

export type SeverityMap = Record<Exclude<Severity, 'info'>, number>;

export type EffortInverseMap = Record<EffortTshirt, number>;

export interface FindingPenaltyMap {
  critical: number;
  high: number;
  medium: number;
  low: number;
}
