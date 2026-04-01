"""Tests for the assessment engine."""

from __future__ import annotations

from bearing.api.schemas import AssessmentCreateRequest, AssessmentScope, AssessmentStatus, TriggeredBy
from bearing.assessment.engine import AssessmentEngine
from bearing.config import Settings


def test_create_assessment(mock_settings: Settings) -> None:
    engine = AssessmentEngine(mock_settings)
    request = AssessmentCreateRequest(
        name="Test Assessment",
        scope=AssessmentScope.FULL,
        triggered_by=TriggeredBy.MANUAL,
    )
    assessment = engine.create_assessment(request)

    assert assessment.name == "Test Assessment"
    assert assessment.scope == AssessmentScope.FULL
    assert assessment.status == AssessmentStatus.PENDING
    assert assessment.overall_score == 0


def test_list_assessments(mock_settings: Settings) -> None:
    engine = AssessmentEngine(mock_settings)
    request = AssessmentCreateRequest(name="A1")
    engine.create_assessment(request)
    request2 = AssessmentCreateRequest(name="A2")
    engine.create_assessment(request2)

    result = engine.list_assessments()
    assert len(result) == 2


def test_get_assessment_not_found(mock_settings: Settings) -> None:
    engine = AssessmentEngine(mock_settings)
    assert engine.get_assessment("nonexistent") is None


def test_score_to_grade() -> None:
    assert AssessmentEngine._score_to_grade(95) == "A"
    assert AssessmentEngine._score_to_grade(80) == "B"
    assert AssessmentEngine._score_to_grade(65) == "C"
    assert AssessmentEngine._score_to_grade(45) == "D"
    assert AssessmentEngine._score_to_grade(20) == "F"
