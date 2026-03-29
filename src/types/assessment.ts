/**
 * Types for assessments, scan context, and scan rules.
 */

import type { Finding } from './finding';
import type { PathfinderConfidenceRecord } from './pathfinder';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type EffortTshirt = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type ScanType = 'full_api' | 'export_ingest' | 'instance_scan_import';

export type AssessmentStatus =
  | 'queued'
  | 'scanning'
  | 'analyzing'
  | 'scoring'
  | 'complete'
  | 'error';

export type ConnectionType = 'oauth' | 'basic' | 'export';

export type Module =
  | 'core'
  | 'cmdb'
  | 'itsm'
  | 'itam'
  | 'hrsd'
  | 'spm'
  | 'secops'
  | 'grc'
  | 'csm'
  | 'itom'
  | 'ea';

export type CompanySizeTier = 'smb' | 'midmarket' | 'enterprise';

export interface ScanContext {
  instanceVersion: string;
  licensedPlugins: string[];
  pathfinderData?: PathfinderConfidenceRecord[];
}

export interface ScanRuleQuery {
  table: string;
  conditions: string;
  fields: string[];
  aggregation?: 'count' | 'list';
}

export interface ScanRule {
  key: string;
  module: Module;
  category: string;
  displayName: string;
  severity: Severity;
  riskScore: number;
  remediationPatternKey: string;
  query: ScanRuleQuery;
  evaluate: (data: any[], context: ScanContext) => Finding[];
}

export type EvaluationLogic =
  | 'count_threshold'
  | 'pattern_match'
  | 'age_check';

export interface ScanRuleRecord {
  id: string;
  module: Module;
  category: string;
  ruleKey: string;
  displayName: string;
  description: string;
  severity: Severity;
  riskScore: number;
  remediationPatternKey: string;
  queryConfig: ScanRuleQuery;
  evaluationLogic: EvaluationLogic;
  thresholdConfig: Record<string, number>;
  enabled: boolean;
  createdAt: string;
}

export interface InstanceConnection {
  id: string;
  orgId: string;
  customerName: string;
  instanceUrl: string;
  connectionType: ConnectionType;
  credentialsEncrypted?: Record<string, unknown> | null;
  servicenowVersion?: string | null;
  licensedPlugins: string[];
  lastConnectedAt?: string | null;
  status: 'pending' | 'active' | 'error' | 'disconnected';
  createdAt: string;
}

export interface Assessment {
  id: string;
  orgId: string;
  instanceConnectionId: string;
  scanType: ScanType;
  status: AssessmentStatus;
  modulesEnabled: Module[];
  startedAt?: string | null;
  completedAt?: string | null;
  healthScore?: number | null;
  domainScores: Partial<Record<Module, number>>;
  scanMetadata: Record<string, unknown>;
  expiresAt?: string | null;
  createdAt: string;
}

export interface BenchmarkData {
  id: string;
  assessmentId: string;
  industryVertical?: string | null;
  companySizeTier?: CompanySizeTier | null;
  servicenowVersion?: string | null;
  module: Module;
  healthScore: number;
  findingCounts: Partial<Record<Severity, number>>;
  anonymized: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  brandConfig: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    legalText?: string;
  };
  rateCard: Record<string, unknown>;
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  name?: string | null;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
}
