"""Pydantic request/response models for the API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AssessmentScope(str, Enum):
    FULL = "full"
    TARGETED = "targeted"
    INCREMENTAL = "incremental"


class AssessmentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingType(str, Enum):
    GAP = "gap"
    RISK = "risk"
    RECOMMENDATION = "recommendation"
    POSITIVE = "positive"
    FUSION = "fusion"


class FusionSource(str, Enum):
    CMDB_ONLY = "cmdb_only"
    PATHFINDER_ONLY = "pathfinder_only"
    FUSION = "fusion"


class Dimension(str, Enum):
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy"
    CURRENCY = "currency"
    RELATIONSHIPS = "relationships"
    CSDM = "csdm"
    CLASSIFICATION = "classification"
    ORPHANS = "orphans"
    DUPLICATES = "duplicates"


class AvennorthProduct(str, Enum):
    NONE = "none"
    PATHFINDER = "pathfinder"
    CONTOUR = "contour"
    PATHFINDER_CONTOUR = "pathfinder+contour"


class AutomationPotential(str, Enum):
    FULL = "full"
    PARTIAL = "partial"
    MANUAL = "manual"


class Effort(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TriggeredBy(str, Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    API = "api"
    COREX = "corex"


class TrafficState(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    DEPRECATED = "deprecated"
    UNKNOWN = "unknown"


# --- Request Models ---


class AssessmentCreateRequest(BaseModel):
    """Request to trigger a new assessment."""

    name: str = Field(description="Human-readable assessment name")
    scope: AssessmentScope = Field(default=AssessmentScope.FULL)
    target_scope: str = Field(default="", description="CI query filter (empty = full CMDB)")
    triggered_by: TriggeredBy = Field(default=TriggeredBy.MANUAL)


class ReportGenerateRequest(BaseModel):
    """Request to generate a report."""

    report_type: str = Field(description="health_scorecard|technical_debt|maturity|recommendations|before_after")
    format: str = Field(default="pdf", description="pdf|docx")


# --- Response Models ---


class DimensionScoreResponse(BaseModel):
    """Score for a single assessment dimension."""

    dimension: Dimension
    score: int = Field(ge=0, le=100)
    weight: float
    checks_passed: int
    checks_total: int
    details: str = ""


class FindingResponse(BaseModel):
    """A single assessment finding."""

    finding_id: str
    finding_type: FindingType
    severity: Severity
    dimension: Dimension
    category: str
    title: str
    description: str
    affected_ci_class: str = ""
    affected_count: int = 1
    remediation: str = ""
    estimated_effort_hours: float = 0.0
    estimated_cost: float = 0.0
    avennorth_product: AvennorthProduct = AvennorthProduct.NONE
    automation_potential: AutomationPotential = AutomationPotential.MANUAL
    fusion_source: FusionSource = FusionSource.CMDB_ONLY


class RecommendationResponse(BaseModel):
    """A prioritized remediation recommendation."""

    recommendation_id: str
    priority: int
    title: str
    description: str
    dimension: Dimension
    impact_score: int = Field(ge=1, le=10)
    effort: Effort
    estimated_hours: float = 0.0
    estimated_cost_savings: float = 0.0
    avennorth_product: AvennorthProduct = AvennorthProduct.NONE
    automation_potential: AutomationPotential = AutomationPotential.MANUAL


class AssessmentResponse(BaseModel):
    """Complete assessment result."""

    assessment_id: str
    name: str
    scope: AssessmentScope
    overall_score: int = Field(ge=0, le=100)
    grade: str = Field(description="A/B/C/D/F")
    maturity_level: int = Field(ge=1, le=5)
    maturity_label: str
    findings_count: int
    critical_findings: int
    technical_debt_estimate: float
    ci_count_assessed: int
    has_pathfinder_data: bool = False
    has_contour_data: bool = False
    status: AssessmentStatus
    run_date: datetime | None = None
    completed_date: datetime | None = None
    ai_summary: str = ""
    triggered_by: TriggeredBy
    dimension_scores: list[DimensionScoreResponse] = []


class AssessmentListResponse(BaseModel):
    """List of assessments."""

    assessments: list[AssessmentResponse]
    total: int


class TrendPointResponse(BaseModel):
    """A single point in the trend line."""

    dimension: str
    score: int
    run_date: datetime
    delta_from_previous: int = 0


class TrendResponse(BaseModel):
    """Historical trend data."""

    points: list[TrendPointResponse]


# --- Pathfinder Webhook Models ---


class CommunicationPartner(BaseModel):
    partner_ci_sys_id: str
    protocol: str
    port: int
    last_seen: datetime
    traffic_volume_bytes_24h: int


class RelationshipConfirmation(BaseModel):
    rel_ci_sys_id: str
    parent_ci_sys_id: str
    child_ci_sys_id: str
    rel_type: str
    confirmed: bool
    confidence: int


class BehavioralClassification(BaseModel):
    suggested_class: str
    classification_confidence: int
    reasoning: str


class CIConfidenceRecord(BaseModel):
    ci_sys_id: str
    ci_class: str
    confidence_score: int = Field(ge=0, le=100)
    traffic_state: TrafficState
    last_observation: datetime
    observation_count: int
    communication_partners: list[CommunicationPartner] = []
    relationship_confirmations: list[RelationshipConfirmation] = []
    behavioral_classification: BehavioralClassification | None = None


class CoverageSummary(BaseModel):
    total_monitored_hosts: int
    active_cis: int
    idle_cis: int
    deprecated_cis: int
    unknown_cis: int
    monitored_subnets: list[str] = []
    unmonitored_subnets_detected: list[str] = []


class PathfinderConfidenceFeed(BaseModel):
    """Inbound webhook payload from Pathfinder."""

    schema_version: str
    pathfinder_instance_id: str
    servicenow_instance_url: str
    observation_window_hours: int
    generated_at: datetime
    ci_confidence_records: list[CIConfidenceRecord]
    coverage_summary: CoverageSummary
