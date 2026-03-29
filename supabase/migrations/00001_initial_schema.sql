-- Bearing: Initial Database Schema
-- Migration: 00001_initial_schema
-- Created: 2026-03-29

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  brand_config JSONB DEFAULT '{}',
  rate_card   JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON users
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ============================================================
-- INSTANCE CONNECTIONS
-- ============================================================
CREATE TABLE instance_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_name         TEXT NOT NULL,
  instance_url          TEXT NOT NULL,
  connection_type       TEXT NOT NULL,
  credentials_encrypted TEXT,
  servicenow_version    TEXT,
  licensed_plugins      JSONB DEFAULT '[]',
  last_connected_at     TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE instance_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON instance_connections
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ============================================================
-- ASSESSMENTS
-- ============================================================
CREATE TABLE assessments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_connection_id UUID NOT NULL REFERENCES instance_connections(id) ON DELETE CASCADE,
  scan_type              TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'queued',
  modules_enabled        JSONB DEFAULT '[]',
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  health_score           INTEGER,
  domain_scores          JSONB DEFAULT '{}',
  scan_metadata          JSONB DEFAULT '{}',
  expires_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON assessments
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ============================================================
-- REMEDIATION PATTERNS (no org_id — global reference data)
-- ============================================================
CREATE TABLE remediation_patterns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key           TEXT NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  description           TEXT,
  effort_hours_low      INTEGER NOT NULL,
  effort_hours_high     INTEGER NOT NULL,
  effort_tshirt         TEXT NOT NULL,
  required_roles        JSONB DEFAULT '[]',
  sow_scope_template    TEXT,
  sow_assumptions       TEXT,
  sow_deliverables      JSONB DEFAULT '[]',
  sow_exclusions        TEXT,
  calibration_factor    DECIMAL NOT NULL DEFAULT 1.0,
  calibration_sample_size INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SCAN RULES (no org_id — global reference data)
-- ============================================================
CREATE TABLE scan_rules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module                  TEXT NOT NULL,
  category                TEXT NOT NULL,
  rule_key                TEXT NOT NULL UNIQUE,
  display_name            TEXT NOT NULL,
  description             TEXT,
  severity                TEXT NOT NULL,
  risk_score              INTEGER NOT NULL,
  remediation_pattern_key TEXT REFERENCES remediation_patterns(pattern_key),
  query_config            JSONB DEFAULT '{}',
  evaluation_logic        TEXT NOT NULL,
  threshold_config        JSONB DEFAULT '{}',
  enabled                 BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FINDINGS
-- ============================================================
CREATE TABLE findings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id             UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  module                    TEXT NOT NULL,
  category                  TEXT NOT NULL,
  severity                  TEXT NOT NULL,
  severity_score            INTEGER NOT NULL,
  effort_tshirt             TEXT,
  effort_hours_low          INTEGER,
  effort_hours_high         INTEGER,
  risk_score                INTEGER,
  composite_score           DECIMAL,
  title                     TEXT NOT NULL,
  description               TEXT,
  evidence                  JSONB DEFAULT '{}',
  remediation_pattern       TEXT,
  remediation_description   TEXT,
  affected_count            INTEGER NOT NULL DEFAULT 1,
  pathfinder_relevant       BOOLEAN NOT NULL DEFAULT false,
  pathfinder_recommendation JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON findings
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ============================================================
-- BENCHMARK DATA
-- ============================================================
CREATE TABLE benchmark_data (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id      UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  industry_vertical  TEXT,
  company_size_tier  TEXT,
  servicenow_version TEXT,
  module             TEXT,
  health_score       INTEGER,
  finding_counts     JSONB DEFAULT '{}',
  anonymized         BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PATHFINDER CONFIDENCE
-- ============================================================
CREATE TABLE pathfinder_confidence (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_connection_id    UUID NOT NULL REFERENCES instance_connections(id) ON DELETE CASCADE,
  ci_sys_id                 TEXT NOT NULL,
  ci_class                  TEXT NOT NULL,
  confidence_score          DECIMAL NOT NULL,
  traffic_state             TEXT,
  last_observation          TIMESTAMPTZ,
  observation_count         INTEGER NOT NULL DEFAULT 0,
  behavioral_classification JSONB DEFAULT '{}',
  relationship_confirmations JSONB DEFAULT '[]',
  received_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, instance_connection_id, ci_sys_id)
);

ALTER TABLE pathfinder_confidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON pathfinder_confidence
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ============================================================
-- GENERATED SOWS
-- ============================================================
CREATE TABLE generated_sows (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id       UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'draft',
  engagement_type     TEXT,
  total_hours_low     INTEGER,
  total_hours_high    INTEGER,
  total_revenue_low   DECIMAL,
  total_revenue_high  DECIMAL,
  included_finding_ids JSONB DEFAULT '[]',
  document_url        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE generated_sows ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON generated_sows
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_instance_connections_org_id ON instance_connections(org_id);
CREATE INDEX idx_assessments_org_id ON assessments(org_id);
CREATE INDEX idx_assessments_instance_connection_id ON assessments(instance_connection_id);
CREATE INDEX idx_findings_org_id ON findings(org_id);
CREATE INDEX idx_findings_assessment_id ON findings(assessment_id);
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_module ON findings(module);
CREATE INDEX idx_scan_rules_module ON scan_rules(module);
CREATE INDEX idx_scan_rules_rule_key ON scan_rules(rule_key);
CREATE INDEX idx_benchmark_data_assessment_id ON benchmark_data(assessment_id);
CREATE INDEX idx_pathfinder_confidence_org_id ON pathfinder_confidence(org_id);
CREATE INDEX idx_pathfinder_confidence_ci_sys_id ON pathfinder_confidence(ci_sys_id);
CREATE INDEX idx_generated_sows_org_id ON generated_sows(org_id);
CREATE INDEX idx_generated_sows_assessment_id ON generated_sows(assessment_id);
