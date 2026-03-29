/**
 * Types for Pathfinder confidence feed.
 * Matches the webhook schema defined in CLAUDE.md.
 */

export type TrafficState = 'active' | 'idle' | 'deprecated' | 'unknown';

export interface CommunicationPartner {
  partner_ci_sys_id: string;
  protocol: string;
  port: number;
  last_seen: string;
  traffic_volume_bytes_24h: number;
}

export interface RelationshipConfirmation {
  rel_ci_sys_id: string;
  parent_ci_sys_id: string;
  child_ci_sys_id: string;
  rel_type: string;
  confirmed: boolean;
  confidence: number;
}

export interface BehavioralClassification {
  suggested_class: string;
  classification_confidence: number;
  reasoning: string;
}

export interface PathfinderConfidenceRecord {
  ci_sys_id: string;
  ci_class: string;
  confidence_score: number;
  traffic_state: TrafficState;
  last_observation: string;
  observation_count: number;
  communication_partners: CommunicationPartner[];
  relationship_confirmations: RelationshipConfirmation[];
  behavioral_classification?: BehavioralClassification;
}

export interface PathfinderCoverageSummary {
  total_monitored_hosts: number;
  active_cis: number;
  idle_cis: number;
  deprecated_cis: number;
  unknown_cis: number;
  monitored_subnets: string[];
  unmonitored_subnets_detected: string[];
}

export interface PathfinderConfidenceFeed {
  schema_version: string;
  pathfinder_instance_id: string;
  servicenow_instance_url: string;
  observation_window_hours: number;
  generated_at: string;
  ci_confidence_records: PathfinderConfidenceRecord[];
  coverage_summary: PathfinderCoverageSummary;
}

/**
 * Stored record in the pathfinder_confidence table.
 */
export interface PathfinderConfidenceRow {
  id: string;
  orgId: string;
  instanceConnectionId: string;
  ciSysId: string;
  ciClass?: string | null;
  confidenceScore: number;
  trafficState: TrafficState;
  lastObservation?: string | null;
  observationCount?: number | null;
  behavioralClassification?: BehavioralClassification | null;
  relationshipConfirmations: RelationshipConfirmation[];
  receivedAt: string;
}

/**
 * Coverage zone categories for the four-zone map.
 */
export type CoverageZone =
  | 'fully_covered'
  | 'pathfinder_only'
  | 'discovery_only'
  | 'dark';

export interface CoverageZoneEntry {
  zone: CoverageZone;
  ciCount: number;
  cis: string[];
}

export interface CoverageZoneMap {
  fullyCovered: CoverageZoneEntry;
  pathfinderOnly: CoverageZoneEntry;
  discoveryOnly: CoverageZoneEntry;
  dark: CoverageZoneEntry;
}
