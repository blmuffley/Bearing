"""Assessment orchestrator — runs all dimension scorers and aggregates results."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from bearing.api.schemas import (
    AssessmentCreateRequest,
    AssessmentResponse,
    AssessmentScope,
    AssessmentStatus,
    DimensionScoreResponse,
    FindingResponse,
    TrendResponse,
    TriggeredBy,
)
from bearing.assessment.debt import TechnicalDebtCalculator
from bearing.assessment.dimensions.accuracy import AccuracyScorer
from bearing.assessment.dimensions.classification import ClassificationScorer
from bearing.assessment.dimensions.completeness import CompletenessScorer
from bearing.assessment.dimensions.csdm_compliance import CSDMComplianceScorer
from bearing.assessment.dimensions.currency import CurrencyScorer
from bearing.assessment.dimensions.duplicate_detection import DuplicateDetectionScorer
from bearing.assessment.dimensions.orphan_analysis import OrphanAnalysisScorer
from bearing.assessment.dimensions.relationships import RelationshipsScorer
from bearing.assessment.maturity import MaturityScorer
from bearing.assessment.recommendations import RecommendationEngine
from bearing.config import Settings
from bearing.fusion.findings import FusionFindingGenerator
from bearing.fusion.pathfinder import get_confidence_store
from bearing.servicenow.client import ServiceNowClient
from bearing.servicenow.writer import AssessmentWriter

logger = logging.getLogger(__name__)


class AssessmentEngine:
    """Orchestrates CMDB health assessments across all eight dimensions."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.sn_client = ServiceNowClient(settings)
        self.debt_calculator = TechnicalDebtCalculator()
        self.maturity_scorer = MaturityScorer()
        self.recommendation_engine = RecommendationEngine()
        self.sn_writer = AssessmentWriter(self.sn_client)
        self.fusion_generator = FusionFindingGenerator(get_confidence_store())

        # In-memory storage (always kept; also written to SN when connected)
        self._assessments: dict[str, AssessmentResponse] = {}
        self._scores: dict[str, list[DimensionScoreResponse]] = {}
        self._findings: dict[str, list[FindingResponse]] = {}

    def create_assessment(self, request: AssessmentCreateRequest) -> AssessmentResponse:
        """Create a new assessment record in pending state."""
        assessment_id = str(uuid.uuid4())
        assessment = AssessmentResponse(
            assessment_id=assessment_id,
            name=request.name,
            scope=request.scope,
            overall_score=0,
            grade="F",
            maturity_level=1,
            maturity_label="Ad-hoc",
            findings_count=0,
            critical_findings=0,
            technical_debt_estimate=0.0,
            ci_count_assessed=0,
            status=AssessmentStatus.PENDING,
            run_date=datetime.now(timezone.utc),
            triggered_by=request.triggered_by,
        )
        self._assessments[assessment_id] = assessment
        return assessment

    def run_assessment(self, assessment_id: str) -> None:
        """Execute a full CMDB health assessment.

        Runs all eight dimension scorers, computes the weighted composite,
        determines maturity level, calculates technical debt, and stores results.
        """
        assessment = self._assessments.get(assessment_id)
        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return

        # Mark as running
        assessment.status = AssessmentStatus.RUNNING
        logger.info("Starting assessment %s: %s", assessment_id, assessment.name)

        try:
            # Initialize dimension scorers
            scorers = [
                CompletenessScorer(self.sn_client),
                AccuracyScorer(self.sn_client),
                CurrencyScorer(self.sn_client),
                RelationshipsScorer(self.sn_client),
                CSDMComplianceScorer(self.sn_client),
                ClassificationScorer(self.sn_client),
                OrphanAnalysisScorer(self.sn_client),
                DuplicateDetectionScorer(self.sn_client),
            ]

            # Run each dimension scorer
            dimension_scores: list[DimensionScoreResponse] = []
            all_findings: list[FindingResponse] = []
            total_ci_count = 0

            for scorer in scorers:
                logger.info("Running dimension scorer: %s", scorer.dimension.value)
                score = scorer.score()
                findings = scorer.get_findings()
                dimension_scores.append(score)
                all_findings.extend(findings)
                total_ci_count = max(total_ci_count, scorer.ci_count_assessed)

            # Generate fusion findings if Pathfinder data is available
            confidence_store = get_confidence_store()
            if confidence_store.has_data:
                logger.info("Pathfinder data available — generating fusion findings")
                try:
                    cmdb_cis = self.sn_client.get_all_records(
                        table="cmdb_ci",
                        query="operational_status=1^ORoperational_status=6",
                        fields=["sys_id", "sys_class_name", "operational_status"],
                    )
                    fusion_findings = self.fusion_generator.generate(cmdb_cis)
                    all_findings.extend(fusion_findings)
                    assessment.has_pathfinder_data = True
                except Exception:
                    logger.warning("Fusion finding generation failed — continuing without", exc_info=True)

            # Compute weighted composite score
            overall_score = self._compute_overall_score(dimension_scores)
            grade = self._score_to_grade(overall_score)

            # Determine maturity level
            maturity_level, maturity_label = self.maturity_scorer.assess(
                overall_score=overall_score,
                dimension_scores=dimension_scores,
                findings=all_findings,
            )

            # Calculate technical debt
            debt_estimate = self.debt_calculator.calculate(all_findings)

            # Generate recommendations
            recommendations = self.recommendation_engine.generate(dimension_scores, all_findings)

            # Count critical findings
            critical_count = sum(
                1 for f in all_findings if f.severity.value == "critical"
            )

            # Update assessment
            assessment.overall_score = overall_score
            assessment.grade = grade
            assessment.maturity_level = maturity_level
            assessment.maturity_label = maturity_label
            assessment.findings_count = len(all_findings)
            assessment.critical_findings = critical_count
            assessment.technical_debt_estimate = debt_estimate
            assessment.ci_count_assessed = total_ci_count
            assessment.dimension_scores = dimension_scores
            assessment.status = AssessmentStatus.COMPLETED
            assessment.completed_date = datetime.now(timezone.utc)

            self._scores[assessment_id] = dimension_scores
            self._findings[assessment_id] = all_findings

            # Write results to ServiceNow tables
            try:
                sn_sys_id = self.sn_writer.write_assessment(assessment)
                self.sn_writer.write_scores(sn_sys_id, dimension_scores)
                self.sn_writer.write_findings(sn_sys_id, all_findings)
                self.sn_writer.write_recommendations(sn_sys_id, recommendations)
                logger.info("Assessment results written to ServiceNow (sys_id: %s)", sn_sys_id)
            except Exception:
                logger.warning("Failed to write results to ServiceNow — results stored in memory only", exc_info=True)

            logger.info(
                "Assessment %s complete: score=%d, grade=%s, maturity=%d (%s), "
                "findings=%d, debt=$%.0f",
                assessment_id, overall_score, grade, maturity_level, maturity_label,
                len(all_findings), debt_estimate,
            )

        except Exception:
            assessment.status = AssessmentStatus.FAILED
            logger.exception("Assessment %s failed", assessment_id)

    def _compute_overall_score(self, scores: list[DimensionScoreResponse]) -> int:
        """Compute weighted composite health score."""
        if not scores:
            return 0
        total = sum(s.score * s.weight for s in scores)
        return round(total)

    @staticmethod
    def _score_to_grade(score: int) -> str:
        """Convert numeric score to letter grade."""
        if score >= 90:
            return "A"
        if score >= 75:
            return "B"
        if score >= 60:
            return "C"
        if score >= 40:
            return "D"
        return "F"

    def get_assessment(self, assessment_id: str) -> AssessmentResponse | None:
        """Retrieve an assessment by ID."""
        return self._assessments.get(assessment_id)

    def list_assessments(self) -> list[AssessmentResponse]:
        """List all assessments."""
        return list(self._assessments.values())

    def get_dimension_scores(self, assessment_id: str) -> list[DimensionScoreResponse]:
        """Get dimension scores for an assessment."""
        return self._scores.get(assessment_id, [])

    def get_findings(self, assessment_id: str) -> list[FindingResponse]:
        """Get findings for an assessment."""
        return self._findings.get(assessment_id, [])

    def get_trends(self) -> TrendResponse:
        """Get trend data across all completed assessments."""
        return TrendResponse(points=[])
